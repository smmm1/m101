type Env = { DB: any; M101_BOOTSTRAP_KEY?: string };
type UserRow = { id: string; email: string; username: string; display_name: string; role: 'admin' | 'member'; account_status: 'active' | 'suspended'; local_password_set: number; password_hash: string; password_salt: string };

const COOKIE_NAME = 'm101_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers WebCrypto rejects PBKDF2 iteration counts above 100,000.
const PBKDF2_ITERATIONS = 100000;

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  responseHeaders.set('X-Frame-Options', 'DENY');
  responseHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function getCookie(request: Request, name: string) {
  const value = request.headers.get('Cookie') || '';
  const entry = value.split(';').map((part) => part.trim()).find((part) => part.startsWith(name + '='));
  return entry ? entry.slice(name.length + 1) : null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return toBase64Url(value);
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(bytes));
}

async function hashPassword(password: string, salt = randomToken(16), iterations = PBKDF2_ITERATIONS, onStage?: (stage: string) => void) {
  onStage?.('hash-import-key');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  onStage?.('hash-derive-bits');
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromBase64Url(salt), iterations, hash: 'SHA-256' }, key, 256);
  onStage?.('hash-encode-result');
  return { salt, hash: toBase64Url(new Uint8Array(bits)) };
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`;
}

async function getUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;
  const tokenHash = await digest(token);
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.username, u.display_name, u.role, u.account_status, u.local_password_set, u.password_hash, u.password_salt FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.account_status = 'active' AND u.local_password_set = 1"
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}

function publicUser(user: UserRow) {
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
}


type WorkspaceAccess = { user: UserRow; workspaceId: string; membershipType: 'owner' | 'collaborator' };

async function getWorkspaceAccess(user: UserRow, env: Env): Promise<WorkspaceAccess | null> {
  const row = await env.DB.prepare(
    "SELECT wm.workspace_id, wm.membership_type FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.user_id = ? AND wm.status = 'active' AND w.status = 'active' ORDER BY CASE wm.membership_type WHEN 'owner' THEN 0 ELSE 1 END LIMIT 1"
  ).bind(user.id).first() as { workspace_id?: string; membership_type?: 'owner' | 'collaborator' } | null;
  if (!row?.workspace_id || !row.membership_type) return null;
  return { user, workspaceId: String(row.workspace_id), membershipType: row.membership_type };
}

async function findWorkspaceBusiness(workspaceId: string, businessId: string, env: Env): Promise<{ id: string; companyName: string } | null> {
  const result = await env.DB.prepare(
    'SELECT records FROM workspace_directory_year_data WHERE workspace_id = ?'
  ).bind(workspaceId).all();
  for (const row of result.results || []) {
    let records: unknown;
    try { records = JSON.parse(String((row as { records?: string }).records || '[]')); }
    catch { continue; }
    if (!Array.isArray(records)) continue;
    const match = records.find((record: unknown) => record && typeof record === 'object'
      && String((record as { id?: unknown }).id || '') === businessId);
    if (match) {
      const companyName = String((match as { companyName?: unknown }).companyName || '').trim();
      if (companyName) return { id: businessId, companyName };
    }
  }
  return null;
}

async function requireWorkspaceAccess(request: Request, env: Env): Promise<WorkspaceAccess | null> {
  const user = await getUser(request, env);
  if (!user) return null;
  return getWorkspaceAccess(user, env);
}

async function requireUser(request: Request, env: Env) {
  const user = await getUser(request, env);
  return user;
}

function isSameOriginMutation(request: Request, url: URL) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return false;
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite === 'cross-site') return false;
  // Browser fetch requests for state changes should carry Origin. Reject ambiguous
  // browser requests rather than silently accepting a cross-site form submission.
  if (!origin && fetchSite !== 'same-origin') return false;
  return true;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith('/api/')) return new Response('Not found', { status: 404 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && !isSameOriginMutation(request, url)) {
    return json({ error: 'คำขอไม่ผ่านการตรวจสอบแหล่งที่มา กรุณาโหลดหน้าเว็บใหม่' }, 403);
  }

  let bootstrapStage = 'request';
  try {
    if (path === '/api/health' && request.method === 'GET') {
      await env.DB.prepare('SELECT 1 AS ok').first();
      return json({ ok: true, database: 'connected' });
    }

    if (path === '/api/directory' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const requestedYear = String(url.searchParams.get('year') || '69').trim();
      if (!/^\d{2,4}$/.test(requestedYear)) return json({ error: 'ปีที่เลือกไม่ถูกต้อง' }, 400);
      const row = await env.DB.prepare(
        'SELECT fiscal_year, records, revision, updated_at FROM workspace_directory_year_data WHERE workspace_id = ? AND fiscal_year = ?'
      ).bind(access.workspaceId, requestedYear).first() as { fiscal_year?: string; records?: string; revision?: number; updated_at?: string } | null;
      let records: unknown[] = [];
      if (row?.records) {
        try {
          const parsed = JSON.parse(row.records);
          if (!Array.isArray(parsed)) return json({ error: 'รูปแบบข้อมูลทะเบียนกิจการไม่ถูกต้อง' }, 500);
          records = parsed;
        } catch {
          return json({ error: 'ไม่สามารถอ่านข้อมูลทะเบียนกิจการได้' }, 500);
        }
      }
      const years = await env.DB.prepare(
        'SELECT fiscal_year FROM workspace_directory_year_data WHERE workspace_id = ? ORDER BY fiscal_year DESC'
      ).bind(access.workspaceId).all();
      return json({ year: requestedYear, records, revision: Number(row?.revision || 0), updatedAt: row?.updated_at || null, availableYears: (years.results || []).map((item: { fiscal_year: string }) => String(item.fiscal_year)) });
    }

    if (path === '/api/auth/bootstrap-status' && request.method === 'GET') {
      const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first() as { count?: number } | null;
      const userCount = Number(row?.count || 0);
      const existingOwner = userCount > 0 ? await env.DB.prepare(
        "SELECT u.id FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id JOIN workspaces w ON w.id = wm.workspace_id WHERE u.role = 'admin' AND u.local_password_set = 0 AND u.account_status = 'active' AND wm.membership_type = 'owner' AND wm.status = 'active' AND w.status = 'active' LIMIT 1"
      ).first() : null;
      const needsBootstrap = userCount === 0 || Boolean(existingOwner);
      return json({ needsBootstrap, bootstrapReady: Boolean(env.M101_BOOTSTRAP_KEY), bootstrapMode: userCount === 0 ? 'create' : existingOwner ? 'claim-existing-owner' : 'unavailable' });
    }

    if (path === '/api/auth/bootstrap' && request.method === 'POST') {
      bootstrapStage = 'read-request';
      const body = await request.json() as { username?: string; password?: string; passwordConfirm?: string; bootstrapKey?: string };
      if (!env.M101_BOOTSTRAP_KEY) return json({ error: 'ระบบยังไม่ได้เปิดการตั้งค่า Owner ครั้งแรก' }, 503);
      bootstrapStage = 'cleanup-rate-limit';
      const nowSeconds = Math.floor(Date.now() / 1000);
      await env.DB.prepare('DELETE FROM auth_rate_limit_attempts WHERE attempted_at <= ?').bind(nowSeconds - 15 * 60).run();
      const bootstrapIp = request.headers.get('CF-Connecting-IP') || 'unknown-client';
      const bootstrapAttemptKey = await digest(`bootstrap:${bootstrapIp}`);
      bootstrapStage = 'reserve-rate-limit';
      const bootstrapReservation = await env.DB.prepare(
        'INSERT INTO auth_rate_limit_attempts (attempt_key, attempted_at) SELECT ?, ? WHERE (SELECT COUNT(*) FROM auth_rate_limit_attempts WHERE attempt_key = ? AND attempted_at > ?) < 5'
      ).bind(bootstrapAttemptKey, nowSeconds, bootstrapAttemptKey, nowSeconds - 15 * 60).run();
      if (Number(bootstrapReservation.meta?.changes || 0) !== 1) return json({ error: 'มีการลองตั้งค่าหลายครั้งเกินไป กรุณารอ 15 นาที' }, 429);
      bootstrapStage = 'verify-bootstrap-key';
      if (!constantTimeEqual(String(body.bootstrapKey || ''), env.M101_BOOTSTRAP_KEY)) return json({ error: 'รหัสตั้งค่าครั้งแรกไม่ถูกต้อง' }, 403);
      await env.DB.prepare('DELETE FROM auth_rate_limit_attempts WHERE attempt_key = ?').bind(bootstrapAttemptKey).run();
      bootstrapStage = 'validate-owner-input';
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return json({ error: 'ID ต้องยาว 3–32 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง' }, 400);
      if (password.length < 11 || password.length > 1024) return json({ error: 'รหัสผ่าน Owner ต้องมีอย่างน้อย 11 ตัวอักษร' }, 400);
      if (password !== String(body.passwordConfirm || '')) return json({ error: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' }, 400);
      bootstrapStage = 'count-existing-users';
      const existing = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first() as { count?: number } | null;
      const userCount = Number(existing?.count || 0);
      const now = new Date().toISOString();
      bootstrapStage = 'hash-owner-password';
      const encoded = await hashPassword(password, undefined, PBKDF2_ITERATIONS, (stage) => { bootstrapStage = stage; });
      let ownerId: string;
      let workspaceId: string;
      let status = 201;
      if (userCount === 0) {
        bootstrapStage = 'create-owner-workspace-batch';
        ownerId = 'x8wLRj5Iw1zqsyWnMrF65w';
        workspaceId = 'm101-primary-workspace';
        const statements = await env.DB.batch([
          env.DB.prepare("INSERT INTO users (id, email, display_name, role, password_hash, password_salt, created_at, username, account_status, local_password_set) VALUES (?, ?, 'Owner', 'admin', ?, ?, ?, ?, 'active', 1)").bind(ownerId, `${username.toLowerCase()}@m101.local`, encoded.hash, encoded.salt, now, username),
          env.DB.prepare("INSERT INTO workspaces (id, name, owner_user_id, status, created_at, updated_at) VALUES (?, 'M101 Workspace', ?, 'active', ?, ?)").bind(workspaceId, ownerId, now, now),
          env.DB.prepare("INSERT INTO workspace_memberships (id, workspace_id, user_id, membership_type, status, created_at, updated_at) VALUES ('m101-primary-owner-membership', ?, ?, 'owner', 'active', ?, ?)").bind(workspaceId, ownerId, now, now),
          env.DB.prepare("INSERT INTO workspace_directory_year_data (workspace_id, fiscal_year, records, revision, updated_by, updated_at) VALUES (?, '69', '[]', 1, ?, ?)").bind(workspaceId, ownerId, now),
        ]);
        if (!statements.every((item: { meta?: { changes?: number } }) => Number(item.meta?.changes || 0) === 1)) return json({ error: 'สร้างบัญชี Owner ไม่สำเร็จ กรุณาตรวจสอบฐานข้อมูล' }, 500);
      } else {
        bootstrapStage = 'claim-existing-owner';
        const existingOwner = await env.DB.prepare(
          "SELECT u.id, wm.workspace_id FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id JOIN workspaces w ON w.id = wm.workspace_id WHERE u.role = 'admin' AND u.local_password_set = 0 AND u.account_status = 'active' AND wm.membership_type = 'owner' AND wm.status = 'active' AND w.status = 'active' LIMIT 1"
        ).first() as { id?: string; workspace_id?: string } | null;
        if (!existingOwner?.id || !existingOwner.workspace_id) return json({ error: 'ไม่พบบัญชี Owner เดิมที่รอตั้งรหัสผ่าน หรือบัญชีนี้ถูกตั้งค่าไปแล้ว' }, 409);
        const duplicate = await env.DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?').bind(username, existingOwner.id).first();
        if (duplicate) return json({ error: 'ID นี้ถูกใช้งานแล้ว กรุณาเลือก ID อื่น' }, 409);
        ownerId = String(existingOwner.id);
        workspaceId = String(existingOwner.workspace_id);
        // Claim the legacy Owner with a compare-and-set update before touching sessions.
        // A concurrent second bootstrap must not revoke the first request's new session.
        const updated = await env.DB.prepare(
          "UPDATE users SET username = ?, password_hash = ?, password_salt = ?, local_password_set = 1 WHERE id = ? AND role = 'admin' AND local_password_set = 0 AND EXISTS (SELECT 1 FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.user_id = users.id AND wm.workspace_id = ? AND wm.membership_type = 'owner' AND wm.status = 'active' AND w.status = 'active')"
        ).bind(username, encoded.hash, encoded.salt, ownerId, workspaceId).run();
        if (Number(updated.meta?.changes || 0) !== 1) return json({ error: 'บัญชี Owner เดิมถูกเปลี่ยนแปลงระหว่างตั้งค่า กรุณาโหลดหน้าใหม่' }, 409);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(ownerId),
          env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'owner.password_initialized', 'user', ?, ?, ?)").bind(randomToken(18), workspaceId, ownerId, ownerId, JSON.stringify({ username, setup: 'bootstrap' }), now),
        ]);
        status = 200;
      }
      bootstrapStage = 'create-owner-session';
      const token = randomToken();
      await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), ownerId, Math.floor(Date.now() / 1000) + SESSION_SECONDS, now).run();
      bootstrapStage = 'read-created-owner';
      const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(ownerId).first() as UserRow;
      return json({ user: publicUser(user) }, status, { 'Set-Cookie': sessionCookie(token) });
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json() as { username?: string; password?: string };
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!username || username.length > 32 || !password || password.length > 1024) return json({ error: 'กรุณากรอก ID และรหัสผ่าน' }, 400);

      const now = Math.floor(Date.now() / 1000);
      // Keep the rate-limit table bounded by removing expired attempts as requests arrive.
      await env.DB.prepare('DELETE FROM auth_rate_limit_attempts WHERE attempted_at <= ?').bind(now - 15 * 60).run();
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown-client';
      const attemptKey = await digest(`${clientIp}:${username.toLowerCase()}`);
      // Reserve one of five attempts atomically. A separate COUNT followed by
      // INSERT lets concurrent requests all pass the limit before any insert lands.
      const reservation = await env.DB.prepare(
        'INSERT INTO auth_rate_limit_attempts (attempt_key, attempted_at) SELECT ?, ? WHERE (SELECT COUNT(*) FROM auth_rate_limit_attempts WHERE attempt_key = ? AND attempted_at > ?) < 5'
      ).bind(attemptKey, now, attemptKey, now - 15 * 60).run();
      if (Number(reservation.meta?.changes || 0) !== 1) return json({ error: 'เข้าสู่ระบบผิดหลายครั้ง กรุณารอ 15 นาที' }, 429);

      const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').bind(username).first() as UserRow | null;
      // Perform the same PBKDF2 work for unknown, suspended, and active accounts
      // so login timing does not reveal whether a username exists or is enabled.
      const candidate = await hashPassword(password, user?.password_salt || 'bTEwMS1sb2dpbi1kdW1teS1zYWx0');
      if (!user || user.account_status !== 'active' || Number(user.local_password_set) !== 1 || !constantTimeEqual(candidate.hash, user.password_hash)) {
        return json({ error: 'ID หรือรหัสผ่านไม่ถูกต้อง' }, 401);
      }
      // Valid credentials clear this IP+username window before workspace checks.
      await env.DB.prepare('DELETE FROM auth_rate_limit_attempts WHERE attempt_key = ?').bind(attemptKey).run();
      const workspaceAccess = await getWorkspaceAccess(user, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101 กรุณาติดต่อ Owner' }, 403);
      const token = randomToken();
      const createdAt = new Date().toISOString();
      await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), user.id, now + SESSION_SECONDS, createdAt).run();
      return json({ user: publicUser(user) }, 200, { 'Set-Cookie': sessionCookie(token) });
    }

    if (path === '/api/auth/change-password' && request.method === 'POST') {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const body = await request.json() as { currentPassword?: string; newPassword?: string };
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 12 || newPassword.length > 1024) return json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร' }, 400);
      const currentHash = await hashPassword(currentPassword, user.password_salt);
      if (!constantTimeEqual(currentHash.hash, user.password_hash)) return json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, 401);
      const encoded = await hashPassword(newPassword);
      const token = getCookie(request, COOKIE_NAME);
      const tokenHash = token ? await digest(token) : '';
      const now = new Date().toISOString();
      const changed = await env.DB.batch([
        env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, local_password_set = 1 WHERE id = ? AND password_hash = ? AND password_salt = ? AND account_status = \'active\'')
          .bind(encoded.hash, encoded.salt, user.id, user.password_hash, user.password_salt),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ? AND EXISTS (SELECT 1 FROM users WHERE id = ? AND password_hash = ? AND password_salt = ?)')
          .bind(user.id, tokenHash, user.id, encoded.hash, encoded.salt),
      ]);
      if (Number(changed[0]?.meta?.changes || 0) !== 1) return json({ error: 'รหัสผ่านบัญชีนี้ถูกเปลี่ยนระหว่างดำเนินการ กรุณาเข้าสู่ระบบใหม่' }, 409);
      return json({ ok: true, message: 'เปลี่ยนรหัสผ่านแล้ว' });
    }

    if (path === '/api/auth/me' && request.method === 'GET') {
      const user = await getUser(request, env);
      return json({ user: user ? publicUser(user) : null });
    }

    if (path === '/api/auth/logout' && request.method === 'POST') {
      const token = getCookie(request, COOKIE_NAME);
      if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(token)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` });
    }

    return json({ error: 'API route not found' }, 404);
  } catch (error) {
    if (path === '/api/auth/bootstrap' && request.method === 'POST') {
      console.error('M101 bootstrap failed at stage:', bootstrapStage, error);
      return json({ error: `ตั้งค่า Owner ไม่สำเร็จ (ขั้นตอน ${bootstrapStage}) กรุณาลองใหม่หลังตรวจสอบระบบ`, stage: bootstrapStage, errorType: error instanceof Error ? error.name : 'UnknownError', errorDetail: error instanceof Error ? error.message.slice(0, 180) : 'Unknown failure' }, 500);
    }
    console.error('M101 authentication API error', error);
    return json({ error: 'เกิดข้อผิดพลาดภายในระบบ Cloudflare' }, 500);
  }
}

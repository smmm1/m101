type Env = { DB: any; M101_BOOTSTRAP_KEY?: string };
type UserRow = { id: string; email: string; username: string; display_name: string; role: 'admin' | 'member'; account_status: 'active' | 'suspended'; local_password_set: number; password_hash: string; password_salt: string };

const COOKIE_NAME = 'm101_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers WebCrypto rejects PBKDF2 iteration counts above 100,000.
const PBKDF2_ITERATIONS = 100000;

function isValidDateOnly(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

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


    // Workspace-scoped directory API. Reads use the authenticated workspace;
    // full-snapshot writes are Owner-only and guarded by a workspace CAS revision.
    if (path === '/api/directory' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const fiscalYear = String(url.searchParams.get('year') || '').trim();
      if (!/^\d{2,4}$/.test(fiscalYear)) return json({ error: 'รอบปีบัญชีไม่ถูกต้อง' }, 400);
      const [workspace, years, data] = await Promise.all([
        env.DB.prepare('SELECT directory_revision FROM workspaces WHERE id = ? AND status = \'active\'').bind(access.workspaceId).first() as Promise<{ directory_revision?: number } | null>,
        env.DB.prepare('SELECT fiscal_year FROM workspace_directory_year_data WHERE workspace_id = ? ORDER BY fiscal_year').bind(access.workspaceId).all(),
        env.DB.prepare('SELECT records, revision FROM workspace_directory_year_data WHERE workspace_id = ? AND fiscal_year = ?').bind(access.workspaceId, fiscalYear).first() as Promise<{ records?: string; revision?: number } | null>,
      ]);
      if (!workspace) return json({ error: 'ไม่พบพื้นที่ทำงานที่ใช้งานได้' }, 403);
      let records: unknown[] = [];
      try { const parsed = JSON.parse(String(data?.records || '[]')); if (Array.isArray(parsed)) records = parsed; }
      catch { return json({ error: 'ข้อมูลทะเบียนกิจการในฐานข้อมูลไม่ถูกต้อง' }, 500); }
      if (access.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT business_id FROM business_assignments WHERE workspace_id = ? AND user_id = ?')
          .bind(access.workspaceId, access.user.id).all();
        const allowed = new Set((assigned.results || []).map((row: { business_id: string }) => String(row.business_id)));
        records = records.filter((record: unknown) => record && typeof record === 'object' && allowed.has(String((record as { id?: unknown }).id || '')));
      }
      const availableYears = (years.results || []).map((row: { fiscal_year: string }) => String(row.fiscal_year));
      return json({ fiscalYear, records, availableYears, revision: Number(workspace.directory_revision || 1), yearRevision: Number(data?.revision || 1) });
    }

    if (path === '/api/directory' && request.method === 'PUT') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่บันทึกทะเบียนกิจการทั้งรอบปีได้' }, 403);
      const body = await request.json() as { fiscalYear?: string; records?: unknown[]; revision?: number };
      const fiscalYear = String(body.fiscalYear || '').trim();
      const records = body.records;
      const expectedRevision = Number(body.revision);
      if (!/^\d{2,4}$/.test(fiscalYear) || !Array.isArray(records) || records.length > 10000 || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        return json({ error: 'ข้อมูลทะเบียนหรือเลขรุ่นไม่ถูกต้อง' }, 400);
      }
      const serialized = JSON.stringify(records);
      if (serialized.length > 8_000_000) return json({ error: 'ข้อมูลทะเบียนมีขนาดใหญ่เกินไป' }, 413);
      const current = await env.DB.prepare('SELECT directory_revision FROM workspaces WHERE id = ? AND status = \'active\'')
        .bind(access.workspaceId).first() as { directory_revision?: number } | null;
      if (!current) return json({ error: 'ไม่พบพื้นที่ทำงานที่ใช้งานได้' }, 403);
      if (Number(current.directory_revision || 1) !== expectedRevision) {
        return json({ error: 'ทะเบียนกิจการมีการเปลี่ยนแปลงจากผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก', conflict: true, revision: Number(current.directory_revision || 1) }, 409);
      }
      const nextRevision = expectedRevision + 1;
      const writeToken = randomToken(18);
      const now = new Date().toISOString();
      const results = await env.DB.batch([
        env.DB.prepare('UPDATE workspaces SET directory_revision = ?, directory_write_token = ?, updated_at = ? WHERE id = ? AND directory_revision = ? AND status = \'active\'')
          .bind(nextRevision, writeToken, now, access.workspaceId, expectedRevision),
        env.DB.prepare("INSERT INTO workspace_directory_year_data (workspace_id, fiscal_year, records, revision, updated_by, updated_at) SELECT ?, ?, ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND directory_revision = ? AND directory_write_token = ?) ON CONFLICT(workspace_id, fiscal_year) DO UPDATE SET records = excluded.records, revision = workspace_directory_year_data.revision + 1, updated_by = excluded.updated_by, updated_at = excluded.updated_at")
          .bind(access.workspaceId, fiscalYear, serialized, access.user.id, now, access.workspaceId, nextRevision, writeToken),
        env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) SELECT ?, ?, ?, 'directory.year_saved', 'directory_year', ?, ?, ? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND directory_revision = ? AND directory_write_token = ?)")
          .bind(randomToken(18), access.workspaceId, access.user.id, fiscalYear, JSON.stringify({ recordCount: records.length, revision: nextRevision }), now, access.workspaceId, nextRevision, writeToken),
      ]);
      if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) {
        const latest = await env.DB.prepare('SELECT directory_revision FROM workspaces WHERE id = ?').bind(access.workspaceId).first() as { directory_revision?: number } | null;
        return json({ error: 'ทะเบียนกิจการมีการเปลี่ยนแปลงจากผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก', conflict: true, revision: Number(latest?.directory_revision || 1) }, 409);
      }
      return json({ ok: true, fiscalYear, savedRecords: records.length, revision: nextRevision });
    }


    // Annual obligations are stored as relational D1 rows scoped to the active workspace.
    if (path === '/api/annual-tasks' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const fiscalYear = String(url.searchParams.get('year') || '').trim();
      if (!/^\d{2,4}$/.test(fiscalYear)) return json({ error: 'รอบปีบัญชีไม่ถูกต้อง' }, 400);
      const result = await env.DB.prepare(
        'SELECT id, fiscal_year, business_id, business_name, task_code, task_name, status, due_date, note, created_at, updated_at FROM annual_tasks WHERE workspace_id = ? AND fiscal_year = ? ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, business_name COLLATE NOCASE ASC, task_name COLLATE NOCASE ASC'
      ).bind(access.workspaceId, fiscalYear).all();
      let tasks = (result.results || []).map((row: Record<string, unknown>) => ({
        id: String(row.id), fiscalYear: String(row.fiscal_year), businessId: String(row.business_id),
        businessName: String(row.business_name), taskCode: String(row.task_code), taskName: String(row.task_name),
        status: String(row.status), dueDate: row.due_date ? String(row.due_date) : '',
        note: String(row.note || ''), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
      }));
      if (access.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT business_id FROM business_assignments WHERE workspace_id = ? AND user_id = ?')
          .bind(access.workspaceId, access.user.id).all();
        const allowed = new Set((assigned.results || []).map((row: { business_id: string }) => String(row.business_id)));
        tasks = tasks.filter((task: { businessId: string }) => allowed.has(task.businessId));
      }
      return json({ tasks });
    }

    if (path === '/api/annual-tasks' && request.method === 'POST') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const body = await request.json() as { fiscalYear?: string; businessId?: string; taskCode?: string; taskName?: string; status?: string; dueDate?: string; note?: string };
      const fiscalYear = String(body.fiscalYear || '').trim();
      const businessId = String(body.businessId || '').trim();
      const taskCode = String(body.taskCode || '').trim().toUpperCase();
      const taskName = String(body.taskName || '').trim();
      const status = String(body.status || 'pending');
      const dueDate = String(body.dueDate || '').trim();
      const note = String(body.note || '').trim();
      if (!/^\d{2,4}$/.test(fiscalYear) || !businessId || businessId.length > 160 || !/^[A-Z0-9_-]{2,60}$/.test(taskCode) || !taskName || taskName.length > 120) return json({ error: 'กรุณาตรวจสอบรอบปี กิจการ และประเภทงาน' }, 400);
      if (!['pending', 'in_progress', 'completed'].includes(status)) return json({ error: 'สถานะงานไม่ถูกต้อง' }, 400);
      if (!isValidDateOnly(dueDate)) return json({ error: 'รูปแบบกำหนดส่งไม่ถูกต้อง' }, 400);
      if (note.length > 2000) return json({ error: 'หมายเหตุยาวเกินไป' }, 400);
      const directory = await env.DB.prepare('SELECT records FROM workspace_directory_year_data WHERE workspace_id = ? AND fiscal_year = ?')
        .bind(access.workspaceId, fiscalYear).first() as { records?: string } | null;
      let business: Record<string, unknown> | undefined;
      try {
        const rows = JSON.parse(String(directory?.records || '[]'));
        if (Array.isArray(rows)) business = rows.find((item: unknown) => item && typeof item === 'object' && String((item as { id?: unknown }).id || '') === businessId);
      } catch { return json({ error: 'ข้อมูลทะเบียนกิจการไม่ถูกต้อง' }, 500); }
      if (!business) return json({ error: 'ไม่พบกิจการในรอบปีที่เลือก' }, 404);
      if (access.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT 1 AS ok FROM business_assignments WHERE workspace_id = ? AND user_id = ? AND business_id = ?')
          .bind(access.workspaceId, access.user.id, businessId).first();
        if (!assigned) return json({ error: 'ไม่มีสิทธิ์จัดการงานของกิจการนี้' }, 403);
      }
      const id = randomToken(18);
      const now = new Date().toISOString();
      try {
        await env.DB.prepare('INSERT INTO annual_tasks (id, fiscal_year, business_id, business_name, task_code, task_name, status, due_date, note, created_by, updated_by, created_at, updated_at, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, fiscalYear, businessId, String(business.companyName || 'กิจการไม่ระบุชื่อ'), taskCode, taskName, status, dueDate || null, note, access.user.id, access.user.id, now, now, access.workspaceId).run();
      } catch {
        return json({ error: 'กิจการนี้มีงานประเภทนี้ในรอบปีดังกล่าวแล้ว' }, 409);
      }
      await env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'annual_task.created', 'annual_task', ?, ?, ?)")
        .bind(randomToken(18), access.workspaceId, access.user.id, id, JSON.stringify({ fiscalYear, businessId, taskCode }), now).run();
      return json({ ok: true, id, createdAt: now, updatedAt: now }, 201);
    }

    const annualTaskMatch = path.match(/^\/api\/annual-tasks\/([A-Za-z0-9_-]+)$/);
    if (annualTaskMatch && request.method === 'PUT') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const id = annualTaskMatch[1];
      const body = await request.json() as { status?: string; dueDate?: string; note?: string };
      const status = String(body.status || '');
      const dueDate = String(body.dueDate || '').trim();
      const note = String(body.note || '').trim();
      if (!['pending', 'in_progress', 'completed'].includes(status) || !isValidDateOnly(dueDate) || note.length > 2000) return json({ error: 'ข้อมูลสถานะงานไม่ถูกต้อง' }, 400);
      const current = await env.DB.prepare('SELECT business_id FROM annual_tasks WHERE id = ? AND workspace_id = ?').bind(id, access.workspaceId).first() as { business_id?: string } | null;
      if (!current) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
      if (access.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT 1 AS ok FROM business_assignments WHERE workspace_id = ? AND user_id = ? AND business_id = ?')
          .bind(access.workspaceId, access.user.id, String(current.business_id)).first();
        if (!assigned) return json({ error: 'ไม่มีสิทธิ์จัดการงานของกิจการนี้' }, 403);
      }
      const now = new Date().toISOString();
      await env.DB.prepare('UPDATE annual_tasks SET status = ?, due_date = ?, note = ?, updated_by = ?, updated_at = ? WHERE id = ? AND workspace_id = ?')
        .bind(status, dueDate || null, note, access.user.id, now, id, access.workspaceId).run();
      await env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'annual_task.updated', 'annual_task', ?, ?, ?)")
        .bind(randomToken(18), access.workspaceId, access.user.id, id, JSON.stringify({ status, dueDate }), now).run();
      return json({ ok: true });
    }

    if (annualTaskMatch && request.method === 'DELETE') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่ลบรายการงานได้' }, 403);
      const current = await env.DB.prepare('SELECT business_id, task_code FROM annual_tasks WHERE id = ? AND workspace_id = ?').bind(annualTaskMatch[1], access.workspaceId).first() as { business_id?: string; task_code?: string } | null;
      if (!current) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM annual_tasks WHERE id = ? AND workspace_id = ?').bind(annualTaskMatch[1], access.workspaceId),
        env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'annual_task.deleted', 'annual_task', ?, ?, ?)")
          .bind(randomToken(18), access.workspaceId, access.user.id, annualTaskMatch[1], JSON.stringify({ businessId: current.business_id, taskCode: current.task_code }), now),
      ]);
      return json({ ok: true });
    }


    // Owner-only member administration. There is no public sign-up endpoint.
    if (path === '/api/admin/users' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่จัดการสมาชิกได้' }, 403);
      const result = await env.DB.prepare(
        "SELECT u.id, u.username, u.display_name, u.role, u.account_status, u.local_password_set, wm.membership_type FROM workspace_memberships wm JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ? AND wm.status != 'revoked' ORDER BY CASE wm.membership_type WHEN 'owner' THEN 0 ELSE 1 END, u.username COLLATE NOCASE"
      ).bind(access.workspaceId).all();
      const users = (result.results || []).map((row: Record<string, unknown>) => ({
        id: String(row.id), username: String(row.username || ''), displayName: String(row.display_name || ''),
        role: String(row.role), accountStatus: String(row.account_status), localPasswordSet: Number(row.local_password_set) === 1,
        membershipType: String(row.membership_type),
      }));
      return json({ users });
    }

    if (path === '/api/admin/users' && request.method === 'POST') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่เพิ่มสมาชิกได้' }, 403);
      const body = await request.json() as { username?: string; displayName?: string; password?: string };
      const username = String(body.username || '').trim();
      const displayName = String(body.displayName || '').trim();
      const password = String(body.password || '');
      if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return json({ error: 'ID ต้องยาว 3–32 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง' }, 400);
      if (!displayName || displayName.length > 80) return json({ error: 'กรุณาระบุชื่อสมาชิกไม่เกิน 80 ตัวอักษร' }, 400);
      if (password.length < 12 || password.length > 1024) return json({ error: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' }, 400);
      const duplicate = await env.DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').bind(username).first();
      if (duplicate) return json({ error: 'ID นี้ถูกใช้งานแล้ว กรุณาเลือก ID อื่น' }, 409);
      const encoded = await hashPassword(password);
      const id = randomToken(18);
      const membershipId = randomToken(18);
      const now = new Date().toISOString();
      const email = username.toLowerCase() + '@m101.local';
      try {
        const results = await env.DB.batch([
          env.DB.prepare("INSERT INTO users (id, email, display_name, role, password_hash, password_salt, created_at, username, account_status, local_password_set) VALUES (?, ?, ?, 'member', ?, ?, ?, ?, 'active', 1)")
            .bind(id, email, displayName, encoded.hash, encoded.salt, now, username),
          env.DB.prepare("INSERT INTO workspace_memberships (id, workspace_id, user_id, membership_type, status, created_at, updated_at) VALUES (?, ?, ?, 'collaborator', 'active', ?, ?)")
            .bind(membershipId, access.workspaceId, id, now, now),
          env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'member.created', 'user', ?, ?, ?)")
            .bind(randomToken(18), access.workspaceId, access.user.id, id, JSON.stringify({ username, displayName }), now),
        ]);
        if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) return json({ error: 'สร้างสมาชิกไม่สำเร็จ' }, 500);
      } catch {
        return json({ error: 'ไม่สามารถสร้างสมาชิกได้ อาจมี ID นี้อยู่แล้ว' }, 409);
      }
      return json({ ok: true, user: { id, username, displayName, role: 'member', accountStatus: 'active', localPasswordSet: true, membershipType: 'collaborator' } }, 201);
    }

    const adminUserMatch = path.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)$/);
    if (adminUserMatch && request.method === 'PUT') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่แก้ไขสมาชิกได้' }, 403);
      const id = adminUserMatch[1];
      const body = await request.json() as { displayName?: string; accountStatus?: string };
      const displayName = String(body.displayName || '').trim();
      const accountStatus = String(body.accountStatus || '');
      if (!displayName || displayName.length > 80 || !['active', 'suspended'].includes(accountStatus)) return json({ error: 'ข้อมูลสมาชิกไม่ถูกต้อง' }, 400);
      const member = await env.DB.prepare("SELECT u.id FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id WHERE u.id = ? AND wm.workspace_id = ? AND wm.membership_type = 'collaborator' AND wm.status != 'revoked'")
        .bind(id, access.workspaceId).first();
      if (!member) return json({ error: 'ไม่พบสมาชิกในพื้นที่ทำงานนี้' }, 404);
      // Account status is global to the user, not scoped to one Workspace.
      // Do not let one Workspace suspend an account that is also active elsewhere.
      if (accountStatus === 'suspended') {
        const otherWorkspace = await env.DB.prepare(
          "SELECT wm.workspace_id FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.user_id = ? AND wm.workspace_id != ? AND wm.status = 'active' AND w.status = 'active' LIMIT 1"
        ).bind(id, access.workspaceId).first();
        if (otherWorkspace) return json({ error: 'สมาชิกบัญชีนี้อยู่ใน Workspace อื่นด้วย จึงไม่สามารถระงับบัญชีรวมจาก Workspace นี้ได้' }, 409);
      }
      const now = new Date().toISOString();
      await env.DB.prepare('UPDATE users SET display_name = ?, account_status = ? WHERE id = ?').bind(displayName, accountStatus, id).run();
      if (accountStatus === 'suspended') await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
      await env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'member.updated', 'user', ?, ?, ?)")
        .bind(randomToken(18), access.workspaceId, access.user.id, id, JSON.stringify({ displayName, accountStatus }), now).run();
      return json({ ok: true });
    }

    const adminPasswordMatch = path.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/password$/);
    if (adminPasswordMatch && request.method === 'PUT') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่ตั้งรหัสผ่านสมาชิกได้' }, 403);
      const id = adminPasswordMatch[1];
      const body = await request.json() as { password?: string };
      const password = String(body.password || '');
      if (password.length < 12 || password.length > 1024) return json({ error: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' }, 400);
      const member = await env.DB.prepare("SELECT u.id FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id WHERE u.id = ? AND wm.workspace_id = ? AND wm.membership_type = 'collaborator' AND wm.status != 'revoked'")
        .bind(id, access.workspaceId).first();
      if (!member) return json({ error: 'ไม่พบสมาชิกในพื้นที่ทำงานนี้' }, 404);
      // Password hashes and sessions are global to the user account.
      // Prevent a Workspace Owner from resetting credentials used in another active Workspace.
      const otherWorkspace = await env.DB.prepare(
        "SELECT wm.workspace_id FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.user_id = ? AND wm.workspace_id != ? AND wm.status = 'active' AND w.status = 'active' LIMIT 1"
      ).bind(id, access.workspaceId).first();
      if (otherWorkspace) return json({ error: 'สมาชิกบัญชีนี้อยู่ใน Workspace อื่นด้วย จึงไม่สามารถตั้งรหัสผ่านรวมจาก Workspace นี้ได้' }, 409);
      const encoded = await hashPassword(password);
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, local_password_set = 1 WHERE id = ?').bind(encoded.hash, encoded.salt, id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
        env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'member.password_reset', 'user', ?, '{}', ?)")
          .bind(randomToken(18), access.workspaceId, access.user.id, id, now),
      ]);
      return json({ ok: true });
    }


    if (path === '/api/admin/assignments' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่จัดการการมอบหมายงานได้' }, 403);
      const [directory, assignments] = await Promise.all([
        env.DB.prepare('SELECT records FROM workspace_directory_year_data WHERE workspace_id = ?').bind(access.workspaceId).all(),
        env.DB.prepare('SELECT user_id, business_id FROM business_assignments WHERE workspace_id = ?').bind(access.workspaceId).all(),
      ]);
      const businesses = new Map<string, { id: string; companyName: string; taxId: string }>();
      for (const row of directory.results || []) {
        try {
          const records = JSON.parse(String((row as { records?: string }).records || '[]'));
          if (Array.isArray(records)) for (const item of records) {
            if (!item || typeof item !== 'object') continue;
            const id = String((item as { id?: unknown }).id || '');
            if (!id) continue;
            businesses.set(id, { id, companyName: String((item as { companyName?: unknown }).companyName || ''), taxId: String((item as { taxId?: unknown }).taxId || '') });
          }
        } catch { /* Ignore malformed historical snapshots; the current year remains available. */ }
      }
      return json({ businesses: Array.from(businesses.values()).sort((a,b)=>a.companyName.localeCompare(b.companyName,'th')), assignments: (assignments.results || []).map((row: Record<string, unknown>)=>({ userId:String(row.user_id), businessId:String(row.business_id) })) });
    }

    const assignmentMatch = path.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)\/assignments$/);
    if (assignmentMatch && request.method === 'PUT') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่มอบหมายกิจการได้' }, 403);
      const userId = assignmentMatch[1];
      const member = await env.DB.prepare("SELECT u.id FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id WHERE u.id = ? AND wm.workspace_id = ? AND wm.membership_type = 'collaborator' AND wm.status = 'active' AND u.account_status = 'active'")
        .bind(userId, access.workspaceId).first();
      if (!member) return json({ error: 'ไม่พบสมาชิกที่เปิดใช้งานในพื้นที่ทำงานนี้' }, 404);
      const body = await request.json() as { businessIds?: unknown };
      if (!Array.isArray(body.businessIds) || body.businessIds.length > 1000 || body.businessIds.some(id => typeof id !== 'string' || !id || id.length > 128)) return json({ error: 'รายการกิจการที่เลือกไม่ถูกต้อง' }, 400);
      const businessIds = Array.from(new Set(body.businessIds as string[]));
      const directory = await env.DB.prepare('SELECT records FROM workspace_directory_year_data WHERE workspace_id = ?').bind(access.workspaceId).all();
      const validIds = new Set<string>();
      for (const row of directory.results || []) {
        try { const records = JSON.parse(String((row as { records?: string }).records || '[]')); if (Array.isArray(records)) for (const item of records) if (item && typeof item === 'object' && (item as { id?: unknown }).id) validIds.add(String((item as { id: unknown }).id)); }
        catch { return json({ error: 'ข้อมูลทะเบียนกิจการในฐานข้อมูลไม่ถูกต้อง' }, 500); }
      }
      if (businessIds.some(id => !validIds.has(id))) return json({ error: 'พบกิจการที่ไม่มีอยู่ในพื้นที่ทำงาน กรุณาโหลดรายการใหม่' }, 400);
      const now = new Date().toISOString();
      const statements = [
        env.DB.prepare('DELETE FROM business_assignments WHERE workspace_id = ? AND user_id = ?').bind(access.workspaceId, userId),
        ...businessIds.map(businessId => env.DB.prepare('INSERT INTO business_assignments (id, workspace_id, business_id, user_id, assigned_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(randomToken(18), access.workspaceId, businessId, userId, access.user.id, now)),
        env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'member.assignments_updated', 'user', ?, ?, ?)")
          .bind(randomToken(18), access.workspaceId, access.user.id, userId, JSON.stringify({ businessCount: businessIds.length }), now),
      ];
      await env.DB.batch(statements);
      return json({ ok: true, assignedCount: businessIds.length });
    }


    if (path === '/api/relationship-groups' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่จัดการกลุ่มกิจการได้' }, 403);
      const [groupRows, membershipRows, directoryRows] = await Promise.all([
        env.DB.prepare('SELECT id, name, created_at, updated_at FROM business_relationship_groups WHERE workspace_id = ? ORDER BY name COLLATE NOCASE').bind(access.workspaceId).all(),
        env.DB.prepare('SELECT m.group_id, m.business_id FROM business_relationship_group_memberships m JOIN business_relationship_groups g ON g.id = m.group_id WHERE g.workspace_id = ?').bind(access.workspaceId).all(),
        env.DB.prepare('SELECT records FROM workspace_directory_year_data WHERE workspace_id = ?').bind(access.workspaceId).all(),
      ]);
      const businesses = new Map<string, { id: string; companyName: string; taxId: string }>();
      for (const row of directoryRows.results || []) {
        try { const records = JSON.parse(String((row as { records?: string }).records || '[]')); if (Array.isArray(records)) for (const item of records) {
          if (!item || typeof item !== 'object') continue;
          const id = String((item as { id?: unknown }).id || '');
          if (id) businesses.set(id, { id, companyName: String((item as { companyName?: unknown }).companyName || ''), taxId: String((item as { taxId?: unknown }).taxId || '') });
        } } catch { return json({ error: 'ข้อมูลทะเบียนกิจการในฐานข้อมูลไม่ถูกต้อง' }, 500); }
      }
      const groups = (groupRows.results || []).map((row: Record<string, unknown>) => ({
        id: String(row.id), name: String(row.name), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
        businessIds: (membershipRows.results || []).filter((membership: Record<string, unknown>) => String(membership.group_id) === String(row.id)).map((membership: Record<string, unknown>) => String(membership.business_id)),
      }));
      return json({ groups, businesses: Array.from(businesses.values()).sort((a,b)=>a.companyName.localeCompare(b.companyName,'th')) });
    }

    const relationshipGroupMatch = path.match(/^\/api\/relationship-groups\/([A-Za-z0-9_-]+)$/);
    if (path === '/api/relationship-groups' && request.method === 'POST') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่สร้างกลุ่มกิจการได้' }, 403);
      const body = await request.json() as { name?: string; businessIds?: unknown };
      const name = String(body.name || '').trim();
      if (name.length < 2 || name.length > 80) return json({ error: 'ชื่อกลุ่มต้องมี 2–80 ตัวอักษร' }, 400);
      if (!Array.isArray(body.businessIds) || body.businessIds.length > 1000 || body.businessIds.some(id => typeof id !== 'string' || !id || id.length > 128)) return json({ error: 'รายการกิจการไม่ถูกต้อง' }, 400);
      const businessIds = Array.from(new Set(body.businessIds as string[]));
      const directoryRows = await env.DB.prepare('SELECT records FROM workspace_directory_year_data WHERE workspace_id = ?').bind(access.workspaceId).all();
      const validIds = new Set<string>();
      for (const row of directoryRows.results || []) { try { const records = JSON.parse(String((row as { records?: string }).records || '[]')); if (Array.isArray(records)) for (const item of records) if (item && typeof item === 'object' && (item as { id?: unknown }).id) validIds.add(String((item as { id: unknown }).id)); } catch { return json({ error: 'ข้อมูลทะเบียนกิจการไม่ถูกต้อง' }, 500); } }
      if (businessIds.some(id => !validIds.has(id))) return json({ error: 'พบกิจการที่ไม่มีอยู่ในพื้นที่ทำงาน กรุณาโหลดรายการใหม่' }, 400);
      const id = randomToken(18); const now = new Date().toISOString();
      try {
        await env.DB.batch([
          env.DB.prepare('INSERT INTO business_relationship_groups (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(id, access.workspaceId, name, now, now),
          ...businessIds.map(businessId=>env.DB.prepare('INSERT INTO business_relationship_group_memberships (group_id, business_id, created_at) VALUES (?, ?, ?)').bind(id,businessId,now)),
          env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'relationship_group.created', 'relationship_group', ?, ?, ?)").bind(randomToken(18),access.workspaceId,access.user.id,id,JSON.stringify({name,businessCount:businessIds.length}),now),
        ]);
      } catch { return json({ error: 'สร้างกลุ่มไม่สำเร็จ ชื่อกลุ่มอาจซ้ำกับกลุ่มเดิม' }, 409); }
      return json({ ok: true, id }, 201);
    }

    if (relationshipGroupMatch && request.method === 'PUT') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่แก้ไขกลุ่มกิจการได้' }, 403);
      const groupId = relationshipGroupMatch[1];
      const existing = await env.DB.prepare('SELECT id FROM business_relationship_groups WHERE id = ? AND workspace_id = ?').bind(groupId,access.workspaceId).first();
      if (!existing) return json({ error: 'ไม่พบกลุ่มกิจการนี้' }, 404);
      const body = await request.json() as { name?: string; businessIds?: unknown };
      const name = String(body.name || '').trim();
      if (name.length < 2 || name.length > 80 || !Array.isArray(body.businessIds) || body.businessIds.length > 1000 || body.businessIds.some(id=>typeof id!=='string'||!id||id.length>128)) return json({ error: 'ข้อมูลกลุ่มกิจการไม่ถูกต้อง' }, 400);
      const businessIds = Array.from(new Set(body.businessIds as string[]));
      const directoryRows = await env.DB.prepare('SELECT records FROM workspace_directory_year_data WHERE workspace_id = ?').bind(access.workspaceId).all();
      const validIds = new Set<string>();
      for (const row of directoryRows.results || []) { try { const records=JSON.parse(String((row as {records?:string}).records||'[]')); if(Array.isArray(records)) for(const item of records) if(item&&typeof item==='object'&&(item as {id?:unknown}).id) validIds.add(String((item as {id:unknown}).id)); } catch { return json({error:'ข้อมูลทะเบียนกิจการไม่ถูกต้อง'},500); } }
      if (businessIds.some(id=>!validIds.has(id))) return json({error:'พบกิจการที่ไม่มีอยู่ในพื้นที่ทำงาน กรุณาโหลดรายการใหม่'},400);
      const now=new Date().toISOString();
      try {
        await env.DB.batch([
          env.DB.prepare('UPDATE business_relationship_groups SET name = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').bind(name,now,groupId,access.workspaceId),
          env.DB.prepare('DELETE FROM business_relationship_group_memberships WHERE group_id = ?').bind(groupId),
          ...businessIds.map(businessId=>env.DB.prepare('INSERT INTO business_relationship_group_memberships (group_id,business_id,created_at) VALUES (?,?,?)').bind(groupId,businessId,now)),
          env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'relationship_group.updated', 'relationship_group', ?, ?, ?)").bind(randomToken(18),access.workspaceId,access.user.id,groupId,JSON.stringify({name,businessCount:businessIds.length}),now),
        ]);
      } catch { return json({error:'บันทึกกลุ่มไม่สำเร็จ ชื่อกลุ่มอาจซ้ำกับกลุ่มอื่น'},409); }
      return json({ok:true});
    }

    if (relationshipGroupMatch && request.method === 'DELETE') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({error:'กรุณาเข้าสู่ระบบใหม่'},401);
      if (access.membershipType !== 'owner') return json({error:'เฉพาะ Owner เท่านั้นที่ลบกลุ่มกิจการได้'},403);
      const groupId=relationshipGroupMatch[1];
      const existing=await env.DB.prepare('SELECT id FROM business_relationship_groups WHERE id = ? AND workspace_id = ?').bind(groupId,access.workspaceId).first();
      if(!existing)return json({error:'ไม่พบกลุ่มกิจการนี้'},404);
      const now=new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM business_relationship_groups WHERE id = ? AND workspace_id = ?').bind(groupId,access.workspaceId),
        env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'relationship_group.deleted', 'relationship_group', ?, '{}', ?)").bind(randomToken(18),access.workspaceId,access.user.id,groupId,now),
      ]);
      return json({ok:true});
    }


    if (path === '/api/activity' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const result = await env.DB.prepare(
        "SELECT a.id, a.actor_user_id, u.username, u.display_name, a.action, a.resource_type, a.resource_id, a.metadata_json, a.created_at FROM audit_events a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.workspace_id = ? AND (? = 'owner' OR a.actor_user_id = ?) ORDER BY a.created_at DESC LIMIT 100"
      ).bind(access.workspaceId, access.membershipType, access.user.id).all();
      const events = (result.results || []).map((row: Record<string, unknown>) => {
        let metadata: Record<string, unknown> = {};
        try { const parsed = JSON.parse(String(row.metadata_json || '{}')); if (parsed && typeof parsed === 'object') metadata = parsed as Record<string, unknown>; } catch { /* Keep empty metadata for legacy events. */ }
        return { id: String(row.id), actorUserId: row.actor_user_id ? String(row.actor_user_id) : '', actorName: String(row.display_name || row.username || ''), action: String(row.action), resourceType: String(row.resource_type), resourceId: String(row.resource_id || ''), metadata, createdAt: String(row.created_at) };
      });
      return json({ events });
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

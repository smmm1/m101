type Env = { DB: any; M101_BOOTSTRAP_KEY?: string };
type UserRow = { id: string; email: string; username: string; display_name: string; role: 'admin' | 'member'; account_status: 'active' | 'suspended'; local_password_set: number; password_hash: string; password_salt: string };

const COOKIE_NAME = 'm101_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 310000;

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

async function hashPassword(password: string, salt = randomToken(16), iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromBase64Url(salt), iterations, hash: 'SHA-256' }, key, 256);
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
      const body = await request.json() as { username?: string; password?: string; passwordConfirm?: string; bootstrapKey?: string };
      if (!env.M101_BOOTSTRAP_KEY) return json({ error: 'ระบบยังไม่ได้เปิดการตั้งค่า Owner ครั้งแรก' }, 503);
      const nowSeconds = Math.floor(Date.now() / 1000);
      await env.DB.prepare('DELETE FROM auth_rate_limit_attempts WHERE attempted_at <= ?').bind(nowSeconds - 15 * 60).run();
      const bootstrapIp = request.headers.get('CF-Connecting-IP') || 'unknown-client';
      const bootstrapAttemptKey = await digest(`bootstrap:${bootstrapIp}`);
      const bootstrapReservation = await env.DB.prepare(
        'INSERT INTO auth_rate_limit_attempts (attempt_key, attempted_at) SELECT ?, ? WHERE (SELECT COUNT(*) FROM auth_rate_limit_attempts WHERE attempt_key = ? AND attempted_at > ?) < 5'
      ).bind(bootstrapAttemptKey, nowSeconds, bootstrapAttemptKey, nowSeconds - 15 * 60).run();
      if (Number(bootstrapReservation.meta?.changes || 0) !== 1) return json({ error: 'มีการลองตั้งค่าหลายครั้งเกินไป กรุณารอ 15 นาที' }, 429);
      if (!constantTimeEqual(String(body.bootstrapKey || ''), env.M101_BOOTSTRAP_KEY)) return json({ error: 'รหัสตั้งค่าครั้งแรกไม่ถูกต้อง' }, 403);
      await env.DB.prepare('DELETE FROM auth_rate_limit_attempts WHERE attempt_key = ?').bind(bootstrapAttemptKey).run();
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return json({ error: 'ID ต้องยาว 3–32 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง' }, 400);
      if (password.length < 14 || password.length > 1024) return json({ error: 'รหัสผ่าน Owner ต้องมีอย่างน้อย 14 ตัวอักษร' }, 400);
      if (password !== String(body.passwordConfirm || '')) return json({ error: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' }, 400);
      const existing = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first() as { count?: number } | null;
      const userCount = Number(existing?.count || 0);
      const now = new Date().toISOString();
      const encoded = await hashPassword(password);
      let ownerId: string;
      let workspaceId: string;
      let status = 201;
      if (userCount === 0) {
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
      const token = randomToken();
      await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), ownerId, Math.floor(Date.now() / 1000) + SESSION_SECONDS, now).run();
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
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, local_password_set = 1 WHERE id = ?').bind(encoded.hash, encoded.salt, user.id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, tokenHash),
      ]);
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

    if (path === '/api/admin/users' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่จัดการบัญชีได้' }, 403);
      const result = await env.DB.prepare(
        "SELECT u.id, u.username, u.display_name, u.role, u.account_status, u.local_password_set, u.created_at FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id WHERE wm.workspace_id = ? AND wm.status = 'active' ORDER BY CASE u.role WHEN 'admin' THEN 0 ELSE 1 END, u.created_at ASC"
      ).bind(access.workspaceId).all();
      return json({ users: result.results || [] });
    }

    if (path === '/api/admin/users' && request.method === 'POST') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่สร้างบัญชีได้' }, 403);
      const body = await request.json() as { username?: string; displayName?: string; password?: string };
      const username = String(body.username || '').trim();
      const displayName = String(body.displayName || '').trim();
      const password = String(body.password || '');
      if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return json({ error: 'ID ต้องยาว 3–32 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง' }, 400);
      if (!displayName || displayName.length > 80) return json({ error: 'กรุณากรอกชื่อผู้ใช้ไม่เกิน 80 ตัวอักษร' }, 400);
      if (password.length < 12 || password.length > 1024) return json({ error: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' }, 400);
      const duplicate = await env.DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').bind(username).first();
      if (duplicate) return json({ error: 'ID นี้ถูกใช้งานแล้ว กรุณาเลือก ID อื่น' }, 409);
      const id = randomToken(18), now = new Date().toISOString(), encoded = await hashPassword(password);
      const email = `${username.toLowerCase()}@m101.local`;
      const workspaceId = access.workspaceId;
      const result = await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id, email, display_name, role, password_hash, password_salt, created_at, username, account_status, local_password_set) VALUES (?, ?, ?, 'member', ?, ?, ?, ?, 'active', 1)").bind(id, email, displayName, encoded.hash, encoded.salt, now, username),
        env.DB.prepare("INSERT INTO workspace_memberships (id, workspace_id, user_id, membership_type, status, created_at, updated_at) VALUES (?, ?, ?, 'collaborator', 'active', ?, ?)").bind(randomToken(18), workspaceId, id, now, now),
        env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'user.created', 'user', ?, ?, ?)").bind(randomToken(18), workspaceId, access.user.id, id, JSON.stringify({ username }), now)
      ]);
      if (!result.every((item: { meta?: { changes?: number } }) => Number(item.meta?.changes || 0) === 1)) return json({ error: 'สร้างบัญชีไม่สำเร็จ' }, 500);
      return json({ ok: true, user: { id, username, displayName, role: 'member', accountStatus: 'active', createdAt: now } }, 201);
    }

    const adminUserMatch = path.match(new RegExp("^/api/admin/users/([A-Za-z0-9_-]+)$"));
    if (adminUserMatch && request.method === 'PATCH') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner' || access.user.role !== 'admin') return json({ error: 'เฉพาะ Owner เท่านั้นที่แก้ไขบัญชีได้' }, 403);
      const targetId = adminUserMatch[1];
      const target = await env.DB.prepare(
        "SELECT u.id, u.username, u.role FROM users u JOIN workspace_memberships wm ON wm.user_id = u.id WHERE u.id = ? AND wm.workspace_id = ? AND wm.status = 'active' LIMIT 1"
      ).bind(targetId, access.workspaceId).first() as { id?: string; username?: string; role?: string } | null;
      if (!target) return json({ error: 'ไม่พบบัญชีนี้' }, 404);
      if (target.role === 'admin' || target.id === access.user.id) return json({ error: 'ไม่อนุญาตให้แก้ไขบัญชี Owner ผ่านรายการสมาชิก' }, 403);
      const body = await request.json() as { username?: string; displayName?: string; accountStatus?: string; newPassword?: string };
      const username = String(body.username ?? target.username).trim();
      const displayName = String(body.displayName ?? '').trim();
      const accountStatus = String(body.accountStatus ?? 'active');
      const newPassword = String(body.newPassword || '');
      if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return json({ error: 'ID ไม่ถูกต้อง' }, 400);
      if (displayName.length > 80) return json({ error: 'ชื่อผู้ใช้ยาวเกินไป' }, 400);
      if (!['active', 'suspended'].includes(accountStatus)) return json({ error: 'สถานะบัญชีไม่ถูกต้อง' }, 400);
      if (newPassword && (newPassword.length < 12 || newPassword.length > 1024)) return json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร' }, 400);
      const duplicate = await env.DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?').bind(username, targetId).first();
      if (duplicate) return json({ error: 'ID นี้ถูกใช้งานแล้ว' }, 409);
      const encoded = newPassword ? await hashPassword(newPassword) : null;
      const now = new Date().toISOString();
      const statements = [
        env.DB.prepare("UPDATE users SET username = ?, email = ?, display_name = CASE WHEN ? = '' THEN display_name ELSE ? END, account_status = ?, password_hash = COALESCE(?, password_hash), password_salt = COALESCE(?, password_salt), local_password_set = CASE WHEN ? IS NULL THEN local_password_set ELSE 1 END WHERE id = ? AND role = 'member'")
          .bind(username, `${username.toLowerCase()}@m101.local`, displayName, displayName, accountStatus, encoded?.hash || null, encoded?.salt || null, encoded?.hash || null, targetId),
      ];
      if (newPassword || accountStatus === 'suspended') statements.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId));
      statements.push(env.DB.prepare("INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, 'user.updated', 'user', ?, ?, ?)").bind(randomToken(18), access.workspaceId, access.user.id, targetId, JSON.stringify({ username, accountStatus, passwordReset: Boolean(newPassword) }), now));
      await env.DB.batch(statements);
      return json({ ok: true });
    }

    if (path === '/api/data' && request.method === 'GET') {

      const authenticatedUser = await requireUser(request, env);
      if (!authenticatedUser) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const workspaceAccess = await getWorkspaceAccess(authenticatedUser, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      const user = workspaceAccess.user;
      if (workspaceAccess.membershipType !== 'owner') return json({ error: 'การเข้าถึงทะเบียนกิจการของผู้ร่วมงานจะเปิดหลังระบบกำหนดกิจการที่ได้รับมอบหมาย' }, 403);
      const result = await env.DB.prepare('SELECT fiscal_year, records FROM workspace_directory_year_data WHERE workspace_id = ? ORDER BY fiscal_year').bind(workspaceAccess.workspaceId).all();
      const workspaceState = await env.DB.prepare('SELECT directory_revision FROM workspaces WHERE id = ?').bind(workspaceAccess.workspaceId).first();
      if (!workspaceState) return json({ error: 'ไม่พบ Workspace ที่ใช้งานอยู่' }, 404);
      const directoryRevision = Number((workspaceState as { directory_revision?: number }).directory_revision || 1);
      const recordsByYear: Record<string, unknown[]> = {};
      for (const row of result.results || []) recordsByYear[String(row.fiscal_year)] = JSON.parse(String(row.records || '[]'));
      const availableYears = Object.keys(recordsByYear);
      if (!availableYears.length) {
        recordsByYear['69'] = [];
        availableYears.push('69');
      }
      return json({ recordsByYear, availableYears, directoryRevision });
    }

    if (path === '/api/data' && request.method === 'PUT') {

      const authenticatedUser = await requireUser(request, env);
      if (!authenticatedUser) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const workspaceAccess = await getWorkspaceAccess(authenticatedUser, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      const user = workspaceAccess.user;
      if (workspaceAccess.membershipType !== 'owner') return json({ error: 'การเข้าถึงทะเบียนกิจการของผู้ร่วมงานจะเปิดหลังระบบกำหนดกิจการที่ได้รับมอบหมาย' }, 403);
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);

      const body = await request.json() as {
        availableYears?: string[];
        recordsByYear?: Record<string, unknown[]>;
        expectedDirectoryRevision?: number;
      };
      const expectedRevision = Number(body.expectedDirectoryRevision);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        return json({ error: 'ไม่พบเวอร์ชันข้อมูลที่อ่านล่าสุด กรุณาโหลดข้อมูลใหม่ก่อนบันทึก' }, 428);
      }

      const years = Array.from(new Set((body.availableYears || Object.keys(body.recordsByYear || {})).map((year: string) => String(year === '2569' ? '69' : year))))
        .filter((year) => /^\d{2,4}$/.test(year)).slice(0, 100);
      if (!years.length) years.push('69');
      const records = body.recordsByYear || {};
      for (const year of years) {
        const rows = Array.isArray(records[year]) ? records[year] : [];
        if (rows.length > 10000) return json({ error: `ข้อมูลปี ${year} มีรายการมากเกินไป` }, 413);
      }

      // The first statement claims the exact snapshot revision using a unique
      // write token. Revision alone is insufficient: a stale competing batch could
      // observe the winner's incremented revision and otherwise pass its own gate.
      const nextRevision = expectedRevision + 1;
      const writeToken = crypto.randomUUID();
      const now = new Date().toISOString();
      const statements = [
        env.DB.prepare('UPDATE workspaces SET directory_revision = directory_revision + 1, directory_write_token = ?, updated_at = ? WHERE id = ? AND directory_revision = ?')
          .bind(writeToken, now, workspaceAccess.workspaceId, expectedRevision),
        ...years.map((year: string) => env.DB.prepare(
          'INSERT INTO workspace_directory_year_data (workspace_id, fiscal_year, records, revision, updated_by, updated_at) SELECT ?, ?, ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND directory_revision = ? AND directory_write_token = ?) ON CONFLICT(workspace_id, fiscal_year) DO UPDATE SET records = excluded.records, revision = workspace_directory_year_data.revision + 1, updated_by = excluded.updated_by, updated_at = excluded.updated_at'
        ).bind(workspaceAccess.workspaceId, year, JSON.stringify(Array.isArray(records[year]) ? records[year] : []), user.id, now, workspaceAccess.workspaceId, nextRevision, writeToken)),
      ];

      const existing = await env.DB.prepare('SELECT fiscal_year FROM workspace_directory_year_data WHERE workspace_id = ?')
        .bind(workspaceAccess.workspaceId).all();
      const existingYears = (existing.results || []).map((row: { fiscal_year: string }) => String(row.fiscal_year));
      for (const removed of existingYears.filter((year: string) => !years.includes(year))) {
        statements.push(env.DB.prepare(
          'DELETE FROM workspace_directory_year_data WHERE workspace_id = ? AND fiscal_year = ? AND EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND directory_revision = ? AND directory_write_token = ?)'
        ).bind(workspaceAccess.workspaceId, removed, workspaceAccess.workspaceId, nextRevision, writeToken));
      }

      const results = await env.DB.batch(statements);
      const claimedRevision = Number(results[0]?.meta?.changes || 0);
      if (claimedRevision !== 1) {
        return json({
          error: 'ข้อมูลถูกบันทึกจากอุปกรณ์อื่นก่อนแล้ว ระบบจึงยังไม่บันทึกข้อมูลชุดเก่านี้ เพื่อป้องกันข้อมูลใหม่สูญหาย กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไขต่อ',
          conflict: true,
        }, 409);
      }
      return json({ ok: true, savedYears: years.length, directoryRevision: nextRevision });
    }

    // Annual work tracking is stored in its own D1 table, separate from directory JSON.
    if (path === '/api/annual-tasks' && request.method === 'GET') {
      const authenticatedUser = await requireUser(request, env);
      if (!authenticatedUser) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const workspaceAccess = await getWorkspaceAccess(authenticatedUser, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      const user = workspaceAccess.user;
      const fiscalYear = String(url.searchParams.get('year') || '').trim();
      if (!/^\d{2,4}$/.test(fiscalYear)) return json({ error: 'รอบปีบัญชีไม่ถูกต้อง' }, 400);
      const result = await env.DB.prepare(
        'SELECT id, fiscal_year, business_id, business_name, task_code, task_name, status, due_date, note, created_at, updated_at FROM annual_tasks WHERE workspace_id = ? AND fiscal_year = ? AND ( ? = ? OR EXISTS (SELECT 1 FROM business_assignments ba WHERE ba.workspace_id = annual_tasks.workspace_id AND ba.business_id = annual_tasks.business_id AND ba.user_id = ?) ) ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, business_name COLLATE NOCASE ASC, task_name COLLATE NOCASE ASC'
      ).bind(workspaceAccess.workspaceId, fiscalYear, workspaceAccess.membershipType, 'owner', user.id).all();
      const tasks = (result.results || []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        fiscalYear: String(row.fiscal_year),
        businessId: String(row.business_id),
        businessName: String(row.business_name),
        taskCode: String(row.task_code),
        taskName: String(row.task_name),
        status: String(row.status),
        dueDate: row.due_date ? String(row.due_date) : '',
        note: String(row.note || ''),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));
      return json({ tasks });
    }

    if (path === '/api/annual-tasks' && request.method === 'POST') {
      const authenticatedUser = await requireUser(request, env);
      if (!authenticatedUser) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const workspaceAccess = await getWorkspaceAccess(authenticatedUser, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      const user = workspaceAccess.user;
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const body = await request.json() as {
        fiscalYear?: string; businessId?: string; businessName?: string;
        taskCode?: string; taskName?: string; status?: string; dueDate?: string; note?: string;
      };
      const fiscalYear = String(body.fiscalYear || '').trim();
      const businessId = String(body.businessId || '').trim();
      const businessName = String(body.businessName || '').trim();
      const taskCode = String(body.taskCode || '').trim().toUpperCase();
      const business = await findWorkspaceBusiness(workspaceAccess.workspaceId, String(currentTask.business_id || ''), env);
      if (!business) return json({ error: 'ไม่พบกิจการต้นทางในทะเบียน Workspace จึงไม่สามารถแก้ไขงานนี้ได้' }, 409);
      const taskName = String(body.taskName || '').trim();
      const status = String(body.status || 'pending');
      const dueDate = String(body.dueDate || '').trim();
      const note = String(body.note || '').trim();
      if (!/^\d{2,4}$/.test(fiscalYear) || !businessId || businessId.length > 160 || !businessName || businessName.length > 300 || !/^[A-Z0-9_-]{2,60}$/.test(taskCode) || !taskName || taskName.length > 120) {
        return json({ error: 'กรุณาตรวจสอบรอบปี กิจการ และประเภทงาน' }, 400);
      }
      if (!['pending', 'in_progress', 'completed'].includes(status)) return json({ error: 'สถานะงานไม่ถูกต้อง' }, 400);
      if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return json({ error: 'รูปแบบกำหนดส่งไม่ถูกต้อง' }, 400);
      if (note.length > 2000) return json({ error: 'หมายเหตุยาวเกินไป' }, 400);
      const business = await findWorkspaceBusiness(workspaceAccess.workspaceId, businessId, env);
      if (!business) return json({ error: 'ไม่พบกิจการนี้ในทะเบียนของ Workspace' }, 404);
      if (workspaceAccess.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT 1 AS allowed FROM business_assignments WHERE workspace_id = ? AND business_id = ? AND user_id = ?')
          .bind(workspaceAccess.workspaceId, businessId, user.id).first();
        if (!assigned) return json({ error: 'กิจการนี้ยังไม่ได้รับมอบหมายให้คุณ' }, 403);
      }
      const id = randomToken(18);
      const now = new Date().toISOString();
      try {
        await env.DB.prepare(
          'INSERT INTO annual_tasks (id, workspace_id, fiscal_year, business_id, business_name, task_code, task_name, status, due_date, note, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, workspaceAccess.workspaceId, fiscalYear, businessId, business.companyName, taskCode, taskName, status, dueDate || null, note, user.id, user.id, now, now).run();
      } catch (error) {
        const existing = await env.DB.prepare('SELECT id FROM annual_tasks WHERE fiscal_year = ? AND business_id = ? AND task_code = ?').bind(fiscalYear, businessId, taskCode).first();
        if (existing) return json({ error: 'กิจการนี้มีงานประเภทนี้ในรอบปีดังกล่าวแล้ว' }, 409);
        throw error;
      }
      return json({ ok: true, id, createdAt: now, updatedAt: now }, 201);
    }

    const annualTaskMatch = path.match(/^\/api\/annual-tasks\/([A-Za-z0-9_-]+)$/);
    if (annualTaskMatch && request.method === 'PUT') {
      const authenticatedUser = await requireUser(request, env);
      if (!authenticatedUser) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const workspaceAccess = await getWorkspaceAccess(authenticatedUser, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      const user = workspaceAccess.user;
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const id = annualTaskMatch[1];
      const currentTask = await env.DB.prepare('SELECT business_id FROM annual_tasks WHERE id = ? AND workspace_id = ?')
        .bind(id, workspaceAccess.workspaceId).first() as { business_id?: string } | null;
      if (!currentTask) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
      if (workspaceAccess.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT 1 AS allowed FROM business_assignments WHERE workspace_id = ? AND business_id = ? AND user_id = ?')
          .bind(workspaceAccess.workspaceId, String(currentTask.business_id || ''), user.id).first();
        if (!assigned) return json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของกิจการนี้' }, 403);
      }
      const body = await request.json() as {
        businessName?: string; taskCode?: string; taskName?: string;
        status?: string; dueDate?: string; note?: string;
      };
      const taskName = String(body.taskName || '').trim();
      const taskCode = String(body.taskCode || '').trim().toUpperCase();
      const businessName = String(body.businessName || '').trim();
      const status = String(body.status || '');
      const dueDate = String(body.dueDate || '').trim();
      const note = String(body.note || '').trim();
      if (!businessName || businessName.length > 300 || !/^[A-Z0-9_-]{2,60}$/.test(taskCode) || !taskName || taskName.length > 120) return json({ error: 'ข้อมูลกิจการหรือประเภทงานไม่ถูกต้อง' }, 400);
      if (!['pending', 'in_progress', 'completed'].includes(status)) return json({ error: 'สถานะงานไม่ถูกต้อง' }, 400);
      if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return json({ error: 'รูปแบบกำหนดส่งไม่ถูกต้อง' }, 400);
      if (note.length > 2000) return json({ error: 'หมายเหตุยาวเกินไป' }, 400);
      let result;
      try {
        result = await env.DB.prepare(
          'UPDATE annual_tasks SET business_name = ?, task_code = ?, task_name = ?, status = ?, due_date = ?, note = ?, updated_by = ?, updated_at = ? WHERE id = ? AND workspace_id = ?'
        ).bind(business.companyName, taskCode, taskName, status, dueDate || null, note, user.id, new Date().toISOString(), id, workspaceAccess.workspaceId).run();
      } catch (error) {
        const current = await env.DB.prepare('SELECT fiscal_year, business_id FROM annual_tasks WHERE id = ? AND workspace_id = ?').bind(id, workspaceAccess.workspaceId).first() as { fiscal_year?: string; business_id?: string } | null;
        if (!current) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
        const duplicate = await env.DB.prepare('SELECT id FROM annual_tasks WHERE workspace_id = ? AND fiscal_year = ? AND business_id = ? AND task_code = ? AND id != ?').bind(workspaceAccess.workspaceId, current.fiscal_year, current.business_id, taskCode, id).first();
        if (duplicate) return json({ error: 'กิจการนี้มีงานประเภทนี้ในรอบปีดังกล่าวแล้ว' }, 409);
        throw error;
      }
      if (!result.meta?.changes) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
      return json({ ok: true });
    }

    if (annualTaskMatch && request.method === 'DELETE') {
      const authenticatedUser = await requireUser(request, env);
      if (!authenticatedUser) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const workspaceAccess = await getWorkspaceAccess(authenticatedUser, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      const user = workspaceAccess.user;
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const task = await env.DB.prepare('SELECT business_id FROM annual_tasks WHERE id = ? AND workspace_id = ?').bind(annualTaskMatch[1], workspaceAccess.workspaceId).first() as { business_id?: string } | null;
      if (!task) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
      if (workspaceAccess.membershipType !== 'owner') {
        const assigned = await env.DB.prepare('SELECT 1 AS allowed FROM business_assignments WHERE workspace_id = ? AND business_id = ? AND user_id = ?')
          .bind(workspaceAccess.workspaceId, String(task.business_id || ''), user.id).first();
        if (!assigned) return json({ error: 'คุณไม่มีสิทธิ์ลบงานของกิจการนี้' }, 403);
      }
      const result = await env.DB.prepare('DELETE FROM annual_tasks WHERE id = ? AND workspace_id = ?').bind(annualTaskMatch[1], workspaceAccess.workspaceId).run();
      if (!result.meta?.changes) return json({ error: 'ไม่พบรายการงานนี้' }, 404);
      return json({ ok: true });
    }



    if (path.startsWith('/api/workspace/invitations')) return json({ error: 'ระบบคำเชิญผ่านอีเมลถูกแทนที่ด้วยบัญชีที่ Owner สร้างโดยตรง' }, 410);

    if (path === '/api/workspace/assignments' && request.method === 'GET') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่ดูแลการมอบหมายได้' }, 403);
      const result = await env.DB.prepare("SELECT ba.id, ba.business_id, ba.user_id, u.email, u.display_name, ba.assigned_by, ba.created_at FROM business_assignments ba JOIN users u ON u.id = ba.user_id JOIN workspace_memberships wm ON wm.workspace_id = ba.workspace_id AND wm.user_id = ba.user_id WHERE ba.workspace_id = ? AND wm.status = 'active' AND wm.membership_type = 'collaborator' ORDER BY ba.created_at DESC").bind(access.workspaceId).all();
      return json({ assignments: result.results || [] });
    }

    if (path === '/api/workspace/assignments' && request.method === 'POST') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่มอบหมายกิจการได้' }, 403);
      const body = await request.json() as { businessId?: string; userId?: string };
      const businessId = String(body.businessId || '').trim(), userId = String(body.userId || '').trim();
      if (!businessId || businessId.length > 160 || !userId || userId.length > 160) return json({ error: 'รหัสกิจการหรือสมาชิกไม่ถูกต้อง' }, 400);
      const business = await findWorkspaceBusiness(access.workspaceId, businessId, env);
      if (!business) return json({ error: 'ไม่พบกิจการนี้ในทะเบียนของ Workspace' }, 404);
      const collaborator = await env.DB.prepare("SELECT user_id FROM workspace_memberships WHERE workspace_id = ? AND user_id = ? AND membership_type = 'collaborator' AND status = 'active'").bind(access.workspaceId, userId).first();
      if (!collaborator) return json({ error: 'ไม่พบสมาชิกที่มีสถานะ Collaborator ใน Workspace นี้' }, 404);
      const existing = await env.DB.prepare('SELECT id FROM business_assignments WHERE workspace_id = ? AND business_id = ? AND user_id = ?').bind(access.workspaceId, businessId, userId).first();
      if (existing) return json({ ok: true, alreadyAssigned: true });
      const id = randomToken(18), now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('INSERT INTO business_assignments (id, workspace_id, business_id, user_id, assigned_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, access.workspaceId, businessId, userId, access.user.id, now),
        env.DB.prepare('INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(randomToken(18), access.workspaceId, access.user.id, 'business.assignment.created', 'business_assignment', id, JSON.stringify({ businessId, collaboratorUserId: userId }), now)
      ]);
      return json({ ok: true, id }, 201);
    }

    const assignmentDeleteMatch = path.match(/^\/api\/workspace\/assignments\/([A-Za-z0-9_-]+)$/);
    if (assignmentDeleteMatch && request.method === 'DELETE') {
      const access = await requireWorkspaceAccess(request, env);
      if (!access) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      if (access.membershipType !== 'owner') return json({ error: 'เฉพาะ Owner เท่านั้นที่ยกเลิกการมอบหมายได้' }, 403);
      const id = assignmentDeleteMatch[1];
      const assignment = await env.DB.prepare('SELECT business_id, user_id FROM business_assignments WHERE id = ? AND workspace_id = ?').bind(id, access.workspaceId).first() as { business_id?: string; user_id?: string } | null;
      if (!assignment) return json({ error: 'ไม่พบรายการมอบหมายนี้' }, 404);
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM business_assignments WHERE id = ? AND workspace_id = ?').bind(id, access.workspaceId),
        env.DB.prepare('INSERT INTO audit_events (id, workspace_id, actor_user_id, action, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(randomToken(18), access.workspaceId, access.user.id, 'business.assignment.revoked', 'business_assignment', id, JSON.stringify({ businessId: assignment.business_id || '', collaboratorUserId: assignment.user_id || '' }), now)
      ]);
      return json({ ok: true });
    }

    return json({ error: 'API route not found' }, 404);
  } catch (error) {
    console.error('M101 API error', error);
    return json({ error: 'เกิดข้อผิดพลาดภายในระบบ Cloudflare' }, 500);
  }
}

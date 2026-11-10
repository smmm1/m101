type Env = { DB: any; MONEY102_AUTH: { fetch(request: Request): Promise<Response> } };
type UserRow = { id: string; email: string; display_name: string; role: 'admin' | 'member'; password_hash: string; password_salt: string; pin_hash?: string | null; pin_salt?: string | null };

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
    'SELECT u.id, u.email, u.display_name, u.role, u.password_hash, u.password_salt FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role };
}


type WorkspaceAccess = { user: UserRow; workspaceId: string; membershipType: 'owner' | 'collaborator' };

async function getWorkspaceAccess(user: UserRow, env: Env): Promise<WorkspaceAccess | null> {
  const row = await env.DB.prepare(
    "SELECT wm.workspace_id, wm.membership_type FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.user_id = ? AND wm.status = 'active' AND w.status = 'active' ORDER BY CASE wm.membership_type WHEN 'owner' THEN 0 ELSE 1 END LIMIT 1"
  ).bind(user.id).first() as { workspace_id?: string; membership_type?: 'owner' | 'collaborator' } | null;
  if (!row?.workspace_id || !row.membership_type) return null;
  return { user, workspaceId: String(row.workspace_id), membershipType: row.membership_type };
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

function cleanRecordForVisitor(record: Record<string, unknown>) {
  // Public/visitor mode is an explicit allowlist. Never spread private record fields.
  return {
    id: String(record.id || ''),
    sequenceNo: String(record.sequenceNo || ''),
    taxId: '',
    companyName: String(record.companyName || ''),
    type: record.type,
    auditorDate: String(record.auditorDate || ''),
    password: '',
    remark: '',
    eFilingCode: '',
    ssoCode: '',
    status: record.status,
    isVerifiedDbd: Boolean(record.isVerifiedDbd),
    createdAt: String(record.createdAt || ''),
    updatedAt: String(record.updatedAt || ''),
  };
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
      const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
      return json({ ok: true, database: 'connected', users: Number(row?.count || 0) });
    }

    if (path === '/api/auth/bridge-health' && request.method === 'GET') {
      try {
        const response = await env.MONEY102_AUTH.fetch(new Request('https://money102-auth.internal/health'));
        let service: unknown = null;
        try { service = await response.json(); } catch { service = null; }
        return json({ ok: response.ok, status: response.status, service });
      } catch (error) {
        console.error('M101 Money102 bridge health failed', error);
        return json({ ok: false, error: 'Money102 authentication service unavailable' }, 503);
      }
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json() as { email?: string; password?: string };
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password || password.length > 1024) return json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, 400);

      // Money102 is the source of truth for credentials. M101 keeps its own
      // users, sessions and directory data in the separate M101 D1 database.
      let remoteResponse: Response;
      try {
        remoteResponse = await env.MONEY102_AUTH.fetch(new Request('https://money102-auth.internal/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email, password }),
        }));
      } catch (error) {
        console.error('M101 Money102 service binding failed', error);
        return json({ error: 'เชื่อมต่อระบบบัญชี Money102 ไม่สำเร็จ กรุณาลองใหม่' }, 503);
      }

      if (remoteResponse.status === 401) return json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401);
      if (!remoteResponse.ok) {
        return json({ error: remoteResponse.status === 429 ? 'ลองเข้าสู่ระบบอีกครั้งในภายหลัง' : 'ระบบบัญชี Money102 ยังไม่พร้อม กรุณาลองใหม่' }, remoteResponse.status === 429 ? 429 : 503);
      }

      let remote: { user?: { id?: string; email?: string }; token?: string };
      try { remote = await remoteResponse.json() as typeof remote; } catch {
        return json({ error: 'ระบบบัญชี Money102 ส่งข้อมูลกลับมาไม่ถูกต้อง' }, 502);
      }
      const verifiedEmail = String(remote.user?.email || '').trim().toLowerCase();
      if (!remote.token || !remote.user?.id || verifiedEmail !== email) {
        return json({ error: 'ยืนยันบัญชี Money102 ไม่สำเร็จ กรุณาลองใหม่' }, 502);
      }

      // Money102 proves identity, but it does not grant M101 workspace access.
      // New accounts must be admitted through an owner-issued M101 invitation.
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').bind(email).first() as UserRow | null;
      if (!user) return json({ error: 'บัญชีนี้ยังไม่ได้รับคำเชิญเข้า M101 กรุณาติดต่อ Owner' }, 403);
      const workspaceAccess = await getWorkspaceAccess(user, env);
      if (!workspaceAccess) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101 กรุณาติดต่อ Owner' }, 403);

      const token = randomToken();
      const createdAt = new Date().toISOString();
      await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), user.id, Math.floor(Date.now() / 1000) + SESSION_SECONDS, createdAt).run();
      return json({ user: publicUser(user) }, 200, { 'Set-Cookie': sessionCookie(token) });
    }

    if (path === '/api/auth/pin/status' && request.method === 'GET') {
      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const row = await env.DB.prepare('SELECT pin_hash FROM users WHERE id = ?').bind(user.id).first() as { pin_hash?: string | null } | null;
      return json({ enabled: Boolean(row?.pin_hash) });
    }

    if (path === '/api/auth/pin/setup' && request.method === 'POST') {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const body = await request.json() as { pin?: string };
      const pin = String(body.pin || '');
      if (!/^\d{6}$/.test(pin)) return json({ error: 'PIN ต้องเป็นตัวเลข 6 หลัก' }, 400);

      const configuredUsers = await env.DB.prepare('SELECT id, pin_hash, pin_salt FROM users WHERE pin_hash IS NOT NULL AND pin_salt IS NOT NULL AND id != ?')
        .bind(user.id).all();
      for (const existing of configuredUsers.results || []) {
        const candidate = await hashPassword(pin, String(existing.pin_salt), 100000);
        if (constantTimeEqual(candidate.hash, String(existing.pin_hash))) {
          return json({ error: 'PIN นี้ถูกใช้กับบัญชีอื่นแล้ว กรุณาตั้ง PIN ที่แตกต่างกัน' }, 409);
        }
      }

      const encoded = await hashPassword(pin, randomToken(16), 100000);
      await env.DB.prepare('UPDATE users SET pin_hash = ?, pin_salt = ? WHERE id = ?')
        .bind(encoded.hash, encoded.salt, user.id).run();
      return json({ ok: true, enabled: true });
    }

    if (path === '/api/auth/pin/login' && request.method === 'POST') {
      const body = await request.json() as { pin?: string };
      const pin = String(body.pin || '');
      if (!/^\d{6}$/.test(pin)) return json({ error: 'กรุณากรอก PIN 6 หลัก' }, 400);
      const now = Math.floor(Date.now() / 1000);
      // Rate-limit PIN guesses per Cloudflare client IP; never store the raw IP.
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown-client';
      const attemptKey = `__pin_gate__:${await digest(clientIp)}`;
      const windowStart = now - 15 * 60;
      const attempts = await env.DB.prepare('SELECT COUNT(*) AS count FROM pin_login_attempts WHERE email = ? AND attempted_at > ?')
        .bind(attemptKey, windowStart).first() as { count?: number } | null;
      if (Number(attempts?.count || 0) >= 5) return json({ error: 'ลอง PIN ผิดหลายครั้ง กรุณารอ 15 นาทีหรือใช้รหัสผ่าน' }, 429);

      const configuredUsers = await env.DB.prepare('SELECT * FROM users WHERE pin_hash IS NOT NULL AND pin_salt IS NOT NULL')
        .all();
      let matchedUser: UserRow | null = null;
      for (const candidateUser of (configuredUsers.results || []) as UserRow[]) {
        const candidate = await hashPassword(pin, String(candidateUser.pin_salt), 100000);
        if (constantTimeEqual(candidate.hash, String(candidateUser.pin_hash))) {
          matchedUser = candidateUser;
          break;
        }
      }
      if (!matchedUser) {
        await env.DB.prepare('INSERT INTO pin_login_attempts (email, attempted_at) VALUES (?, ?)')
          .bind(attemptKey, now).run();
        return json({ error: 'PIN ไม่ถูกต้อง' }, 401);
      }

      const pinWorkspaceAccess = matchedUser ? await getWorkspaceAccess(matchedUser, env) : null;
      if (!pinWorkspaceAccess) {
        await env.DB.prepare('INSERT INTO pin_login_attempts (email, attempted_at) VALUES (?, ?)')
          .bind(attemptKey, now).run();
        return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101 กรุณาเข้าสู่ระบบด้วยรหัสผ่านหรือติดต่อ Owner' }, 403);
      }

      await env.DB.prepare('DELETE FROM pin_login_attempts WHERE email = ?').bind(attemptKey).run();
      const token = randomToken();
      const createdAt = new Date().toISOString();
      await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), matchedUser.id, now + SESSION_SECONDS, createdAt).run();
      return json({ user: publicUser(matchedUser) }, 200, { 'Set-Cookie': sessionCookie(token) });
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

    if (path === '/api/public/data' && request.method === 'GET') {
      const result = await env.DB.prepare('SELECT fiscal_year, records FROM workspace_directory_year_data WHERE workspace_id = ? ORDER BY fiscal_year').all();
      const recordsByYear: Record<string, unknown[]> = {};
      for (const row of result.results || []) {
        const parsed = JSON.parse(String(row.records || '[]')) as Record<string, unknown>[];
        recordsByYear[String(row.fiscal_year)] = parsed.map(cleanRecordForVisitor);
      }
      const availableYears = Object.keys(recordsByYear);
      return json({ recordsByYear, availableYears });
    }

    if (path === '/api/data' && request.method === 'GET') {

      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      if (workspaceAccess.membershipType !== 'owner') return json({ error: 'การเข้าถึงทะเบียนกิจการของผู้ร่วมงานจะเปิดหลังระบบกำหนดกิจการที่ได้รับมอบหมาย' }, 403);
      const result = await env.DB.prepare('SELECT fiscal_year, records FROM workspace_directory_year_data WHERE workspace_id = ? ORDER BY fiscal_year').bind(workspaceAccess.workspaceId).all();
      const recordsByYear: Record<string, unknown[]> = {};
      for (const row of result.results || []) recordsByYear[String(row.fiscal_year)] = JSON.parse(String(row.records || '[]'));
      const availableYears = Object.keys(recordsByYear);
      if (!availableYears.length) {
        recordsByYear['69'] = [];
        availableYears.push('69');
      }
      return json({ recordsByYear, availableYears });
    }

    if (path === '/api/data' && request.method === 'PUT') {

      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      if (workspaceAccess.membershipType !== 'owner') return json({ error: 'การเข้าถึงทะเบียนกิจการของผู้ร่วมงานจะเปิดหลังระบบกำหนดกิจการที่ได้รับมอบหมาย' }, 403);
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const body = await request.json() as { availableYears?: string[]; recordsByYear?: Record<string, unknown[]> };
      const years = Array.from(new Set((body.availableYears || Object.keys(body.recordsByYear || {})).map((year: string) => String(year === '2569' ? '69' : year))))
        .filter((year) => /^\d{2,4}$/.test(year)).slice(0, 100);
      if (!years.length) years.push('69');
      const records = body.recordsByYear || {};
      for (const year of years) {
        const rows = Array.isArray(records[year]) ? records[year] : [];
        if (rows.length > 10000) return json({ error: `ข้อมูลปี ${year} มีรายการมากเกินไป` }, 413);
      }
      const existing = await env.DB.prepare('SELECT fiscal_year FROM workspace_directory_year_data WHERE workspace_id = ?').bind(workspaceAccess.workspaceId).all();
      const existingYears = (existing.results || []).map((row: { fiscal_year: string }) => String(row.fiscal_year));
      const statements = years.map((year: string) => env.DB.prepare(
        'INSERT INTO workspace_directory_year_data (workspace_id, fiscal_year, records, revision, updated_by, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(workspace_id, fiscal_year) DO UPDATE SET records = excluded.records, revision = workspace_directory_year_data.revision + 1, updated_by = excluded.updated_by, updated_at = excluded.updated_at'
      ).bind(workspaceAccess.workspaceId, year, JSON.stringify(Array.isArray(records[year]) ? records[year] : []), user.id, new Date().toISOString()));
      for (const removed of existingYears.filter((year: string) => !years.includes(year))) {
        statements.push(env.DB.prepare('DELETE FROM workspace_directory_year_data WHERE workspace_id = ? AND fiscal_year = ?').bind(workspaceAccess.workspaceId, removed));
      }
      await env.DB.batch(statements);
      return json({ ok: true, savedYears: years.length });
    }

    // Annual work tracking is stored in its own D1 table, separate from directory JSON.
    if (path === '/api/annual-tasks' && request.method === 'GET') {
      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
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
      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const body = await request.json() as {
        fiscalYear?: string; businessId?: string; businessName?: string;
        taskCode?: string; taskName?: string; status?: string; dueDate?: string; note?: string;
      };
      const fiscalYear = String(body.fiscalYear || '').trim();
      const businessId = String(body.businessId || '').trim();
      const businessName = String(body.businessName || '').trim();
      const taskCode = String(body.taskCode || '').trim().toUpperCase();
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
        ).bind(id, workspaceAccess.workspaceId, fiscalYear, businessId, businessName, taskCode, taskName, status, dueDate || null, note, user.id, user.id, now, now).run();
      } catch (error) {
        const existing = await env.DB.prepare('SELECT id FROM annual_tasks WHERE fiscal_year = ? AND business_id = ? AND task_code = ?').bind(fiscalYear, businessId, taskCode).first();
        if (existing) return json({ error: 'กิจการนี้มีงานประเภทนี้ในรอบปีดังกล่าวแล้ว' }, 409);
        throw error;
      }
      return json({ ok: true, id, createdAt: now, updatedAt: now }, 201);
    }

    const annualTaskMatch = path.match(/^\/api\/annual-tasks\/([A-Za-z0-9_-]+)$/);
    if (annualTaskMatch && request.method === 'PUT') {
      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
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
        ).bind(businessName, taskCode, taskName, status, dueDate || null, note, user.id, new Date().toISOString(), id, workspaceAccess.workspaceId).run();
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
      const workspaceAccess = await requireWorkspaceAccess(request, env);
      const user = workspaceAccess?.user || null;
      if (!user) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์เข้า Workspace M101' }, 403);
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

    return json({ error: 'API route not found' }, 404);
  } catch (error) {
    console.error('M101 API error', error);
    return json({ error: 'เกิดข้อผิดพลาดภายในระบบ Cloudflare' }, 500);
  }
}

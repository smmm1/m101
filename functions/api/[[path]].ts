type Env = { DB: any; MONEY102_AUTH_URL?: string };
type UserRow = { id: string; email: string; display_name: string; role: 'admin' | 'member'; password_hash: string; password_salt: string };

const COOKIE_NAME = 'm101_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const PBKDF2_ITERATIONS = 310000;

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
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

async function requireUser(request: Request, env: Env) {
  const user = await getUser(request, env);
  return user;
}

function cleanRecordForVisitor(record: Record<string, unknown>) {
  return { ...record, taxId: '', password: '', eFilingCode: '', ssoCode: '' };
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith('/api/')) return new Response('Not found', { status: 404 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  try {
    if (path === '/api/health' && request.method === 'GET') {
      const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
      return json({ ok: true, database: 'connected', users: Number(row?.count || 0) });
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json() as { email?: string; password?: string };
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password || password.length > 1024) return json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, 400);

      // Money102 is the source of truth for credentials. M101 keeps its own
      // users, sessions and directory data in the separate M101 D1 database.
      const authUrl = (env.MONEY102_AUTH_URL || 'https://money102-api.s2mtha16.workers.dev').replace(/\/$/, '');
      let remoteResponse: Response;
      try {
        remoteResponse = await fetch(`${authUrl}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email, password }),
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
        });
      } catch {
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

      // Provision the corresponding M101 identity only after Money102 has
      // verified the password. No Money102 token or business data is copied.
      let user = await env.DB.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').bind(email).first() as UserRow | null;
      if (!user) {
        const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first() as { count?: number } | null;
        const role = Number(countRow?.count || 0) === 0 ? 'admin' : 'member';
        const localCredential = await hashPassword(password);
        const id = randomToken(16);
        await env.DB.prepare('INSERT OR IGNORE INTO users (id, email, display_name, role, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(id, email, email.split('@')[0], role, localCredential.hash, localCredential.salt, new Date().toISOString()).run();
        user = await env.DB.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').bind(email).first() as UserRow | null;
      } else {
        const localCredential = await hashPassword(password);
        await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
          .bind(localCredential.hash, localCredential.salt, user.id).run();
        user = { ...user, password_hash: localCredential.hash, password_salt: localCredential.salt };
      }
      if (!user) return json({ error: 'สร้างบัญชีใน M101 ไม่สำเร็จ กรุณาลองใหม่' }, 500);

      const token = randomToken();
      const createdAt = new Date().toISOString();
      await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(await digest(token), user.id, Math.floor(Date.now() / 1000) + SESSION_SECONDS, createdAt).run();
      return json({ user: publicUser(user) }, 200, { 'Set-Cookie': sessionCookie(token) });
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
      const result = await env.DB.prepare('SELECT fiscal_year, records FROM directory_year_data ORDER BY fiscal_year').all();
      const recordsByYear: Record<string, unknown[]> = {};
      for (const row of result.results || []) {
        const parsed = JSON.parse(String(row.records || '[]')) as Record<string, unknown>[];
        recordsByYear[String(row.fiscal_year)] = parsed.map(cleanRecordForVisitor);
      }
      const availableYears = Object.keys(recordsByYear);
      return json({ recordsByYear, availableYears });
    }

    if (path === '/api/data' && request.method === 'GET') {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
      const result = await env.DB.prepare('SELECT fiscal_year, records FROM directory_year_data ORDER BY fiscal_year').all();
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
      const user = await requireUser(request, env);
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
      const existing = await env.DB.prepare('SELECT fiscal_year FROM directory_year_data').all();
      const existingYears = (existing.results || []).map((row: { fiscal_year: string }) => String(row.fiscal_year));
      const statements = years.map((year) => env.DB.prepare(
        'INSERT INTO directory_year_data (fiscal_year, records, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(fiscal_year) DO UPDATE SET records = excluded.records, updated_by = excluded.updated_by, updated_at = excluded.updated_at'
      ).bind(year, JSON.stringify(Array.isArray(records[year]) ? records[year] : []), user.id, new Date().toISOString()));
      for (const removed of existingYears.filter((year) => !years.includes(year))) {
        statements.push(env.DB.prepare('DELETE FROM directory_year_data WHERE fiscal_year = ?').bind(removed));
      }
      await env.DB.batch(statements);
      return json({ ok: true, savedYears: years.length });
    }

    return json({ error: 'API route not found' }, 404);
  } catch (error) {
    console.error('M101 API error', error);
    return json({ error: 'เกิดข้อผิดพลาดภายในระบบ Cloudflare' }, 500);
  }
}

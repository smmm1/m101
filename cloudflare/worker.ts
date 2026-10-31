interface Env {
  DB: D1Database;
  M101_BOOTSTRAP_SECRET: string;
  APP_ORIGIN?: string;
}
type Role = "admin" | "member";
type SessionUser = { id: string; email: string; role: Role };
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const randomToken = () => { const b = crypto.getRandomValues(new Uint8Array(32)); return bytesToHex(b); };
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}
async function passwordHash(password: string, salt = randomToken()) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 310000 }, key, 256);
  return `pbkdf2_sha256$${salt}$${bytesToHex(new Uint8Array(bits))}`;
}
async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "pbkdf2_sha256" || !salt || !expected) return false;
  const actual = await passwordHash(password, salt);
  return actual === stored;
}
function cookie(token: string, maxAge: number) {
  return `m101_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
function readCookie(request: Request) {
  return request.headers.get("Cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("m101_session="))?.slice("m101_session=".length) || "";
}
function cors(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const headers = new Headers();
  if (origin && env.APP_ORIGIN && origin === env.APP_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  return headers;
}
async function currentUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare(`SELECT u.id, u.email, u.role FROM m101_sessions s JOIN m101_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > datetime('now')`).bind(await sha256(token)).first<SessionUser>();
  return row || null;
}
const privateFields = new Set(["password", "eFilingCode", "ssoCode"]);
function publicRecords(records: unknown) {
  if (!Array.isArray(records)) return [];
  return records.map((record: any) => {
    const copy = { ...record };
    for (const field of privateFields) delete copy[field];
    return copy;
  });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health") return json({ ok: true, service: "m101-cloudflare-api" }, 200, headers);
      if (url.pathname === "/api/auth/bootstrap" && request.method === "POST") {
        const body = await request.json() as { secret?: string; email?: string; password?: string };
        if (!env.M101_BOOTSTRAP_SECRET || body.secret !== env.M101_BOOTSTRAP_SECRET) return json({ error: "ไม่ได้รับอนุญาต" }, 403, headers);
        const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM m101_users").first<{count:number}>();
        if ((count?.count || 0) > 0) return json({ error: "ตั้งค่าผู้ดูแลระบบแล้ว" }, 409, headers);
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        if (!email.includes("@") || password.length < 12) return json({ error: "อีเมลไม่ถูกต้องหรือรหัสผ่านสั้นกว่า 12 ตัวอักษร" }, 400, headers);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO m101_users (id,email,password_hash,role) VALUES (?,?,?,'admin')").bind(id,email,await passwordHash(password)).run();
        return json({ ok: true, message: "สร้างบัญชีผู้ดูแลระบบแล้ว" }, 201, headers);
      }
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const body = await request.json() as { email?: string; password?: string };
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const user = await env.DB.prepare("SELECT id,email,password_hash,role FROM m101_users WHERE email=?").bind(email).first<{id:string;email:string;password_hash:string;role:Role}>();
        if (!user || !(await verifyPassword(password, user.password_hash))) return json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401, headers);
        const token = randomToken();
        await env.DB.prepare("INSERT INTO m101_sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,datetime('now','+7 days'))").bind(crypto.randomUUID(),user.id,await sha256(token)).run();
        headers.append("Set-Cookie", cookie(token, 604800));
        return json({ user: { id:user.id,email:user.email,role:user.role } }, 200, headers);
      }
      if (url.pathname === "/api/auth/session" && request.method === "GET") {
        const user = await currentUser(request, env);
        return json({ user }, user ? 200 : 401, headers);
      }
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const token = readCookie(request);
        if (token) await env.DB.prepare("DELETE FROM m101_sessions WHERE token_hash=?").bind(await sha256(token)).run();
        headers.append("Set-Cookie", "m101_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
        return json({ ok: true }, 200, headers);
      }
      if (url.pathname === "/api/records" && request.method === "GET") {
        const user = await currentUser(request, env);
        const isVisitor = url.searchParams.get("public") === "1";
        if (!user && !isVisitor) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401, headers);
        const rows = await env.DB.prepare("SELECT fiscal_year, records, updated_at FROM m101_directory_year_data ORDER BY fiscal_year").all<{fiscal_year:string;records:string;updated_at:string}>();
        const data = (rows.results || []).map(row => ({ fiscal_year: row.fiscal_year, records: isVisitor ? publicRecords(JSON.parse(row.records)) : JSON.parse(row.records), updated_at: row.updated_at }));
        return json({ years: data }, 200, headers);
      }
      if (url.pathname === "/api/records" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401, headers);
        const body = await request.json() as { years?: Array<{fiscal_year:string;records:unknown[]}> };
        if (!Array.isArray(body.years) || body.years.length > 100) return json({ error: "ข้อมูลปีบัญชีไม่ถูกต้อง" }, 400, headers);
        const statements = body.years.map(row => env.DB.prepare(`INSERT INTO m101_directory_year_data (fiscal_year,records,updated_by,updated_at) VALUES (?,?,?,datetime('now')) ON CONFLICT(fiscal_year) DO UPDATE SET records=excluded.records,updated_by=excluded.updated_by,updated_at=datetime('now')`).bind(String(row.fiscal_year),JSON.stringify(row.records || []),user.id));
        if (statements.length) await env.DB.batch(statements);
        return json({ ok: true }, 200, headers);
      }
      return json({ error: "ไม่พบ endpoint" }, 404, headers);
    } catch (error) {
      return json({ error: "เกิดข้อผิดพลาดภายในระบบ", detail: error instanceof Error ? error.message : "unknown" }, 500, headers);
    }
  }
};

import { neon } from '@neondatabase/serverless';

type StoredRecord = { id: string; [key: string]: unknown };
type AppPayload = { years: string[]; recordsByYear: Record<string, StoredRecord[]> };

const YEAR_PATTERN = /^[0-9]{1,4}$/;

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export function isValidPayload(body: unknown): body is AppPayload {
  if (!body || typeof body !== 'object') return false;
  const { years, recordsByYear } = body as Record<string, unknown>;
  if (!Array.isArray(years) || years.length === 0) return false;
  if (!years.every((y) => typeof y === 'string' && YEAR_PATTERN.test(y))) return false;
  if (!recordsByYear || typeof recordsByYear !== 'object') return false;
  return Object.entries(recordsByYear as Record<string, unknown>).every(
    ([year, records]) =>
      years.includes(year) &&
      Array.isArray(records) &&
      records.every((r) => r && typeof r === 'object' && typeof (r as StoredRecord).id === 'string')
  );
}

export async function loadData() {
  const sql = getSql();
  const [yearRows, recordRows] = await Promise.all([
    sql`select year from accounting_years order by year`,
    sql`select year, data from business_records order by year, position`,
  ]);

  const years = yearRows.map((row) => row.year as string);
  const recordsByYear: Record<string, unknown[]> = Object.fromEntries(years.map((y) => [y, []]));
  for (const row of recordRows) {
    (recordsByYear[row.year as string] ??= []).push(row.data);
  }
  return { years, recordsByYear };
}

export async function saveData({ years, recordsByYear }: AppPayload) {
  const sql = getSql();
  const seenIds = new Set<string>();
  const rows = Object.entries(recordsByYear).flatMap(([year, records]) =>
    records
      .filter((record) => !seenIds.has(record.id) && seenIds.add(record.id))
      .map((record, position) => ({ id: record.id, year, position, data: record }))
  );

  await sql.transaction([
    sql`delete from business_records`,
    sql`delete from accounting_years where not (year = any(${years}))`,
    sql`insert into accounting_years (year)
        select unnest(${years}::text[]) on conflict (year) do nothing`,
    sql`insert into business_records (id, year, position, data)
        select r.id, r.year, r.position, r.data
        from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          as r(id text, year text, position integer, data jsonb)`,
  ]);
}

export async function GET() {
  try {
    return Response.json(await loadData());
  } catch (error) {
    console.error('Failed to load data', error);
    return Response.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isValidPayload(body)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }
  try {
    await saveData(body);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Failed to save data', error);
    return Response.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

export const POST = PUT;

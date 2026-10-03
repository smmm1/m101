import { Router } from 'express';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type StoredRecord = { id: string; [key: string]: unknown };

const YEAR_PATTERN = /^[0-9]{1,4}$/;

function isValidPayload(body: unknown): body is { years: string[]; recordsByYear: Record<string, StoredRecord[]> } {
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

export const dataRouter = Router();

dataRouter.get('/data', async (_req, res) => {
  try {
    const [yearRows, recordRows] = await Promise.all([
      sql`select year from accounting_years order by year`,
      sql`select year, data from business_records order by year, position`,
    ]);

    const years = yearRows.map((row) => row.year as string);
    const recordsByYear: Record<string, unknown[]> = Object.fromEntries(years.map((y) => [y, []]));
    for (const row of recordRows) {
      (recordsByYear[row.year as string] ??= []).push(row.data);
    }

    res.json({ years, recordsByYear });
  } catch (error) {
    console.error('Failed to load data', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

dataRouter.put('/data', async (req, res) => {
  if (!isValidPayload(req.body)) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const { years, recordsByYear } = req.body;
  const seenIds = new Set<string>();
  const rows = Object.entries(recordsByYear).flatMap(([year, records]) =>
    records
      .filter((record) => !seenIds.has(record.id) && seenIds.add(record.id))
      .map((record, position) => ({ id: record.id, year, position, data: record }))
  );

  try {
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
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to save data', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

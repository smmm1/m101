-- Annual work tracking, kept separate from the JSON-based business directory.
CREATE TABLE IF NOT EXISTS annual_tasks (
  id TEXT PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  task_code TEXT NOT NULL,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (fiscal_year, business_id, task_code)
);
CREATE INDEX IF NOT EXISTS idx_annual_tasks_year_due
  ON annual_tasks(fiscal_year, due_date);
CREATE INDEX IF NOT EXISTS idx_annual_tasks_business
  ON annual_tasks(fiscal_year, business_id);
CREATE INDEX IF NOT EXISTS idx_annual_tasks_status
  ON annual_tasks(fiscal_year, status);

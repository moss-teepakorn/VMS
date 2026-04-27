-- Create holidays table for weekly and fixed public holidays by year
BEGIN;

CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  type text NOT NULL CHECK (type IN ('weekly', 'fixed')),
  weekday integer,
  holiday_date date,
  name text NOT NULL,
  note text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS holidays_weekday_idx ON holidays (year, weekday) WHERE type = 'weekly';
CREATE UNIQUE INDEX IF NOT EXISTS holidays_fixed_date_idx ON holidays (year, holiday_date) WHERE type = 'fixed';

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON holidays;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON holidays
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

COMMIT;

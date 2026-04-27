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

ALTER TABLE IF EXISTS public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holidays_public_select ON public.holidays;
CREATE POLICY holidays_public_select ON public.holidays
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS holidays_public_insert ON public.holidays;
CREATE POLICY holidays_public_insert ON public.holidays
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS holidays_public_update ON public.holidays;
CREATE POLICY holidays_public_update ON public.holidays
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS holidays_public_delete ON public.holidays;
CREATE POLICY holidays_public_delete ON public.holidays
  FOR DELETE
  USING (auth.role() = 'authenticated');

COMMIT;

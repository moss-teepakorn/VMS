ALTER TABLE payment_cycle_configs
  ADD COLUMN IF NOT EXISTS early_full_year_discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_full_year_discount_deadline date;

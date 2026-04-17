-- Track whether a violation fine has already been consumed into an invoice.
-- Closed violations can be billed exactly once and linked to a fee record.

alter table if exists public.violations
  add column if not exists fee_billed_id uuid references public.fees(id) on delete set null,
  add column if not exists fee_billed_at timestamptz;

create index if not exists idx_violations_fee_billed_id on public.violations(fee_billed_id);
create index if not exists idx_violations_status_billed on public.violations(status, fee_billed_at);

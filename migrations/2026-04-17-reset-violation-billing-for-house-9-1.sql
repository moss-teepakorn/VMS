-- One-off data reset for house_no 9/1
-- Goal: allow recalculation of violation fines from closed violations.
-- This script clears violation billing markers and resets invoice violation amounts.

begin;

with target_house as (
  select id
  from public.houses
  where house_no = '9/1'
  limit 1
)
update public.violations v
set
  fee_billed_id = null,
  fee_billed_at = null
from target_house th
where v.house_id = th.id
  and v.status = 'closed';

with target_house as (
  select id
  from public.houses
  where house_no = '9/1'
  limit 1
)
update public.fees f
set
  fee_violation = 0,
  note = case
    when coalesce(f.note, '') = '' then null
    else f.note || ' | reset violation charge for recalculation 2026-04-17'
  end
from target_house th
where f.house_id = th.id
  and f.status <> 'cancelled';

commit;

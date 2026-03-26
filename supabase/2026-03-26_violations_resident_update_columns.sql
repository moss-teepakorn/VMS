-- Add resident update fields for violations workflow
alter table violations
  add column if not exists resident_note text,
  add column if not exists resident_updated_at timestamptz;

-- Optional: normalize status values that represent in-progress variants
update violations
set status = 'in_progress'
where status in ('inprogress', 'in-progress', 'processing');

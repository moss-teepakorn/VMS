-- ============================================================
-- Greenfield VMS — Database Schema v2.2 (Combined)
-- schema_v2.1 + add_3_tables (v2.2)
-- วิธีใช้: Copy ทั้งหมด วางใน Supabase SQL Editor กด Run
-- ============================================================

-- ── 2. HOUSES (ข้อมูลบ้าน) ──────────────────────────────────────────
create table if not exists houses (
  id              uuid    primary key default gen_random_uuid(),
  house_no        text    not null,
  soi             text,
  address         text,
  owner_name      text,
  resident_name   text,
  contact_name    text,
  phone           text,
  line_id         text,
  email           text,
  status          text    default 'normal',
  -- normal / overdue / suspended / lawsuit
  house_type      text    default 'อยู่เอง',
  -- อยู่เอง / เช่า / ว่าง
  area_sqw        numeric default 0,
  fee_rate        numeric default 10,
  -- annual_fee = fee_rate × 12 × area_sqw (คำนวณอัตโนมัติ)
  annual_fee      numeric generated always as (fee_rate * 12 * area_sqw) stored,
  note            text,
  created_at      timestamptz default now()
);

-- ── 3. PROFILES (ผู้ใช้งาน) ────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  password_hash text not null,
  full_name  text,
  email      text,
  role       text    default 'resident',
  -- admin / resident
  house_id   uuid    references houses(id),
  phone      text,
  avatar_url text,
  is_active  boolean default true,
  failed_login_count int default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ── 4. VEHICLES (ยานพาหนะ) ─────────────────────────────────────────
create table if not exists vehicles (
  id               uuid primary key default gen_random_uuid(),
  house_id         uuid references houses(id) on delete cascade,
  license_plate    text not null,
  province         text,
  brand            text,
  model            text,
  color            text,
  vehicle_type     text default 'car',
  -- car / motorcycle / other
  parking_location text default 'ในบ้าน',
  -- ในบ้าน / หน้าบ้าน / ส่วนกลาง
  parking_lock_no  text,
  parking_fee      numeric default 0,
  status           text    default 'active',
  -- active / pending / removed
  note             text,
  created_at       timestamptz default now()
);

-- ── VIEW: สรุปยอดรถและค่าใช้จ่ายต่อบ้าน ────────────────────────────
create or replace view house_vehicle_summary as
select
  h.id                                         as house_id,
  h.house_no,
  h.soi,
  count(v.id)                                  as total_vehicles,
  count(v.id) filter (
    where v.parking_location = 'ส่วนกลาง'
    and v.status = 'active'
  )                                             as vehicles_common_parking,
  count(v.id) filter (
    where v.status = 'active'
  )                                             as active_vehicles
from houses h
left join vehicles v on v.house_id = h.id
group by h.id, h.house_no, h.soi;

-- ── 5. FEES (ใบแจ้งหนี้) ────────────────────────────────────────────
create table if not exists fees (
  id                  uuid    primary key default gen_random_uuid(),
  house_id            uuid    references houses(id) on delete cascade,
  year                int     not null,
  period              text    default 'full_year',
  -- first_half / second_half / full_year
  invoice_date        date,
  due_date            date,
  status              text    default 'unpaid',
  -- unpaid / pending / paid / overdue
  fee_common          numeric default 0,
  fee_parking         numeric default 0,
  fee_waste           numeric default 0,
  fee_overdue_common  numeric default 0,
  fee_overdue_fine    numeric default 0,
  fee_overdue_notice  numeric default 0,
  fee_fine            numeric default 0,
  fee_notice          numeric default 0,
  fee_violation       numeric default 0,
  fee_other           numeric default 0,
  total_amount        numeric generated always as (
    fee_common + fee_parking + fee_waste +
    fee_overdue_common + fee_overdue_fine + fee_overdue_notice +
    fee_fine + fee_notice + fee_violation + fee_other
  ) stored,
  note                text,
  created_at          timestamptz default now()
);

-- ── 6. PAYMENTS (บันทึกการชำระเงิน) ────────────────────────────────
create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  fee_id         uuid references fees(id) on delete cascade,
  house_id       uuid references houses(id),
  amount         numeric     not null,
  payment_method text        default 'transfer',
  -- transfer / cash / qr
  slip_url       text,
  paid_at        timestamptz not null default now(),
  verified_by    uuid        references profiles(id),
  verified_at    timestamptz,
  note           text
);

-- ── 7. ISSUES (แจ้งปัญหา) ───────────────────────────────────────────
create table if not exists issues (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid references houses(id) on delete cascade,
  title       text not null,
  detail      text,
  category    text,
  -- ไฟฟ้า / ประปา / ถนน / ความสะอาด / ความปลอดภัย / อื่นๆ
  status      text default 'pending',
  -- pending / in_progress / resolved / closed
  image_url   text,
  admin_note  text,
  rating      int  check (rating between 1 and 5),
  rating_note text,
  resolved_at timestamptz,
  created_at  timestamptz default now()
);

-- ── 8. ISSUE_LOGS (Timeline การแก้ไขปัญหา) ─────────────────────────
create table if not exists issue_logs (
  id        uuid primary key default gen_random_uuid(),
  issue_id  uuid references issues(id) on delete cascade,
  logged_by uuid references profiles(id),
  action    text not null,
  image_url text,
  logged_at timestamptz default now()
);

-- ── 9. VIOLATIONS (กระทำผิด) ────────────────────────────────────────
create table if not exists violations (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid references houses(id) on delete cascade,
  type        text not null,
  detail      text,
  occurred_at date,
  image_url   text,
  status      text default 'pending',
  -- pending / resolved / cancelled
  due_date    date,
  admin_note  text,
  created_at  timestamptz default now()
);

-- ── 10. ANNOUNCEMENTS (ประกาศ) ──────────────────────────────────────
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text,
  type       text    default 'normal',
  -- urgent / normal / info
  image_url  text,
  is_pinned  boolean default false,
  created_by uuid    references profiles(id),
  created_at timestamptz default now()
);

-- ── 11. TECHNICIANS (ทำเนียบช่าง) ──────────────────────────────────
create table if not exists technicians (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text,
  line_id      text,
  rating       numeric default 0,
  review_count int     default 0,
  status       text    default 'pending',
  -- pending / approved / suspended
  suggested_by uuid    references profiles(id),
  avatar_url   text,
  note         text,
  created_at   timestamptz default now()
);

-- ── 12. TECHNICIAN_SERVICES (บริการช่าง) ───────────────────────────
create table if not exists technician_services (
  id         uuid primary key default gen_random_uuid(),
  tech_id    uuid    references technicians(id) on delete cascade,
  skill      text    not null,
  price_min  numeric default 0,
  price_max  numeric default 0,
  price_note text
);

-- ── 13. MARKETPLACE (ตลาดชุมชน) ────────────────────────────────────
create table if not exists marketplace (
  id           uuid primary key default gen_random_uuid(),
  house_id     uuid references houses(id),
  title        text not null,
  detail       text,
  category     text,
  listing_type text    default 'sell',
  -- sell / free / rent / wanted
  price        numeric default 0,
  contact      text,
  image_url    text,
  status       text    default 'pending',
  -- pending / approved / sold / cancelled
  created_at   timestamptz default now()
);

-- ── 14. WORK_REPORTS (ผลงานนิติ) ────────────────────────────────────
create table if not exists work_reports (
  id           uuid    primary key default gen_random_uuid(),
  month        int     not null check (month between 1 and 12),
  year         int     not null,
  category     text    not null,
  -- บำรุงรักษา / ความสะอาด / ความปลอดภัย / กิจกรรม / สิ่งแวดล้อม
  summary      text    not null,
  detail       text,
  image_urls   text[]  default '{}',
  is_published boolean default false,
  created_by   uuid    references profiles(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (month, year)
);

-- ── 15. AUDIT_LOGS (บันทึกการเข้าใช้งาน) ───────────────────────────
create table if not exists audit_logs (
  id           uuid    primary key default gen_random_uuid(),
  user_id      uuid    references profiles(id) on delete set null,
  username     text    not null,
  role         text,
  action       text    not null,
  status       text    not null default 'success',
  -- success / failed
  acted_at     timestamptz default now(),
  ip_address   text,
  user_agent   text,
  target_table text,
  target_id    uuid,
  detail       text
);

create index if not exists idx_audit_logs_acted_at on audit_logs (acted_at desc);
create index if not exists idx_audit_logs_user_id  on audit_logs (user_id);
create index if not exists idx_audit_logs_action   on audit_logs (action);

-- ── 16. SYSTEM_CONFIG (ตั้งค่าระบบ — แทน settings) ────────────────
create table if not exists system_config (
  id                      uuid    primary key default gen_random_uuid(),
  -- Section 1: ข้อมูลนิติบุคคล
  village_name            text    default 'The Greenfield',
  juristic_name           text    default 'นิติบุคคลหมู่บ้านเดอะกรีนฟิลด์',
  juristic_phone          text    default '02-123-4567',
  juristic_email          text    default 'niti@greenfield.co.th',
  bank_name               text    default 'กสิกรไทย',
  bank_account_no         text,
  bank_account_name       text    default 'นิติบุคคลหมู่บ้าน เดอะกรีนฟิลด์',
  -- Section 2: การคำนวณค่าส่วนกลาง
  fee_rate_per_sqw        numeric default 85,
  fee_periods_per_year    int     default 2,
  fee_due_day             int     default 31,
  waste_fee_per_period    numeric default 100,
  parking_fee_per_vehicle numeric default 200,
  early_pay_discount_pct  numeric default 3,
  overdue_fine_pct        numeric default 10,
  overdue_grace_days      int     default 30,
  notice_fee              numeric default 200,
  invoice_message         text    default 'กรุณาชำระภายในวันที่กำหนด หากพ้นกำหนดจะคิดค่าปรับ 10%',
  -- Section 3: โซน / เฟส
  zone_count              int     default 2,
  total_houses            int     default 128,
  common_parking_slots    int     default 30,
  -- Section 4: ตั้งค่าระบบ
  enable_marketplace      boolean default true,
  enable_technicians      boolean default true,
  date_format             text    default 'DD/MM/YYYY (พ.ศ.)',
  system_language         text    default 'ภาษาไทย',
  updated_at              timestamptz default now(),
  updated_by              uuid    references profiles(id)
);

insert into system_config default values;

-- VIEW: public config สำหรับ resident
create or replace view public_config as
  select
    village_name, juristic_name, juristic_phone,
    bank_name, bank_account_no, bank_account_name,
    invoice_message, date_format, system_language
  from system_config
  limit 1;

-- ── TRIGGER: อัปเดต updated_at ─────────────────────────────────────
create or replace function update_config_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_config_updated
  before update on system_config
  for each row execute function update_config_timestamp();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────
alter table houses              enable row level security;
alter table profiles            enable row level security;
alter table vehicles            enable row level security;
alter table fees                enable row level security;
alter table payments            enable row level security;
alter table issues              enable row level security;
alter table issue_logs          enable row level security;
alter table violations          enable row level security;
alter table technicians         enable row level security;
alter table technician_services enable row level security;
alter table marketplace         enable row level security;
alter table announcements       enable row level security;
alter table work_reports        enable row level security;
alter table audit_logs          enable row level security;
alter table system_config       enable row level security;

-- Admin เข้าถึงได้ทุกอย่าง
create policy "admin_all" on houses
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all" on vehicles
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all" on fees
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all" on payments
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all" on issues
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all" on issue_logs
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all" on violations
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all_work_reports" on work_reports
  for all using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_read_audit_logs" on audit_logs
  for select using ((select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_all_config" on system_config
  for all using ((select role from profiles where id = auth.uid()) = 'admin');

-- ลูกบ้านเห็นเฉพาะข้อมูลบ้านตัวเอง
create policy "resident_own" on houses
  for select using (
    id = (select house_id from profiles where id = auth.uid())
  );
create policy "resident_own" on vehicles
  for select using (
    house_id = (select house_id from profiles where id = auth.uid())
  );
create policy "resident_own" on fees
  for select using (
    house_id = (select house_id from profiles where id = auth.uid())
  );
create policy "resident_own" on payments
  for select using (
    house_id = (select house_id from profiles where id = auth.uid())
  );
create policy "resident_own_issues" on issues
  for all using (
    house_id = (select house_id from profiles where id = auth.uid())
  );
create policy "resident_view_logs" on issue_logs
  for select using (
    issue_id in (
      select id from issues
      where house_id = (select house_id from profiles where id = auth.uid())
    )
  );

-- ทุกคนที่ login เห็นข้อมูลสาธารณะ
create policy "all_read" on announcements
  for select using (auth.uid() is not null);
create policy "all_read" on technicians
  for select using (status = 'approved');
create policy "all_read" on technician_services
  for select using (true);
create policy "all_read" on marketplace
  for select using (status = 'approved');
create policy "resident_published_work_reports" on work_reports
  for select using (is_published = true and auth.uid() is not null);

-- ============================================================
-- Schema v2.2 — 16 ตาราง + 2 Views พร้อมใช้งาน
-- ============================================================

alter table public.profiles enable row level security;
alter table public.houses enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "houses_read_authenticated" on public.houses;
create policy "houses_read_authenticated"
on public.houses
for select
to authenticated
using (true);

drop policy if exists "houses_write_admin" on public.houses;
create policy "houses_write_admin"
on public.houses
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
  )
);

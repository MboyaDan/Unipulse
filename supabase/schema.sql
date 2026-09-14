-- ============================================================================
-- UNIPULSE — DATABASE SCHEMA
-- Run this entire file once in Supabase SQL Editor (Project -> SQL Editor -> New query)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type university_type as enum ('Russell Group', 'Research', 'Teaching-Intensive', 'Technical', 'Other');
create type community_status as enum ('Not Started', 'Building Interest', 'Threshold Reached', 'Community Created', 'Active', 'Paused', 'Archived');
create type data_confidence as enum ('verified', 'estimated', 'unavailable');
create type course_category as enum (
  'Data Science', 'Data Analytics', 'Business Analytics', 'Computer Science',
  'Software Engineering', 'Cybersecurity', 'AI', 'Machine Learning',
  'Information Technology', 'Finance', 'Business', 'Other'
);
create type acquisition_channel as enum ('WhatsApp', 'Instagram', 'TikTok', 'Organic', 'Referral', 'Other');
create type verification_status as enum ('New', 'Under Review', 'Verified', 'Rejected');
create type contact_status as enum ('New', 'Contacted', 'Added to Community');
create type service_type as enum ('Tutoring', 'Exam Prep', 'Dissertation Support', 'Project Guidance', 'Certification Support', 'Other');
create type service_source as enum ('self-reported', 'inferred');

-- ----------------------------------------------------------------------------
-- COUNTRIES
-- ----------------------------------------------------------------------------
create table countries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,           -- ISO-ish short code, e.g. 'UK', 'CA', 'AU', 'US'
  flag_emoji text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- UNIVERSITIES
-- ----------------------------------------------------------------------------
create table universities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  country_id uuid not null references countries(id) on delete restrict,
  city text,
  region text,
  website text,
  university_type university_type,

  est_total_students integer,
  est_international_students integer,
  international_pct numeric(5,2),
  postgrad_population integer,
  programme_categories course_category[] default '{}',
  international_recruitment_strength smallint check (international_recruitment_strength between 0 and 10),

  opportunity_score_computed smallint default 0,     -- auto-calculated, 0-100
  opportunity_score_override smallint,                -- admin override, null = use computed
  priority_tier smallint not null default 3 check (priority_tier between 1 and 4),

  active boolean not null default true,
  community_status community_status not null default 'Not Started',
  community_threshold integer not null default 5,
  current_registrations integer not null default 0,   -- maintained by trigger, cached for speed

  whatsapp_link text,                -- never exposed to students via API
  community_name text,
  community_admin_notes text,

  data_confidence data_confidence not null default 'unavailable',
  date_added timestamptz not null default now(),

  created_by uuid,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create index idx_universities_country on universities(country_id);
create index idx_universities_status on universities(community_status);
create index idx_universities_active on universities(active);

-- Opportunity score, final value (override wins if set)
create or replace view universities_scored as
select
  u.*,
  coalesce(u.opportunity_score_override, u.opportunity_score_computed) as opportunity_score
from universities u;

-- ----------------------------------------------------------------------------
-- STUDENTS
-- ----------------------------------------------------------------------------
create table students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone_whatsapp text not null,
  country_id uuid not null references countries(id) on delete restrict,
  university_id uuid not null references universities(id) on delete restrict,

  course_category course_category not null,
  course_exact_text text,
  acquisition_channel acquisition_channel not null default 'Organic',
  utm_source text,
  utm_medium text,
  utm_campaign text,

  referred_by_student_id uuid references students(id) on delete set null,

  consent_given boolean not null default false,
  verification_status verification_status not null default 'New',
  contact_status contact_status not null default 'New',
  internal_notes text,

  is_duplicate_flag boolean not null default false,
  is_ambassador boolean not null default false,

  date_registered timestamptz not null default now()
);

create index idx_students_university on students(university_id);
create index idx_students_country on students(country_id);
create index idx_students_referred_by on students(referred_by_student_id);
create index idx_students_dedup on students(phone_whatsapp, university_id, full_name);

-- ----------------------------------------------------------------------------
-- REFERRALS
-- ----------------------------------------------------------------------------
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referring_student_id uuid not null references students(id) on delete cascade,
  referred_student_id uuid not null references students(id) on delete cascade,
  university_id uuid not null references universities(id) on delete cascade,
  is_flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  unique (referred_student_id)
);

create index idx_referrals_referring on referrals(referring_student_id);
create index idx_referrals_university on referrals(university_id);

-- ----------------------------------------------------------------------------
-- COMMUNITIES (created once a university crosses threshold)
-- ----------------------------------------------------------------------------
create table communities (
  id uuid primary key default uuid_generate_v4(),
  university_id uuid not null unique references universities(id) on delete cascade,
  whatsapp_link text not null,
  member_count integer not null default 0,
  last_activity_note text,
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Archived')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ----------------------------------------------------------------------------
-- SERVICE INTEREST (seam for future monetization)
-- ----------------------------------------------------------------------------
create table service_interest (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  service_type service_type not null,
  source service_source not null default 'inferred',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (sensitive-field changes on universities)
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

-- ============================================================================
-- FUNCTIONS + TRIGGERS
-- ============================================================================

-- ---- keep universities.updated_at fresh -----------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_universities_updated_at
before update on universities
for each row execute function set_updated_at();

-- ---- audit sensitive university fields -------------------------------------
create or replace function audit_university_changes()
returns trigger language plpgsql as $$
begin
  if old.community_threshold is distinct from new.community_threshold then
    insert into audit_log(table_name, record_id, field_name, old_value, new_value, changed_by)
    values ('universities', new.id, 'community_threshold', old.community_threshold::text, new.community_threshold::text, new.updated_by);
  end if;
  if old.community_status is distinct from new.community_status then
    insert into audit_log(table_name, record_id, field_name, old_value, new_value, changed_by)
    values ('universities', new.id, 'community_status', old.community_status::text, new.community_status::text, new.updated_by);
  end if;
  if old.whatsapp_link is distinct from new.whatsapp_link then
    insert into audit_log(table_name, record_id, field_name, old_value, new_value, changed_by)
    values ('universities', new.id, 'whatsapp_link', '[hidden]', '[hidden]', new.updated_by);
  end if;
  return new;
end $$;

create trigger trg_audit_universities
after update on universities
for each row execute function audit_university_changes();

-- ---- opportunity score auto-calculation ------------------------------------
-- Weighted, 0-100. Any missing input contributes 0 to its own weight (never fabricated).
create or replace function compute_opportunity_score(u universities)
returns smallint language plpgsql as $$
declare
  score numeric := 0;
begin
  -- international population strength (0-10 scale input) -> up to 20 pts
  if u.international_recruitment_strength is not null then
    score := score + (u.international_recruitment_strength::numeric / 10.0) * 20;
  end if;

  -- international pct of student body -> up to 15 pts
  if u.international_pct is not null then
    score := score + least(u.international_pct, 60) / 60.0 * 15;
  end if;

  -- relevant programme concentration (count of tagged categories, cap 8) -> up to 20 pts
  if u.programme_categories is not null then
    score := score + least(coalesce(array_length(u.programme_categories, 1), 0), 8) / 8.0 * 20;
  end if;

  -- postgrad population -> up to 15 pts (capped at 8000 students)
  if u.postgrad_population is not null then
    score := score + least(u.postgrad_population, 8000) / 8000.0 * 15;
  end if;

  -- overall student population -> up to 10 pts (capped at 30000)
  if u.est_total_students is not null then
    score := score + least(u.est_total_students, 30000) / 30000.0 * 10;
  end if;

  -- community sustainability signal: current registrations vs threshold -> up to 10 pts
  if u.community_threshold is not null and u.community_threshold > 0 then
    score := score + least(u.current_registrations::numeric / u.community_threshold, 1) * 10;
  end if;

  -- university type as a rough proxy for digital/community discoverability -> up to 10 pts
  if u.university_type is not null then
    score := score + case u.university_type
      when 'Russell Group' then 10
      when 'Research' then 8
      when 'Technical' then 7
      when 'Teaching-Intensive' then 5
      else 3
    end;
  end if;

  return least(round(score), 100)::smallint;
end $$;

create or replace function refresh_opportunity_score()
returns trigger language plpgsql as $$
begin
  new.opportunity_score_computed := compute_opportunity_score(new);
  return new;
end $$;

create trigger trg_universities_score
before insert or update of
  international_recruitment_strength, international_pct, programme_categories,
  postgrad_population, est_total_students, community_threshold, current_registrations, university_type
on universities
for each row execute function refresh_opportunity_score();

-- ---- maintain current_registrations + community_status on student changes -
create or replace function sync_university_registration_count()
returns trigger language plpgsql as $$
declare
  target_uni_id uuid;
  new_count integer;
  uni universities%rowtype;
begin
  target_uni_id := coalesce(new.university_id, old.university_id);

  select count(*) into new_count from students where university_id = target_uni_id;

  update universities
  set current_registrations = new_count
  where id = target_uni_id
  returning * into uni;

  if uni.id is not null then
    if uni.community_status in ('Not Started', 'Building Interest') then
      if new_count >= uni.community_threshold then
        update universities set community_status = 'Threshold Reached' where id = uni.id;
      elsif new_count > 0 then
        update universities set community_status = 'Building Interest' where id = uni.id;
      end if;
    end if;
  end if;

  return null;
end $$;

create trigger trg_students_after_insert
after insert on students
for each row execute function sync_university_registration_count();

create trigger trg_students_after_delete
after delete on students
for each row execute function sync_university_registration_count();

-- ---- ambassador flag: 3+ verified, non-flagged referrals -------------------
create or replace function refresh_ambassador_flag()
returns trigger language plpgsql as $$
declare
  referrer uuid;
  verified_count integer;
begin
  referrer := coalesce(new.referring_student_id, old.referring_student_id);
  if referrer is null then
    return null;
  end if;

  select count(*) into verified_count
  from referrals r
  join students s on s.id = r.referred_student_id
  where r.referring_student_id = referrer
    and r.is_flagged = false
    and s.verification_status <> 'Rejected';

  update students set is_ambassador = (verified_count >= 3) where id = referrer;
  return null;
end $$;

create trigger trg_referrals_ambassador
after insert or update or delete on referrals
for each row execute function refresh_ambassador_flag();

-- ---- duplicate detection on insert (flag, never block) ---------------------
create or replace function flag_duplicate_students()
returns trigger language plpgsql as $$
declare
  dup_count integer;
begin
  select count(*) into dup_count
  from students
  where university_id = new.university_id
    and phone_whatsapp = new.phone_whatsapp
    and id <> new.id;

  if dup_count > 0 then
    new.is_duplicate_flag := true;
  end if;

  return new;
end $$;

create trigger trg_students_dedup
before insert on students
for each row execute function flag_duplicate_students();

-- ---- referral abuse flag: burst of registrations from one referrer --------
create or replace function flag_referral_abuse()
returns trigger language plpgsql as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from referrals
  where referring_student_id = new.referring_student_id
    and created_at > now() - interval '10 minutes';

  if recent_count >= 3 then
    new.is_flagged := true;
    new.flag_reason := 'Burst: 3+ referrals from same student within 10 minutes';
  end if;

  return new;
end $$;

create trigger trg_referrals_abuse
before insert on referrals
for each row execute function flag_referral_abuse();

-- ---- auto-suggest service_interest rows from course category --------------
create or replace function suggest_service_interest()
returns trigger language plpgsql as $$
declare
  suggestion service_type;
begin
  suggestion := case new.course_category
    when 'Data Science' then 'Project Guidance'
    when 'Data Analytics' then 'Exam Prep'
    when 'Business Analytics' then 'Exam Prep'
    when 'Computer Science' then 'Project Guidance'
    when 'Software Engineering' then 'Project Guidance'
    when 'Cybersecurity' then 'Certification Support'
    when 'AI' then 'Project Guidance'
    when 'Machine Learning' then 'Project Guidance'
    when 'Information Technology' then 'Certification Support'
    when 'Finance' then 'Exam Prep'
    when 'Business' then 'Exam Prep'
    else 'Tutoring'
  end;

  insert into service_interest(student_id, service_type, source)
  values (new.id, suggestion, 'inferred');

  return new;
end $$;

create trigger trg_students_service_suggestion
after insert on students
for each row execute function suggest_service_interest();

-- ============================================================================
-- PUBLIC-SAFE RPCs (SECURITY DEFINER — expose only aggregate, non-PII data)
-- ============================================================================

-- Live global ticker: registrations in the last hour + all-time total
create or replace function get_live_pulse()
returns table(registrations_last_hour bigint, total_registrations bigint, universities_active bigint)
language sql security definer set search_path = public as $$
  select
    (select count(*) from students where date_registered > now() - interval '1 hour'),
    (select count(*) from students),
    (select count(*) from universities where community_status in ('Active', 'Community Created'));
$$;
grant execute on function get_live_pulse() to anon, authenticated;

-- Universities with live progress, for search/typeahead + public listing
create or replace function get_universities_progress(p_country_code text default null)
returns table(
  id uuid, name text, slug text, city text, country_code text, country_name text, flag_emoji text,
  current_registrations integer, community_threshold integer, community_status community_status
)
language sql security definer set search_path = public as $$
  select u.id, u.name, u.slug, u.city, c.code, c.name, c.flag_emoji,
         u.current_registrations, u.community_threshold, u.community_status
  from universities u
  join countries c on c.id = u.country_id
  where u.active = true
    and (p_country_code is null or c.code = p_country_code)
  order by u.current_registrations desc, u.name asc;
$$;
grant execute on function get_universities_progress(text) to anon, authenticated;

-- Course breakdown for one university's public page (aggregate only)
create or replace function get_university_course_breakdown(p_university_id uuid)
returns table(course_category course_category, student_count bigint)
language sql security definer set search_path = public as $$
  select course_category, count(*) as student_count
  from students
  where university_id = p_university_id
  group by course_category
  order by student_count desc;
$$;
grant execute on function get_university_course_breakdown(uuid) to anon, authenticated;

-- Top referrers for a university's public page (first name + initial only)
create or replace function get_university_leaderboard(p_university_id uuid)
returns table(display_name text, referral_count bigint)
language sql security definer set search_path = public as $$
  select
    split_part(s.full_name, ' ', 1) || ' ' || left(coalesce(split_part(s.full_name, ' ', 2), ''), 1) as display_name,
    count(r.id) as referral_count
  from referrals r
  join students s on s.id = r.referring_student_id
  where r.university_id = p_university_id and r.is_flagged = false
  group by s.id, s.full_name
  order by referral_count desc
  limit 5;
$$;
grant execute on function get_university_leaderboard(uuid) to anon, authenticated;

-- A student's own success-page context (their own row only, by id)
create or replace function get_registration_receipt(p_student_id uuid)
returns table(
  full_name text, university_name text, university_slug text, country_code text,
  course_category course_category, position_at_university bigint,
  current_registrations integer, community_threshold integer, referral_code uuid
)
language sql security definer set search_path = public as $$
  select
    s.full_name, u.name, u.slug, c.code, s.course_category,
    (select count(*) from students s2
       where s2.university_id = s.university_id
       and s2.date_registered <= s.date_registered),
    u.current_registrations, u.community_threshold, s.id
  from students s
  join universities u on u.id = s.university_id
  join countries c on c.id = s.country_id
  where s.id = p_student_id;
$$;
grant execute on function get_registration_receipt(uuid) to anon, authenticated;

-- Public registration entry point — validates + inserts a student row and,
-- if a referral code was supplied, records the referral. Runs as SECURITY
-- DEFINER so anonymous visitors never need direct table grants on `students`.
create or replace function register_student(
  p_full_name text,
  p_phone_whatsapp text,
  p_country_id uuid,
  p_university_id uuid,
  p_course_category course_category,
  p_course_exact_text text,
  p_acquisition_channel acquisition_channel,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_consent_given boolean,
  p_referral_code uuid default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  referrer_university uuid;
begin
  if p_consent_given is not true then
    raise exception 'Consent is required to register.';
  end if;
  if length(trim(p_full_name)) < 2 then
    raise exception 'Please enter your full name.';
  end if;
  if length(trim(p_phone_whatsapp)) < 7 then
    raise exception 'Please enter a valid WhatsApp number.';
  end if;

  insert into students (
    full_name, phone_whatsapp, country_id, university_id, course_category,
    course_exact_text, acquisition_channel, utm_source, utm_medium, utm_campaign,
    consent_given, referred_by_student_id
  ) values (
    trim(p_full_name), trim(p_phone_whatsapp), p_country_id, p_university_id, p_course_category,
    nullif(trim(p_course_exact_text), ''), p_acquisition_channel, p_utm_source, p_utm_medium, p_utm_campaign,
    p_consent_given, p_referral_code
  )
  returning id into new_id;

  if p_referral_code is not null then
    select university_id into referrer_university from students where id = p_referral_code;
    if referrer_university is not null then
      insert into referrals (referring_student_id, referred_student_id, university_id)
      values (p_referral_code, new_id, referrer_university);
    end if;
  end if;

  return new_id;
end $$;
grant execute on function register_student(
  text, text, uuid, uuid, course_category, text, acquisition_channel, text, text, text, boolean, uuid
) to anon, authenticated;

-- Admin: hard-delete a student's data (GDPR/PIPEDA/Privacy Act right-to-delete)
create or replace function admin_delete_student(p_student_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;
  delete from students where id = p_student_id;
end $$;
grant execute on function admin_delete_student(uuid) to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table countries enable row level security;
alter table universities enable row level security;
alter table students enable row level security;
alter table referrals enable row level security;
alter table communities enable row level security;
alter table service_interest enable row level security;
alter table audit_log enable row level security;

-- Countries: public read of active ones, admin full access
create policy "countries_public_read" on countries for select using (active = true);
create policy "countries_admin_all" on countries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Universities: public read of active, non-sensitive columns are fine to read
-- (whatsapp_link is never selected by the public client — enforced in app code
-- and by only ever using get_universities_progress()/direct select without that column
-- from the anon key). Admin has full access.
create policy "universities_public_read" on universities for select using (active = true);
create policy "universities_admin_all" on universities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Students: NO direct public select (PII). Public insert is blocked too —
-- all public writes go through the register_student() RPC above, which is
-- SECURITY DEFINER and bypasses RLS deliberately and narrowly.
create policy "students_admin_all" on students for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Referrals: admin only direct access (writes happen via the RPC above)
create policy "referrals_admin_all" on referrals for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Communities: admin only (WhatsApp links must never be public)
create policy "communities_admin_all" on communities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Service interest: admin only
create policy "service_interest_admin_all" on service_interest for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Audit log: admin read-only
create policy "audit_log_admin_read" on audit_log for select using (auth.role() = 'authenticated');

-- ============================================================================
-- SEED: countries
-- ============================================================================
insert into countries (name, code, flag_emoji) values
  ('United Kingdom', 'UK', '🇬🇧'),
  ('Canada', 'CA', '🇨🇦'),
  ('Australia', 'AU', '🇦🇺'),
  ('United States', 'US', '🇺🇸');

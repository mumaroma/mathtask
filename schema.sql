-- ============================================================
-- 수학 과제 앱 공간 · Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 Run
-- ============================================================

-- ── 1. 테이블 ────────────────────────────────────────────────

create table if not exists public.spaces (
  code          text primary key,                       -- 5자리 공간 코드
  owner         uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  teacher_name  text,
  created_at    timestamptz not null default now()
);

create table if not exists public.apps (
  id          uuid primary key default gen_random_uuid(),
  space_code  text not null references public.spaces(code) on delete cascade,
  title       text not null,
  html        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.visits (
  id            uuid primary key default gen_random_uuid(),
  space_code    text not null references public.spaces(code) on delete cascade,
  student_name  text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  space_code    text not null references public.spaces(code) on delete cascade,
  app_id        uuid references public.apps(id) on delete set null,
  app_title     text,
  student_name  text not null,
  image_path    text not null,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists apps_space_idx        on public.apps(space_code);
create index if not exists visits_space_idx      on public.visits(space_code, created_at desc);
create index if not exists submissions_space_idx on public.submissions(space_code, created_at desc);

-- ── 2. RLS 켜기 ──────────────────────────────────────────────

alter table public.spaces      enable row level security;
alter table public.apps        enable row level security;
alter table public.visits      enable row level security;
alter table public.submissions enable row level security;

-- 소유 확인 도우미
create or replace function public.owns_space(c text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.spaces s where s.code = c and s.owner = auth.uid());
$$;

-- ── 3. 정책 ──────────────────────────────────────────────────
-- 학생은 로그인하지 않습니다(anon). 그래서
--   · spaces / apps 는 누구나 읽기 가능 (코드를 알아야 쓸모가 있음)
--   · visits / submissions 는 누구나 넣을 수 있고, 읽기는 소유 교사만

drop policy if exists spaces_read   on public.spaces;
drop policy if exists spaces_insert on public.spaces;
drop policy if exists spaces_update on public.spaces;
drop policy if exists spaces_delete on public.spaces;

create policy spaces_read   on public.spaces for select using (true);
create policy spaces_insert on public.spaces for insert to authenticated with check (owner = auth.uid());
create policy spaces_update on public.spaces for update to authenticated using (owner = auth.uid());
create policy spaces_delete on public.spaces for delete to authenticated using (owner = auth.uid());

drop policy if exists apps_read on public.apps;
drop policy if exists apps_write on public.apps;
drop policy if exists apps_delete on public.apps;

create policy apps_read   on public.apps for select using (true);
create policy apps_write  on public.apps for insert to authenticated with check (public.owns_space(space_code));
create policy apps_delete on public.apps for delete to authenticated using (public.owns_space(space_code));

drop policy if exists visits_insert on public.visits;
drop policy if exists visits_read   on public.visits;

create policy visits_insert on public.visits for insert with check (true);
create policy visits_read   on public.visits for select to authenticated using (public.owns_space(space_code));

drop policy if exists subs_insert on public.submissions;
drop policy if exists subs_read   on public.submissions;

create policy subs_insert on public.submissions for insert with check (true);
create policy subs_read   on public.submissions for select to authenticated using (public.owns_space(space_code));

-- ── 4. 캡처 이미지 버킷 ──────────────────────────────────────
-- 파일 이름은 무작위라 주소를 모르면 찾을 수 없지만,
-- 주소를 아는 사람은 로그인 없이 볼 수 있는 공개 버킷입니다.

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;

drop policy if exists sub_upload on storage.objects;
drop policy if exists sub_read   on storage.objects;

create policy sub_upload on storage.objects for insert
  with check (bucket_id = 'submissions');
create policy sub_read on storage.objects for select
  using (bucket_id = 'submissions');

-- ============ FILE: supabase/migrations/0007_killswitch.sql ============
-- SiskueDes — Grendel aman: anon dilarang update/delete aspirasi (restrictive)
-- Run, lalu bilang "sukses" atau error.
alter table public.aspirasi force row level security;

create policy "blok anon update aspirasi" on public.aspirasi
  as restrictive for update to anon using (false);

create policy "blok anon delete aspirasi" on public.aspirasi
  as restrictive for delete to anon using (false);

-- Cek status RLS kalau mau
select relname, relrowsecurity as rls_aktif, relforcerowsecurity as rls_paksa
from pg_class where relname = 'aspirasi';
-- ============ FILE: supabase/migrations/0005_aspirasi_rls.sql ============
-- SiskueDes — Rebuild bersih policy aspirasi (public hanya bisa INSERT)
-- SQL Editor → Run. Salin 2 hasil SELECT (grid kecil) ke chat.
select tablename, policyname, cmd, roles::text as untuk_role
from pg_policies
where schemaname = 'public' and tablename = 'aspirasi';

select relname as tabel, relrowsecurity as rls_aktif, relforcerowsecurity as rls_force
from pg_class
where relname in ('aspirasi', 'spp', 'transaksi');

-- --- REBUILD ---
alter table public.aspirasi enable row level security;
alter table public.aspirasi force row level security;

drop policy if exists "public insert aspirasi" on public.aspirasi;
drop policy if exists "staff read aspirasi" on public.aspirasi;
drop policy if exists "staff update aspirasi" on public.aspirasi;

create policy "warga insert aspirasi" on public.aspirasi
  for insert to anon, authenticated with check (true);

create policy "staff read aspirasi" on public.aspirasi
  for select to authenticated using (public.is_staff());

create policy "staff update aspirasi" on public.aspirasi
  for update to authenticated using (public.is_staff());

create policy "staff delete aspirasi" on public.aspirasi
  for delete to authenticated using (public.is_staff());
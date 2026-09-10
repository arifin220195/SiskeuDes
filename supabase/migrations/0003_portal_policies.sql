-- ============ FILE: supabase/migrations/0003_portal_policies.sql ============
-- SiskueDes — Portal transparansi perlu data publik
-- SQL Editor → Run
create policy "public read pendapatan" on public.pendapatan for select to anon, authenticated using (true);
create policy "public read rekening" on public.rekening for select to anon, authenticated using (true);
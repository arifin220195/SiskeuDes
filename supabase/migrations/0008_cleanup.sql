-- ============ FILE: supabase/migrations/0008_cleanup.sql ============
-- SkueDes — Bersihkan grendel uji (0007) karena RLS terbukti aman
-- SQL Editor → Run
drop policy if exists "blok anon update aspirasi" on public.aspirasi;
drop policy if exists "blok anon delete aspirasi" on public.aspirasi;
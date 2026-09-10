-- ============ FILE: supabase/migrations/0004_fix_rls.sql ============
-- SiskueDes — Diagnosa + perbaikan RLS aspirasi (dan pengaman ekstra)
-- SQL Editor → Run → salin hasil SELECT (satu baris tabel) ke chat
select
  c.relname,
  c.relrowsecurity  as rls_aktif,
  c.relforcerowsecurity as rls_force,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as jumlah_policy
from pg_class c
where c.relname in ('aspirasi','spp','transaksi','bkk','pendapatan','rekening')
order by c.relname;

-- Pengaman ekstra: aktifkan RLS + FORCE (RLS jalan walau owner sekalipun)
alter table public.aspirasi enable row level security;
alter table public.aspirasi force row level security;
alter table public.spp force row level security;
alter table public.transaksi force row level security;
alter table public.bkk force row level security;
alter table public.proyek force row level security;
alter table public.progres force row level security;
alter table public.pendapatan force row level security;
alter table public.rekening force row level security;
alter table public.dokumen force row level security;
alter table public.apbdes force row level security;
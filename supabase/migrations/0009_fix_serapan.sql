-- ============ FILE: supabase/migrations/0009_fix_serapan.sql ============
-- SiskueDes — Perbaikan v_serapan_bidang: pagu tak ter-ganda-ganda oleh JOIN SPP
-- SQL Editor → Run
create or replace view public.v_serapan_bidang as
with pagu_per_bidang as (
  select bidang, apbdes_id, sum(pagu) as pagu
  from public.rekening
  group by bidang, apbdes_id
)
select
  p.bidang,
  p.apbdes_id,
  p.pagu,
  coalesce(sum(s.netto), 0) as realisasi
from pagu_per_bidang p
left join public.rekening r
  on r.bidang = p.bidang and r.apbdes_id = p.apbdes_id
left join public.spp s
  on s.rekening_id = r.id and s.status in ('disetujui', 'terbayar')
group by p.bidang, p.apbdes_id, p.pagu;
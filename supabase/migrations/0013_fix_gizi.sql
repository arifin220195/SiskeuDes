-- ============ FILE: supabase/migrations/0013_fix_gizi.sql ============
-- Perbaiki v_gizi_per_pos: bandingkan penimbangan terakhir vs sebelumnya
-- SQL Editor -> + New query -> Run
create or replace view public.v_gizi_per_pos as
with ranked as (
  select t.balita_id, t.berat_kg, b.posyandu_id,
         row_number() over (partition by t.balita_id order by t.tanggal desc) as rn
  from public.penimbangan t
  join public.balita b on b.id = t.balita_id
), grip as (
  select r.balita_id, r.posyandu_id,
         max(r.berat_kg) filter (where r.rn = 1) as berat_latest,
         max(r.berat_kg) filter (where r.rn = 2) as berat_prev
  from ranked r
  where r.rn <= 2
  group by r.balita_id, r.posyandu_id
)
select
  p.nama as posyandu,
  count(distinct b.id) as jumlah_balita,
  count(g.balita_id) as terdata,
  count(*) filter (where g.berat_prev is not null and g.berat_latest > g.berat_prev) as naik,
  count(*) filter (where g.berat_prev is not null and g.berat_latest < g.berat_prev) as turun,
  count(*) filter (where g.berat_prev is null) as baru
from public.posyandu p
left join public.balita b on b.posyandu_id = p.id
left join grip g on g.balita_id = b.id
group by p.id, p.nama
order by p.nama;
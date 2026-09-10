-- ============ FILE: supabase/migrations/0012_pelayanan.sql ============
-- ============================================================
-- SiskueDes — Modul Pelayanan Warga
-- Posyandu balita, Lansia, Penyuluhan, & Sensus Penduduk
-- Staf kelola; warga lihat agregat (view) di portal
-- SQL Editor -> + New query -> Run
-- ============================================================

-- ---------- ENUM ----------
create type jenis_kelamin as enum ('L', 'P');

-- ---------- POSYANDU ----------
create table public.posyandu (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  ketua_kader text not null,
  lokasi text not null,
  jadwal text not null default 'Tanggal 15',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.balita (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu (id) on delete cascade,
  nama text not null,
  jenis_kelamin jenis_kelamin not null,
  tanggal_lahir date not null,
  nama_ortu text not null,
  alamat text not null,
  nik text,
  created_at timestamptz not null default now()
);

create table public.penimbangan (
  id uuid primary key default gen_random_uuid(),
  balita_id uuid not null references public.balita (id) on delete cascade,
  tanggal date not null,
  berat_kg numeric(5,2) not null,
  tinggi_cm numeric(5,1),
  catatan text,
  created_at timestamptz not null default now()
);

-- ---------- LANSIA ----------
create table public.lansia (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jenis_kelamin jenis_kelamin not null,
  tanggal_lahir date not null,
  nik text,
  alamat text not null,
  kondisi text not null default 'Sehat' check (kondisi in ('Sehat', 'Butuh Pendampingan', 'Perhatian Khusus')),
  catatan text,
  created_at timestamptz not null default now()
);

create table public.pelayanan_lansia (
  id uuid primary key default gen_random_uuid(),
  lansia_id uuid not null references public.lansia (id) on delete cascade,
  tanggal date not null,
  jenis_pemeriksaan text not null,
  hasil text,
  catatan text,
  created_at timestamptz not null default now()
);

-- ---------- PENYULUHAN ----------
create table public.penyuluhan (
  id uuid primary key default gen_random_uuid(),
  topik text not null,
  tanggal date not null,
  lokasi text not null,
  sasaran text not null,
  jumlah_peserta integer not null default 0,
  petugas text not null,
  catatan text,
  created_at timestamptz not null default now()
);

-- ---------- SENSUS PENDUDUK ----------
create table public.penduduk (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jenis_kelamin jenis_kelamin not null,
  tanggal_lahir date not null,
  nik text unique,
  alamat text not null,
  rt text,
  rw text,
  pekerjaan text,
  catatan text,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.posyandu enable row level security;
alter table public.balita enable row level security;
alter table public.penimbangan enable row level security;
alter table public.lansia enable row level security;
alter table public.pelayanan_lansia enable row level security;
alter table public.penyuluhan enable row level security;
alter table public.penduduk enable row level security;

do $$
declare t text;
begin
  foreach t in array array['posyandu','balita','penimbangan','lansia','pelayanan_lansia','penyuluhan','penduduk']
  loop
    execute format('create policy "staff read %s" on public.%I for select to authenticated using (public.is_staff());', t, t);
    execute format('create policy "staff write %s" on public.%I for all to authenticated using (public.is_staff());', t, t);
  end loop;
end $$;

-- ---------- VIEW AGREGAT (PUBLIK) ----------
create view public.v_kesehatan_ringkas as
with gizi as (
  select balita_id, tanggal,
         berat_kg,
         lag(berat_kg) over (partition by balita_id order by tanggal) as prev
  from public.penimbangan
)
select
  (select count(*) from public.balita) as total_balita,
  (select count(*) from public.penimbangan) as total_penimbangan,
  (select count(*) from gizi where prev is not null and berat_kg > prev) as balita_naik,
  (select count(*) from gizi where prev is not null and berat_kg < prev) as balita_turun,
  (select count(*) from gizi where prev is null) as balita_baru,
  (select count(*) from public.lansia) as total_lansia,
  (select count(*) from public.penyuluhan) as total_penyuluhan,
  coalesce((select sum(jumlah_peserta) from public.penyuluhan), 0) as total_peserta_penyuluhan,
  (select count(*) from public.penduduk) as total_penduduk;

create view public.v_gizi_per_pos as
with last_penimbangan as (
  select penimbangan.balita_id, penimbangan.tanggal, penimbangan.berat_kg
  from public.penimbangan
  join (select balita_id, max(tanggal) as mx from public.penimbangan group by balita_id) m
    on m.balita_id = penimbangan.balita_id and m.mx = penimbangan.tanggal
), perbandingan as (
  select lp.balita_id, lp.berat_kg,
         lag(lp.berat_kg) over (partition by lp.balita_id order by lp.tanggal) as prev,
         b.posyandu_id
  from last_penimbangan lp
  join public.balita b on b.id = lp.balita_id
)
select
  p.nama as posyandu,
  count(distinct b.id) as jumlah_balita,
  count(*) filter (where pb.berat_kg is not null) as terdata,
  count(*) filter (where pb.berat_kg > pb.prev) as naik,
  count(*) filter (where pb.berat_kg < pb.prev) as turun,
  count(*) filter (where pb.prev is null) as baru
from public.posyandu p
left join public.balita b on b.posyandu_id = p.id
left join perbandingan pb on pb.balita_id = b.id
group by p.id, p.nama
order by p.nama;

-- ---------- DATA CONTOH ----------
insert into public.posyandu (nama, ketua_kader, lokasi, jadwal) values
  ('Posyandu Melati', 'Ibu Sri Winarni', 'Balai RW 03', 'Tanggal 15'),
  ('Posyandu Anggrek', 'Ibu Endang S', 'Posyandu RT 05', 'Tanggal 20');

insert into public.balita (posyandu_id, nama, jenis_kelamin, tanggal_lahir, nama_ortu, alamat, nik) values
  ((select id from public.posyandu where nama = 'Posyandu Melati'), 'Bima Putra', 'L', '2023-02-10', 'Slamet', 'Dusun Krajan RT 01', '3201012302210001'),
  ((select id from public.posyandu where nama = 'Posyandu Melati'), 'Aisyah Salsa', 'P', '2023-08-05', 'Agus Wirawan', 'Dusun Krajan RT 02', '3201010509230004'),
  ((select id from public.posyandu where nama = 'Posyandu Anggrek'), 'Cahyo Nugroho', 'L', '2022-11-20', 'Budi Santoso', 'Dusun Kedung RT 05', '3201012011220007');

insert into public.penimbangan (balita_id, tanggal, berat_kg, tinggi_cm, catatan) values
  ((select id from public.balita where nama = 'Bima Putra'), '2025-01-15', 9.40, 74.0, null),
  ((select id from public.balita where nama = 'Bima Putra'), '2025-02-15', 9.80, 75.0, null),
  ((select id from public.balita where nama = 'Bima Putra'), '2025-03-15', 10.10, 76.5, null),
  ((select id from public.balita where nama = 'Aisyah Salsa'), '2025-01-15', 7.80, 68.0, null),
  ((select id from public.balita where nama = 'Aisyah Salsa'), '2025-02-15', 7.40, 68.5, 'Berat turun, dianjurkan MPASI lebih'),
  ((select id from public.balita where nama = 'Aisyah Salsa'), '2025-03-15', 7.90, 70.0, null),
  ((select id from public.balita where nama = 'Cahyo Nugroho'), '2025-01-20', 12.30, 82.0, null),
  ((select id from public.balita where nama = 'Cahyo Nugroho'), '2025-02-20', 12.50, 83.0, null),
  ((select id from public.balita where nama = 'Cahyo Nugroho'), '2025-03-20', 12.70, 84.0, null);

insert into public.lansia (nama, jenis_kelamin, tanggal_lahir, nik, alamat, kondisi, catatan) values
  ('Mbah Wiryo', 'L', '1950-03-12', '3201011203500001', 'Dusun Krajan RT 01', 'Perhatian Khusus', 'Hipertensi, pantau rutin'),
  ('Mbah Surti', 'P', '1955-07-30', '3201013007550002', 'Dusun Krajan RT 03', 'Sehat', null),
  ('Mbah Diman', 'L', '1948-01-05', '3201010501480003', 'Dusun Kedung RT 05', 'Butuh Pendampingan', 'Jalan terbantu tongkat');

insert into public.pelayanan_lansia (lansia_id, tanggal, jenis_pemeriksaan, hasil, catatan) values
  ((select id from public.lansia where nama = 'Mbah Wiryo'), '2025-03-10', 'Tekanan darah', '150/90', 'Dianjurkan rutin minum obat'),
  ((select id from public.lansia where nama = 'Mbah Surti'), '2025-03-10', 'Cek umum', 'Normal', null),
  ((select id from public.lansia where nama = 'Mbah Diman'), '2025-03-10', 'Cek umum', 'Normal', 'Latihan jalan teratur');

insert into public.penyuluhan (topik, tanggal, lokasi, sasaran, jumlah_peserta, petugas, catatan) values
  ('Gizi Balita & Pola MPASI', '2025-03-15', 'Balai Dusun Krajan', 'Ibu balita', 32, 'Ibu Sri Winarni', 'Bersama kegiatan posyandu'),
  ('Penanganan DBD Musim Hujan', '2025-02-20', 'Balai Desa', 'Seluruh warga', 58, 'Bidan Desa + Kader', 'Petugas: buang airgen, 3M');

insert into public.penduduk (nama, jenis_kelamin, tanggal_lahir, nik, alamat, rt, rw, pekerjaan) values
  ('Slamet', 'L', '1989-04-12', '3201011204890009', 'Dusun Krajan RT 01', '01', '01', 'Petani'),
  ('Nita Marlina', 'P', '1992-09-03', '3201010309920011', 'Dusun Krajan RT 01', '01', '01', 'Ibu Rumah Tangga'),
  ('Agus Wirawan', 'L', '1985-02-25', '3201012502850013', 'Dusun Krajan RT 02', '02', '01', 'Buruh Tani'),
  ('Budi Santoso', 'L', '1978-11-15', '3201011511780017', 'Dusun Kedung RT 05', '05', '02', 'Pedagang'),
  ('Sri Lestari', 'P', '2000-06-08', '3201010806000021', 'Dusun Kedung RT 05', '05', '02', 'Mahasiswa'),
  ('Joko Priyono', 'L', '1970-01-30', '3201013001700022', 'Dusun Krajan RT 03', '03', '01', 'Guru');
-- ============ FILE: supabase/migrations/0001_schema.sql ============
-- ============================================================
-- SiskueDes Schema — v1
-- Jalankan file ini di Supabase → SQL Editor → Run
-- ============================================================

-- ---------- ENUMS ----------
create type peran as enum ('kades', 'sekdes', 'bendahara');
create type sumber_dana as enum ('DDS', 'ADD', 'PADes', 'BHP', 'Bantuan');
create type bidang as enum (
  'Penyelenggaraan Pemerintahan',
  'Pelaksanaan Pembangunan',
  'Pembinaan Kemasyarakatan',
  'Pemberdayaan Masyarakat',
  'Penanggulangan Bencana'
);
create type status_spp as enum ('draft', 'diajukan', 'disetujui', 'ditolak', 'terbayar');
create type status_proyek as enum ('pengadaan', 'berjalan', 'selesai', 'pho');
create type status_aspirasi as enum ('baru', 'diproses', 'selesai');

-- ---------- PROFILES (extends auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  jabatan text not null default 'Bendahara',
  role peran not null default 'bendahara',
  desa text not null default 'Tegal Rejo',
  kecamatan text not null default 'Sukaresmi',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create function public.get_role()
returns peran
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('kades', 'sekdes', 'bendahara')
  )
$$;

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama, jabatan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', ''),
    coalesce(new.raw_user_meta_data ->> 'jabatan', 'Bendahara')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Policies: user baca dirinya; staff baca semua
create policy "user read self" on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "staff read all" on public.profiles for select to authenticated
  using (public.is_staff());
create policy "user update self" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- APBDES ----------
create table public.apbdes (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null unique,
  total_pendapatan numeric(15,2) not null default 0,
  total_belanja numeric(15,2) not null default 0,
  total_pembiayaan numeric(15,2) not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.apbdes enable row level security;

create policy "public read apbdes" on public.apbdes for select to anon, authenticated using (true);
create policy "staff write apbdes" on public.apbdes for all to authenticated using (public.is_staff());

-- ---------- REKENING (Chart of Accounts) ----------
create table public.rekening (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  bidang bidang not null,
  jenis text not null check (jenis in ('pendapatan', 'belanja')),
  pagu numeric(15,2) not null default 0,
  apbdes_id uuid not null references public.apbdes (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.rekening enable row level security;

create policy "staff read rekening" on public.rekening for select to authenticated using (public.is_staff());
create policy "staff write rekening" on public.rekening for all to authenticated using (public.is_staff());

-- ---------- PENDAPATAN ----------
create table public.pendapatan (
  id uuid primary key default gen_random_uuid(),
  apbdes_id uuid not null references public.apbdes (id) on delete cascade,
  sumber sumber_dana not null,
  uraian text not null,
  target numeric(15,2) not null default 0,
  terealisasi numeric(15,2) not null default 0,
  tanggal timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.pendapatan enable row level security;

create policy "staff read pendapatan" on public.pendapatan for select to authenticated using (public.is_staff());
create policy "staff write pendapatan" on public.pendapatan for all to authenticated using (public.is_staff());

-- ---------- SPP (Surat Permintaan Pembayaran) ----------
create table public.spp (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  tanggal date not null,
  apbdes_id uuid not null references public.apbdes (id) on delete cascade,
  rekening_id uuid not null references public.rekening (id) on delete cascade,
  ppkd_nama text not null,
  ppkd_jabatan text not null,
  uraian text not null,
  rekanan text,
  sumber sumber_dana not null,
  nilai_bruto numeric(15,2) not null default 0,
  ppn numeric(15,2) not null default 0,
  pph21 numeric(15,2) not null default 0,
  pph22 numeric(15,2) not null default 0,
  pph23 numeric(15,2) not null default 0,
  netto numeric(15,2) not null default 0,
  status status_spp not null default 'draft',
  dibuat_oleh uuid references public.profiles (id),
  verifikator uuid references public.profiles (id),
  approver uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.spp enable row level security;

create policy "staff read spp" on public.spp for select to authenticated using (public.is_staff());
create policy "staff write spp" on public.spp for all to authenticated using (public.is_staff());

-- ---------- BKK (Bukti Kas Keluar) ----------
create table public.bkk (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  tanggal date not null,
  spp_id uuid references public.spp (id) on delete set null,
  uraian text not null,
  jumlah numeric(15,2) not null default 0,
  dibayar_kepada text not null,
  no_ntpn text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.bkk enable row level security;

create policy "staff read bkk" on public.bkk for select to authenticated using (public.is_staff());
create policy "staff write bkk" on public.bkk for all to authenticated using (public.is_staff());

-- ---------- TRANSAKSI (BKU journal) ----------
create table public.transaksi (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis text not null check (jenis in ('masuk', 'keluar')),
  uraian text not null,
  sumber sumber_dana,
  jumlah numeric(15,2) not null default 0,
  ref_spp uuid references public.spp (id) on delete set null,
  ref_bkk uuid references public.bkk (id) on delete set null,
  apbdes_id uuid references public.apbdes (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.transaksi enable row level security;

create policy "staff read transaksi" on public.transaksi for select to authenticated using (public.is_staff());
create policy "staff write transaksi" on public.transaksi for all to authenticated using (public.is_staff());

-- VIEW: Buku Kas Umum dengan saldo berjalan
create or replace view public.v_bku as
with t as (
  select
    id, tanggal, created_at, jenis, uraian, sumber, jumlah,
    case when jenis = 'masuk' then jumlah else -jumlah end as selisih
  from public.transaksi
  order by tanggal, created_at
)
select
  id, tanggal, jenis, uraian, sumber, jumlah,
  sum(selisih) over (order by tanggal, created_at rows between unbounded preceding and current row) as saldo
from t;

-- VIEW: realisasi per bidang
create or replace view public.v_serapan_bidang as
select
  r.bidang,
  r.apbdes_id,
  sum(r.pagu) as pagu,
  coalesce(sum(s.netto), 0) as realisasi
from public.rekening r
left join public.spp s on s.rekening_id = r.id and s.status in ('disetujui', 'terbayar')
group by r.bidang, r.apbdes_id;

-- ---------- PROYEK ----------
create table public.proyek (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode_kegiatan text,
  bidang bidang not null,
  dusun text not null,
  rt text,
  rw text,
  koordinat text,
  pagu numeric(15,2) not null default 0,
  sumber sumber_dana not null,
  fisik_persen numeric(5,2) not null default 0,
  status status_proyek not null default 'pengadaan',
  tpk text,
  pktd_jumlah integer not null default 0,
  tgl_mulai date,
  tgl_selesai date,
  foto_url text,
  deskripsi text,
  apbdes_id uuid references public.apbdes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.proyek enable row level security;

create policy "public read proyek" on public.proyek for select to anon, authenticated using (true);
create policy "staff write proyek" on public.proyek for all to authenticated using (public.is_staff());

-- ---------- PROGRES ----------
create table public.progres (
  id uuid primary key default gen_random_uuid(),
  proyek_id uuid not null references public.proyek (id) on delete cascade,
  tanggal date not null default current_date,
  fisik_persen numeric(5,2) not null default 0,
  hok integer not null default 0,
  catatan text,
  foto_url text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.progres enable row level security;

-- Public bisa lihat progres (transparansi)
create policy "public read progres" on public.progres for select to anon, authenticated using (true);
create policy "staff write progres" on public.progres for all to authenticated using (public.is_staff());

-- ---------- DOKUMEN ----------
create table public.dokumen (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  jenis text not null check (jenis in ('perdes', 'apbdes', 'lra', 'lpj', 'infografis')),
  deskripsi text,
  file_url text,
  ukuran text,
  tanggal date not null default current_date,
  publik boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.dokumen enable row level security;

create policy "public read dokumen" on public.dokumen for select to anon, authenticated using (publik = true);
create policy "staff write dokumen" on public.dokumen for all to authenticated using (public.is_staff());

-- ---------- ASPIRASI ----------
create table public.aspirasi (
  id uuid primary key default gen_random_uuid(),
  no_tiket text not null unique,
  nama text,
  nik text,
  anon boolean not null default false,
  topik text not null,
  pesan text not null,
  lampiran_url text,
  status status_aspirasi not null default 'baru',
  tanggal timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.aspirasi enable row level security;

-- Warga (anon) bisa kirim aspirasi; staff baca & update
create policy "public insert aspirasi" on public.aspirasi for insert to anon, authenticated
  with check (true);
create policy "staff read aspirasi" on public.aspirasi for select to authenticated using (public.is_staff());
create policy "staff update aspirasi" on public.aspirasi for update to authenticated
  using (public.is_staff());-- ============ FILE: supabase/migrations/0002_seed.sql ============
-- ============================================================
-- SiskueDes Seed — Demo data Desa Tegal Rejo TA 2025
-- Idempotent: aman dijalankan ulang. SQL Editor → Run
-- ============================================================

begin;

-- ---------- Clean (idempotent, order child → parent) ----------
delete from public.progres;
delete from public.bkk;
delete from public.transaksi;
delete from public.spp;
delete from public.pendapatan;
delete from public.proyek;
delete from public.aspirasi;
delete from public.dokumen;
delete from public.rekening;
delete from public.apbdes;

-- ---------- APBDES 2025 ----------
insert into public.apbdes (id, tahun, total_pendapatan, total_belanja, total_pembiayaan, aktif)
values ('11111111-1111-1111-1111-111111111111', 2025, 1485240000, 1485240000, 85000000, true);

-- ---------- REKENING (belanja per bidang) ----------
insert into public.rekening (id, kode, nama, bidang, jenis, pagu, apbdes_id) values
('22222222-0000-0000-0000-000000000001', '1.1.01.01', 'Belanja Siltap & Tunjangan Perangkat', 'Penyelenggaraan Pemerintahan', 'belanja', 540000000, '11111111-1111-1111-1111-111111111111'),
('22222222-0000-0000-0000-000000000002', '2.1.02.01', 'Belanja Modal Jalan & Infrastruktur', 'Pelaksanaan Pembangunan', 'belanja', 850000000, '11111111-1111-1111-1111-111111111111'),
('22222222-0000-0000-0000-000000000003', '3.1.01.01', 'Belanja Posyandu & Pembinaan Masyarakat', 'Pembinaan Kemasyarakatan', 'belanja', 180000000, '11111111-1111-1111-1111-111111111111'),
('22222222-0000-0000-0000-000000000004', '4.1.01.01', 'Belanja Ketahanan Pangan & Pemberdayaan', 'Pemberdayaan Masyarakat', 'belanja', 210000000, '11111111-1111-1111-1111-111111111111'),
('22222222-0000-0000-0000-000000000005', '5.1.01.01', 'Belanja Bencana, Darurat & Mendesak', 'Penanggulangan Bencana', 'belanja', 40000000, '11111111-1111-1111-1111-111111111111');

-- ---------- PENDAPATAN (target & realisasi) ----------
insert into public.pendapatan (apbdes_id, sumber, uraian, target, terealisasi, tanggal) values
('11111111-1111-1111-1111-111111111111', 'DDS',   'Dana Desa (APBN Pusat)', 772324800, 520000000, '2025-01-15'),
('11111111-1111-1111-1111-111111111111', 'ADD',   'Alokasi Dana Desa (Kabupaten)', 460424400, 460424400, '2025-03-15'),
('11111111-1111-1111-1111-111111111111', 'PADes', 'Pendapatan Asli Desa', 163376400, 60000000, '2025-04-02'),
('11111111-1111-1111-1111-111111111111', 'BHP',   'Bagi Hasil Pajak & Retribusi', 89114400, 30000000, '2025-05-20');

-- ---------- SPP ----------
insert into public.spp (id, nomor, tanggal, apbdes_id, rekening_id, ppkd_nama, ppkd_jabatan, uraian, rekanan, sumber, nilai_bruto, ppn, pph21, pph22, pph23, netto, status) values
('33333333-0000-0000-0000-000000000001', '0014/SPP/DDS/2025', '2025-03-14', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Irwan Setiawan', 'Kasi Kesejahteraan', 'Belanja Material Rabat Beton Dusun III (Semen & Pasir)', 'CV Mitra Semesta', 'DDS', 48500000, 4400000, 0, 850000, 0, 43250000, 'terbayar'),
('33333333-0000-0000-0000-000000000002', '0015/SPP/DDS/2025', '2025-03-10', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000004', 'Siti Rohmah', 'Kaur Tata Usaha', 'Pengadaan Bibit Jagung Hibrida Ketahanan Pangan', 'Kelompok Tani Subur', 'DDS', 32500000, 1600000, 0, 1200000, 0, 29700000, 'diajukan'),
('33333333-0000-0000-0000-000000000003', '0016/SPP/ADD/2025', '2025-03-05', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Ahmad Faozan', 'Kasi Pelayanan', 'Pengadaan Kertas, Toner & Penjilidan LPJ', 'Toko Berkah Mandiri', 'ADD', 4200000, 462000, 0, 0, 0, 3738000, 'diajukan'),
('33333333-0000-0000-0000-000000000004', '0042/SPP/DDS/2025', '2025-05-12', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Irwan Setiawan', 'Kasi Kesejahteraan', 'Pengadaan Semen & Pasir Proyek Rabat Beton Dusun III', 'CV Berkah Mandiri Sejahtera', 'DDS', 48500000, 4400000, 0, 850000, 0, 43250000, 'diajukan'),
('33333333-0000-0000-0000-000000000005', '0043/SPP/ADD/2025', '2025-05-14', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Siti Rohmah', 'Kaur Tata Usaha', 'Langganan Internet Desa & Perawatan Server Siskeudes', 'PT Telkom Akses', 'ADD', 3850000, 0, 0, 0, 0, 3850000, 'diajukan'),
('33333333-0000-0000-0000-000000000006', '0044/SPP/PAD/2025', '2025-05-15', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Ahmad Faozan', 'Kasi Pelayanan', 'Rembuk Stunting & PMT Balita Gizi Kurang', 'Kader Posyandu Melati I-IV', 'PADes', 12200000, 0, 0, 0, 0, 12200000, 'disetujui'),
('33333333-0000-0000-0000-000000000007', '0042/BKK/ADD/2025', '2025-03-12', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', 'Budianto', 'Bendahara', 'Honor Panitia Musrenbangdes TA 2025', '8 Penerima', 'ADD', 8000000, 0, 400000, 0, 0, 7600000, 'terbayar'),
('33333333-0000-0000-0000-000000000008', '0043/BKK/PAD/2025', '2025-03-08', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'Ahmad Faozan', 'Kasi Pelayanan', 'Sewa Tenda Terop & Audio Gebyar Budaya Desa', 'Sukma Nada Sound', 'PADes', 6000000, 0, 0, 0, 120000, 5880000, 'terbayar');

-- ---------- BKK ----------
insert into public.bkk (id, nomor, tanggal, spp_id, uraian, jumlah, dibayar_kepada) values
('44444444-0000-0000-0000-000000000001', '0014/BKK/DDS/2025', '2025-03-15', '33333333-0000-0000-0000-000000000001', 'Rabat Beton Dusun III', 43250000, 'CV Mitra Semesta'),
('44444444-0000-0000-0000-000000000002', '0042/BKK/ADD/2025', '2025-03-13', '33333333-0000-0000-0000-000000000007', 'Honor Musrenbangdes', 7600000, '8 Penerima'),
('44444444-0000-0000-0000-000000000003', '0043/BKK/PAD/2025', '2025-03-09', '33333333-0000-0000-0000-000000000008', 'Sewa Sound & Tenda', 5880000, 'Sukma Nada Sound');

-- ---------- TRANSAKSI (BKU) ----------
insert into public.transaksi (tanggal, jenis, uraian, sumber, jumlah, ref_spp, ref_bkk, apbdes_id) values
('2025-01-15', 'masuk', 'Penyaluran Dana Desa Tahap I', 'DDS', 300000000, null, null, '11111111-1111-1111-1111-111111111111'),
('2025-03-15', 'masuk', 'Penyaluran ADD Tahap II (KPPN)', 'ADD', 215000000, null, null, '11111111-1111-1111-1111-111111111111'),
('2025-04-02', 'masuk', 'Penerimaan PADes (Sewa TKD & Retribusi)', 'PADes', 5000000, null, null, '11111111-1111-1111-1111-111111111111'),
('2025-03-15', 'keluar', 'Bayar Rabat Beton Dusun III', 'DDS', 43250000, '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
('2025-03-13', 'keluar', 'Bayar Honor Musrenbangdes', 'ADD', 7600000, '33333333-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111'),
('2025-03-09', 'keluar', 'Bayar Sewa Sound & Tenda', 'PADes', 5880000, '33333333-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111');

-- ---------- PROYEK ----------
insert into public.proyek (id, nama, kode_kegiatan, bidang, dusun, rt, rw, pagu, sumber, fisik_persen, status, tpk, pktd_jumlah, tgl_mulai, tgl_selesai, apbdes_id) values
('55555555-0000-0000-0000-000000000001', 'Pembangunan Jalan Usaha Tani Beton Dusun II', '02.03.01', 'Pelaksanaan Pembangunan', 'Dusun II', '04', '02', 185000000, 'DDS', 85, 'berjalan', 'H. Rahmat & Tim Dusun II', 24, '2025-02-01', '2025-06-30', '11111111-1111-1111-1111-111111111111'),
('55555555-0000-0000-0000-000000000002', 'Pembangunan Gedung Posyandu Melati Dusun I', '01.02.04', 'Pembinaan Kemasyarakatan', 'Dusun I', '02', '01', 95000000, 'ADD', 100, 'pho', 'Siti Aminah, S.Pd', 16, '2025-01-10', '2025-04-20', '11111111-1111-1111-1111-111111111111'),
('55555555-0000-0000-0000-000000000003', 'Rehabilitasi Saluran Irigasi Tersier Sawah Kulon', '02.04.02', 'Pelaksanaan Pembangunan', 'Dusun III', null, null, 75000000, 'DDS', 45, 'berjalan', 'Wawan Kurniawan', 18, '2025-03-01', null, '11111111-1111-1111-1111-111111111111'),
('55555555-0000-0000-0000-000000000004', 'Pemasangan PJUTS Tenaga Surya (15 Titik)', '02.02.05', 'Pelaksanaan Pembangunan', 'Dusun I s/d III', null, null, 48000000, 'DDS', 100, 'selesai', 'Agus Supriatna', 8, '2025-02-15', '2025-05-10', '11111111-1111-1111-1111-111111111111');

-- ---------- PROGRES ----------
insert into public.progres (proyek_id, tanggal, fisik_persen, hok, catatan) values
('55555555-0000-0000-0000-000000000001', '2025-03-20', 40, 22, 'Pekerjaan galian & lapis pondasi selesai'),
('55555555-0000-0000-0000-000000000001', '2025-04-20', 70, 24, 'Pengecoran tahap I selesai, kendala cuaca'),
('55555555-0000-0000-0000-000000000001', '2025-05-20', 85, 21, 'Pengecoran akhir, proses curing konkret'),
('55555555-0000-0000-0000-000000000002', '2025-04-25', 100, 16, 'Serah terima PHO selesai'),
('55555555-0000-0000-0000-000000000003', '2025-04-10', 45, 18, 'Pemasangan batu kali 135m dari 300m');

-- ---------- DOKUMEN ----------
insert into public.dokumen (judul, jenis, deskripsi, ukuran, tanggal, publik) values
('Perdes APBDes No. 04/2025', 'perdes', 'Peraturan Desa Tegal Rejo tentang APBDes TA 2025 (Salinan Asli Berstempel)', '4.8 MB', '2025-01-15', true),
('Laporan Realisasi Semester I (Jan-Jun)', 'lra', 'Rincian SPP, Rekapitulasi Kas Umum Desa, dan Bukti Setor Pajak', '7.2 MB', '2025-07-08', true),
('Infografis Baliho APBDes (Hi-Res)', 'infografis', 'Grafis poster cetak baliho 3x4m yang dipasang di Kantor Desa', '12.1 MB', '2025-01-20', true);

-- ---------- ASPIRASI ----------
insert into public.aspirasi (no_tiket, nama, nik, anon, topik, pesan, status) values
('ASP-2025-0841', 'Budi Santoso', '3201010101010001', false, 'infrastruktur', 'Rabat jalan Dusun II air tergenang saat hujan, mohon periksa drainase', 'selesai'),
('ASP-2025-0842', null, null, true, 'kesehatan', 'PMT Posyandu Melati bulan lalu berkurang jumlahnya', 'baru');

commit;-- ============ FILE: supabase/migrations/0003_portal_policies.sql ============
-- SiskueDes — Portal transparansi perlu data publik
-- SQL Editor → Run
create policy "public read pendapatan" on public.pendapatan for select to anon, authenticated using (true);
create policy "public read rekening" on public.rekening for select to anon, authenticated using (true);-- ============ FILE: supabase/migrations/0004_fix_rls.sql ============
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
alter table public.apbdes force row level security;-- ============ FILE: supabase/migrations/0005_aspirasi_rls.sql ============
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
  for delete to authenticated using (public.is_staff());-- ============ FILE: supabase/migrations/0007_killswitch.sql ============
-- SiskueDes — Grendel aman: anon dilarang update/delete aspirasi (restrictive)
-- Run, lalu bilang "sukses" atau error.
alter table public.aspirasi force row level security;

create policy "blok anon update aspirasi" on public.aspirasi
  as restrictive for update to anon using (false);

create policy "blok anon delete aspirasi" on public.aspirasi
  as restrictive for delete to anon using (false);

-- Cek status RLS kalau mau
select relname, relrowsecurity as rls_aktif, relforcerowsecurity as rls_paksa
from pg_class where relname = 'aspirasi';-- ============ FILE: supabase/migrations/0008_cleanup.sql ============
-- SkueDes — Bersihkan grendel uji (0007) karena RLS terbukti aman
-- SQL Editor → Run
drop policy if exists "blok anon update aspirasi" on public.aspirasi;
drop policy if exists "blok anon delete aspirasi" on public.aspirasi;-- ============ FILE: supabase/migrations/0009_fix_serapan.sql ============
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
group by p.bidang, p.apbdes_id, p.pagu;-- ============ FILE: supabase/migrations/0010_roles.sql ============
-- SiskueDes — Role & jabatan akun demo
-- SQL Editor → Run
update public.profiles p
set role = (case
      when u.email = 'kades.sukamaju@gmail.com'      then 'kades'
      when u.email = 'sekdes.sukamaju@gmail.com'     then 'sekdes'
      when u.email = 'bendahara.sukamaju@gmail.com'  then 'bendahara'
    end)::peran,
    jabatan = case
      when u.email = 'kades.sukamaju@gmail.com'      then 'Kepala Desa'
      when u.email = 'sekdes.sukamaju@gmail.com'     then 'Sekretaris Desa'
      when u.email = 'bendahara.sukamaju@gmail.com'  then 'Bendahara Desa'
    end,
    nama = case
      when u.email = 'kades.sukamaju@gmail.com'      then 'Demo Kades'
      when u.email = 'sekdes.sukamaju@gmail.com'     then 'Demo Sekdes'
      when u.email = 'bendahara.sukamaju@gmail.com'  then 'Demo Bendahara'
    end
from auth.users u
where p.id = u.id
  and u.email in ('kades.sukamaju@gmail.com','sekdes.sukamaju@gmail.com','bendahara.sukamaju@gmail.com');

select u.email, p.role, p.jabatan, p.nama
from public.profiles p
join auth.users u on u.id = p.id
order by u.email;-- ============ FILE: supabase/migrations/0011_konfigurasi.sql ============
-- ============================================================
-- SiskueDes — Tabel Konfigurasi & Supervisi
-- Alur: nilai_usulan -> disetujui kades/sekdes -> nilai_aktif
-- Jalankan di SQL Editor -> + New query -> Run
-- ============================================================

create table public.konfigurasi (
  kunci text primary key,
  kategori text not null,
  nama text not null,
  deskripsi text,
  nilai_aktif text not null,
  nilai_usulan text,
  status text not null default 'terpasang' check (status in ('terpasang', 'menunggu')),
  diusulkan_oleh uuid references public.profiles (id) on delete set null,
  disetujui_oleh uuid references public.profiles (id) on delete set null,
  waktu_usulan timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.konfigurasi enable row level security;

create policy "konfigur read" on public.konfigurasi
  for select to authenticated using (true);

create policy "konfigur write" on public.konfigurasi
  for all to authenticated using (public.is_staff());

-- ---------- SETTING DEFAULT ----------
insert into public.konfigurasi (kunci, kategori, nama, deskripsi, nilai_aktif) values
  ('desa',           'Profil Desa', 'Nama Desa',            'Nama desa yang tampil di aplikasi.', 'Tegal Rejo'),
  ('kecamatan',      'Profil Desa', 'Kecamatan',            'Kecamatan tempat desa berada.', 'Sukaresmi'),
  ('tarif_ppn',      'Pajak SPP',   'Tarif PPN (%)',        'Persentase PPN untuk hitung otomatis SPP.', '11'),
  ('tarif_pph22',    'Pajak SPP',   'Tarif PPh 22 (%)',     'Persentase PPh pasal 22 untuk hitung otomatis SPP.', '1.5'),
  ('otomatis_pajak', 'Pajak SPP',   'Hitung Pajak Otomatis','Aktifkan tombol "Hitung otomatis" di form SPP.', 'on'),
  ('tahun_anggaran', 'Umum',        'Tahun Anggaran',       'Tahun anggaran yang sedang berjalan.', '2025')
on conflict (kunci) do nothing;-- ============ FILE: supabase/migrations/0012_pelayanan.sql ============
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
  ('Joko Priyono', 'L', '1970-01-30', '3201013001700022', 'Dusun Krajan RT 03', '03', '01', 'Guru');-- ============ FILE: supabase/migrations/0013_fix_gizi.sql ============
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
order by p.nama;-- ============ FILE: supabase/migrations/0014_identitas.sql ============
-- SiskueDes — Identitas Desa: Tegal Rejo, Kec. Tempursari, Kab. Lumajang
-- SQL Editor -> + New query -> Run
update public.konfigurasi set nilai_aktif = 'Tegal Rejo' where kunci = 'desa';
update public.konfigurasi set nilai_aktif = 'Tempursari' where kunci = 'kecamatan';

insert into public.konfigurasi (kunci, kategori, nama, deskripsi, nilai_aktif)
values ('kabupaten', 'Profil Desa', 'Kabupaten', 'Nama kabupaten tempat desa berada.', 'Lumajang')
on conflict (kunci) do update set nilai_aktif = 'Lumajang';

update public.profiles set desa = 'Tegal Rejo', kecamatan = 'Tempursari';
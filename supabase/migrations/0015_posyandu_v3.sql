-- ============ FILE: supabase/migrations/0015_posyandu_v3.sql ============
-- PosyanduKu — Schema lengkap PRD v3 (Multi-posyandu, 5 meja, ILP)
-- Jalankan di Supabase → SQL Editor → Run (idempotent, aman dijalankan ulang)
-- ============================================================

-- ---------- ROLE BARU ----------
ALTER TYPE peran ADD VALUE IF NOT EXISTS 'kader';
ALTER TYPE peran ADD VALUE IF NOT EXISTS 'nakes';

create or replace function public.is_operator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role::text in ('kades', 'sekdes', 'bendahara', 'superadmin', 'kader', 'nakes')
  )
$$;

create or replace function public.is_nakes()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('nakes', 'superadmin')
  )
$$;

-- ---------- ENUM ----------
drop type if exists kelompok_sasaran cascade;
create type kelompok_sasaran as enum ('bayi', 'balita', 'remaja', 'produktif', 'lansia');

drop type if exists status_sasaran cascade;
create type status_sasaran as enum ('aktif', 'pindah', 'meninggal');

drop type if exists status_validasi cascade;
create type status_validasi as enum ('pending', 'approved', 'ditolak');

drop type if exists status_kehamilan cascade;
create type status_kehamilan as enum ('hamil', 'nifas', 'menyusui');

drop type if exists status_imunisasi cascade;
create type status_imunisasi as enum ('diberikan', 'menolak', 'sakit', 'tunda');
drop type if exists status_kunjungan cascade;
drop type if exists status_rujukan cascade;

-- ---------- POSYANDU (ekstensi tabel existing) ----------
alter table public.posyandu add column if not exists dusun text;
alter table public.posyandu add column if not exists rw text;
alter table public.posyandu add column if not exists rt text;
alter table public.posyandu add column if not exists tipe text not null default 'balita';
alter table public.posyandu add column if not exists jadwal_buka text;

-- ---------- WILAYAH ----------
create table if not exists public.wilayah (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jenis text not null default 'dusun' check (jenis in ('dusun','rw','rt','kadus')),
  induk_id uuid references public.wilayah (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- SASARAN (registri utama semua kelompok) ----------
create table if not exists public.sasaran (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu (id) on delete cascade,
  wilaya_id uuid references public.wilayah (id) on delete set null,
  nik text,
  nik_sementara boolean not null default false,
  nama text not null,
  jenis_kelamin jenis_kelamin not null,
  tanggal_lahir date not null,
  golongan_darah text,
  nama_ortu text,
  telepon text,
  alamat text,
  kelompok kelompok_sasaran not null,
  status status_sasaran not null default 'aktif',
  tanggal_meninggal date,
  catatan text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists idx_sasaran_nik on public.sasaran (nik);
create index if not exists idx_sasaran_kelompok on public.sasaran (kelompok);
create index if not exists idx_sasaran_posyandu on public.sasaran (posyandu_id);

-- ---------- KEHAMILAN (episode ibu hamil/nifas/menyusui) ----------
create table if not exists public.kehamilan (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  ke_hamil integer not null default 1,
  status status_kehamilan not null default 'hamil',
  tgl_hpl date,
  tgl_mulai date not null default current_date,
  tgl_akhir date,
  catatan text,
  created_at timestamptz not null default now()
);

-- ---------- KEGIATAN (posyandu buka / 5 meja) ----------
create table if not exists public.kegiatan (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu (id) on delete cascade,
  tanggal date not null default current_date,
  nama text not null default 'Posyandu Bulanan',
  agenda text,
  terbuka boolean not null default true,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create unique index if not exists idx_kegiatan_pos_tgl on public.kegiatan (posyandu_id, tanggal);

-- ---------- KEHADIRAN (absensi) ----------
create table if not exists public.kehadiran (
  id uuid primary key default gen_random_uuid(),
  kegiatan_id uuid not null references public.kegiatan (id) on delete cascade,
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  hadir boolean not null default true,
  catatan text,
  created_at timestamptz not null default now(),
  unique (kegiatan_id, sasaran_id)
);

-- ---------- ANTROPOMETRI (pengukuran + Z-Score) ----------
create table if not exists public.antropometri (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  kegiatan_id uuid references public.kegiatan (id) on delete set null,
  tanggal date not null default current_date,
  berat_kg numeric(5,2),
  tinggi_cm numeric(5,1),
  lika_cm numeric(4,1),
  lila_cm numeric(4,1),
  z_bbu numeric(6,2),
  z_tbu numeric(6,2),
  z_bbtb numeric(6,2),
  z_imtu numeric(6,2),
  z_lika numeric(6,2),
  status_gizi text,
  status_tinggi text,
  red_flag boolean not null default false,
  catatan text,
  diukur_oleh uuid references public.profiles (id),
  status_validasi status_validasi not null default 'pending',
  validasi_oleh uuid references public.profiles (id),
  validasi_waktu timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_antropometri_sasaran on public.antropometri (sasaran_id, tanggal);

-- ---------- IMUNISASI ----------
create table if not exists public.imunisasi (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  kegiatan_id uuid references public.kegiatan (id) on delete set null,
  antigen text not null,
  dosis text not null default '1',
  tanggal date not null default current_date,
  status status_imunisasi not null default 'diberikan',
  petugas text,
  catatan text,
  status_validasi status_validasi not null default 'pending',
  validasi_oleh uuid references public.profiles (id),
  validasi_waktu timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_imunisasi_sasaran on public.imunisasi (sasaran_id, antigen);

-- ---------- SKRINING (siklus hidup / PTM) ----------
create table if not exists public.skrining (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  kegiatan_id uuid references public.kegiatan (id) on delete set null,
  kelompok kelompok_sasaran not null,
  tanggal date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  label_risiko text not null default 'rendah',
  red_flag boolean not null default false,
  catatan text,
  dibuat_oleh uuid references public.profiles (id),
  status_validasi status_validasi not null default 'pending',
  validasi_oleh uuid references public.profiles (id),
  validasi_waktu timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- PELAYANAN KB ----------
create table if not exists public.pelayanan_kb (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  kegiatan_id uuid references public.kegiatan (id) on delete set null,
  tanggal date not null default current_date,
  alat_kontrasepsi text not null,
  keterangan text,
  status_validasi status_validasi not null default 'pending',
  validasi_oleh uuid references public.profiles (id),
  validasi_waktu timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- LOGISTIK ----------
create table if not exists public.logistik_item (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu (id) on delete cascade,
  nama text not null,
  satuan text not null default 'butir',
  kategori text not null default 'suplemen',
  ambang_min numeric(8,1) not null default 0
);

create table if not exists public.logistik_stok (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu (id) on delete cascade,
  item_id uuid not null references public.logistik_item (id) on delete cascade,
  qty numeric(8,1) not null default 0,
  batch text,
  tgl_exp date
);

create table if not exists public.logistik_mutasi (
  id uuid primary key default gen_random_uuid(),
  posyandu_id uuid not null references public.posyandu (id) on delete cascade,
  item_id uuid not null references public.logistik_item (id) on delete cascade,
  jenis text not null check (jenis in ('masuk', 'keluar')),
  qty numeric(8,1) not null,
  sasaran_id uuid references public.sasaran (id) on delete set null,
  tanggal date not null default current_date,
  keterangan text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- KUNJUNGAN RUMAH (outreach) ----------
create table if not exists public.kunjungan (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  tanggal date not null default current_date,
  alasan text not null,
  petugas text,
  hasil text,
  tindak_lanjut text,
  status text not null default 'berlanjut' check (status in ('selesai', 'berlanjut')),
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- RUJUKAN ----------
create table if not exists public.rujukan (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  tanggal date not null default current_date,
  tujuan text not null,
  alasan text not null,
  data_ringkas text,
  status text not null default 'terkirim' check (status in ('terkirim', 'diproses', 'selesai')),
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- KEMATIAN ----------
create table if not exists public.kematian (
  id uuid primary key default gen_random_uuid(),
  sasaran_id uuid not null references public.sasaran (id) on delete cascade,
  tanggal date not null default current_date,
  jenis text not null check (jenis in ('ibu', 'bayi', 'balita', 'umum')),
  sebab text,
  catatan text,
  created_at timestamptz not null default now()
);

-- ---------- KOMPETENSI & PENYULUHAN ----------
create table if not exists public.kompetensi (
  id uuid primary key default gen_random_uuid(),
  nomor integer not null unique,
  judul text not null,
  deskripsi text
);

create table if not exists public.kompetensi_kader (
  id uuid primary key default gen_random_uuid(),
  kader_id uuid not null references public.profiles (id) on delete cascade,
  kompetensi_id uuid not null references public.kompetensi (id) on delete cascade,
  tgl_selesai date not null default current_date,
  unique (kader_id, kompetensi_id)
);

create table if not exists public.materi (
  id uuid primary key default gen_random_uuid(),
  topik text not null,
  kelompok kelompok_sasaran not null default 'balita',
  deskripsi text,
  url text,
  created_at timestamptz not null default now()
);

-- ---------- STANDAR IMUNISASI (konfigurasi) ----------
create table if not exists public.standar_imunisasi (
  id uuid primary key default gen_random_uuid(),
  antigen text not null,
  dosis text not null,
  urutan integer not null default 0,
  umur_min_bln numeric(4,1),
  umur_maks_bln numeric(4,1),
  aktif boolean not null default true
);

-- ---------- AUDIT LOG ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tabel text not null,
  record_id uuid,
  aksi text not null,
  data jsonb,
  oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.wilayah enable row level security;
alter table public.sasaran enable row level security;
alter table public.kehamilan enable row level security;
alter table public.kegiatan enable row level security;
alter table public.kehadiran enable row level security;
alter table public.antropometri enable row level security;
alter table public.imunisasi enable row level security;
alter table public.skrining enable row level security;
alter table public.pelayanan_kb enable row level security;
alter table public.logistik_item enable row level security;
alter table public.logistik_stok enable row level security;
alter table public.logistik_mutasi enable row level security;
alter table public.kunjungan enable row level security;
alter table public.rujukan enable row level security;
alter table public.kematian enable row level security;
alter table public.kompetensi enable row level security;
alter table public.kompetensi_kader enable row level security;
alter table public.materi enable row level security;
alter table public.standar_imunisasi enable row level security;
alter table public.audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'wilayah','sasaran','kehamilan','kegiatan','kehadiran','antropometri','imunisasi',
    'skrining','pelayanan_kb','logistik_item','logistik_stok','logistik_mutasi',
    'kunjungan','rujukan','kematian','kompetensi','kompetensi_kader','materi',
    'standar_imunisasi','audit_log'
  ]
  loop
    execute format('create policy "operator read %s" on public.%I for select to authenticated using (public.is_operator());', t, t);
    execute format('create policy "operator write %s" on public.%I for all to authenticated using (public.is_operator());', t, t);
  end loop;
end $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Standar imunisasi (pedoman imunisasi nasional, dapat diubah)
insert into public.standar_imunisasi (antigen, dosis, urutan, umur_min_bln, umur_maks_bln) values
  ('HB-0', '0 Kunjungan 1', 0, 0, 1),
  ('BCG', '1', 1, 0, 1),
  ('Polio tetes', '1', 2, 0, 1),
  ('DPT-HB-Hib', '1', 3, 2, 3),
  ('Polio tetes', '2', 4, 2, 3),
  ('DPT-HB-Hib', '2', 5, 3, 4),
  ('Polio tetes', '3', 6, 3, 4),
  ('DPT-HB-Hib', '3', 7, 4, 5),
  ('Polio tetes', '4', 8, 4, 5),
  ('IPV', '1', 9, 4, 5),
  ('Rotavirus', '1', 10, 2, 3),
  ('Rotavirus', '2', 11, 3, 4),
  ('Rotavirus', '3', 12, 4, 5),
  ('PCV', '1', 13, 2, 3),
  ('PCV', '2', 14, 4, 5),
  ('PCV', '3', 15, 12, 13),
  ('Campak-Rubela', '1', 16, 9, 10),
  ('JE', '1', 17, 10, 11),
  ('Campak-Rubela', '2 (Booster)', 18, 18, 19),
  ('JE', '2 (Booster)', 19, 24, 25)
on conflict do nothing;

-- Item logistik default per posyandu
do $$
declare p record;
begin
  for p in select id from public.posyandu loop
    insert into public.logistik_item (posyandu_id, nama, satuan, kategori, ambang_min) values
      (p.id, 'Vitamin A Merah (100.000 IU)', 'kapsul', 'vitamin', 10),
      (p.id, 'Vitamin A Biru (200.000 IU)', 'kapsul', 'vitamin', 10),
      (p.id, 'Tablet Tambah Darah (TTD)', 'butir', 'suplemen', 20),
      (p.id, 'Albendazol', 'butir', 'obat', 10),
      (p.id, 'Paracetamol Sirup', 'botol', 'obat', 5),
      (p.id, 'Oralit', 'sachet', 'obat', 10),
      (p.id, 'PMT Biskuit', 'bungkus', 'pmt', 10),
      (p.id, 'PMT Bubur', 'bungkus', 'pmt', 10)
    on conflict do nothing;
  end loop;
end $$;

-- Kompetensi dasar ILP kader (25)
insert into public.kompetensi (nomor, judul) values
  (1, 'Memahami konsep Posyandu & ILP'),
  (2, 'Cara pengisian KMS & buku register'),
  (3, 'Teknik pengukuran berat badan (BB)'),
  (4, 'Teknik pengukuran tinggi badan (TB/PB)'),
  (5, 'Teknik pengukuran LILA'),
  (6, 'Teknik pengukuran Lingkar Kepala'),
  (7, 'Membaca hasil Z-Score & klasifikasi gizi'),
  (8, 'Deteksi dini stunting & wasting'),
  (9, 'Pemberian Vitamin A'),
  (10, 'Pemberian TTD & edukasi anemia'),
  (11, 'Edukasi MPASI & ASI eksklusif'),
  (12, 'Konseling gizi ibu hamil'),
  (13, 'Skrining kehamilan risiko tinggi'),
  (14, 'Deteksi tandatanda nifas tidak normal'),
  (15, 'Edukasi imunisasi & jadwalnya'),
  (16, 'Skrining tumbuh kembang balita (KPSP)'),
  (17, 'Edukasi PHBS & cuci tangan'),
  (18, 'Skrining PTM (TD, GDS, lingkar perut)'),
  (19, 'Skrining anemia remaja'),
  (20, 'Edukasi KB & alat kontrasepsi'),
  (21, 'Pelayanan lansia & mobilisasi'),
  (22, 'Penyuluhan & metode komunikasi efektif'),
  (23, 'Pencatatan & pelaporan posyandu'),
  (24, 'Manajemen logistik & stok'),
  (25, 'Kunjungan rumah & tindak lanjut kasus')
on conflict (nomor) do nothing;

-- Materi penyuluhan dasar
insert into public.materi (topik, kelompok, deskripsi) values
  ('ASI Eksklusif 6 Bulan', 'bayi', 'Manfaat ASI eksklusif dan tanda bayi kenyang.'),
  ('MPASI Bergizi', 'bayi', 'Pengenalan MPASI 6-24 bulan sesuai standar.'),
  ('Pencegahan Stunting', 'balita', 'Edukasi orang tua tentang gizi seimbang.'),
  ('Anemia pada Remaja', 'remaja', 'Pencegahan anemia, pentingnya TTD.'),
  ('PTM & Hidup Sehat', 'produktif', 'Cegah hipertensi, DM, dan obesitas.'),
  ('Perawatan Lansia', 'lansia', 'Pola makan, aktivitas, dan cek kesehatan rutin.'),
  ('Kesehatan Ibu Hamil', 'produktif', 'Tanda bahaya kehamilan & gizi ibu hamil.')
on conflict do nothing;

-- ============================================================
-- VIEW: status gizi terkini per sasaran
-- ============================================================
create or replace view public.v_gizi_terkini as
select distinct on (a.sasaran_id)
  a.sasaran_id, s.nama as nama_sasaran, s.jenis_kelamin, s.tanggal_lahir, s.nik, s.kelompok, s.posyandu_id, p.nama as posyandu,
  a.tanggal, a.berat_kg, a.tinggi_cm, a.z_bbu, a.z_tbu, a.z_bbtb, a.status_gizi, a.status_tinggi, a.red_flag
from public.antropometri a
join public.sasaran s on s.id = a.sasaran_id
join public.posyandu p on p.id = s.posyandu_id
where a.status_validasi = 'approved'
order by a.sasaran_id, a.tanggal desc;
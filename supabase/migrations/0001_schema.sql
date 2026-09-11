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
  using (public.is_staff());
-- ============ FILE: supabase/migrations/0011_konfigurasi.sql ============
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
on conflict (kunci) do nothing;
-- ============================================================
-- SEED DEMO — data contoh untuk uji coba PosyanduKu
-- Dimaksudkan utk dijalankan SETELAH 0015_posyandu_v3.sql
-- di Supabase SQL Editor (dashboard → SQL Editor → Run).
-- Bisa dihapus via: delete dari tabel terkait (urut terbalik).
-- ============================================================

-- ---------- WILAYAH (hierarki dusun/rw/rt) ----------
insert into public.wilayah (id, nama, jenis, induk_id) values
  ('d5719b10-0000-4000-8000-000000000001', 'Dusun Krajan', 'dusun', null),
  ('d5719b10-0000-4000-8000-000000000002', 'Dusun Sidorejo', 'dusun', null),
  ('d5719b10-0000-4000-8000-000000000003', 'RW 02 Krajan', 'rw', 'd5719b10-0000-4000-8000-000000000001'),
  ('d5719b10-0000-4000-8000-000000000004', 'RT 05 Krajan', 'rt', 'd5719b10-0000-4000-8000-000000000003')
on conflict (id) do nothing;

-- ---------- POSYANDU ----------
insert into public.posyandu (id, nama, ketua_kader, lokasi, dusun, rw, rt, tipe, jadwal, jadwal_buka, active) values
  ('d5719b10-0000-4000-8000-000000000010', 'Posyandu Melati', 'Budi Lestari', 'Balai Dusun Krajan', 'Krajan', '02', '05', 'kegiatan', 'Kamis pekan ke-2', '08.00-11.00', true),
  ('d5719b10-0000-4000-8000-000000000011', 'Posyandu Mawar', 'Sri Wahyuni', 'Balai Dusun Sidorejo', 'Sidorejo', '03', '01', 'kegiatan', 'Sabtu pekan ke-2', '08.00-11.00', true)
on conflict (id) do nothing;

-- ---------- SASARAN (contoh lintas kelompok usia) ----------
insert into public.sasaran (
  id, posyandu_id, wilaya_id, nik, nik_sementara, nama, jenis_kelamin, tanggal_lahir,
  golongan_darah, nama_ortu, telepon, alamat, kelompok, status, catatan
) values
  ('d5719b10-0000-4000-8000-000000000020', 'd5719b10-0000-4000-8000-000000000010', 'd5719b10-0000-4000-8000-000000000004',
   '3512120505230001', false, 'Bima Putra Santoso', 'L', '2023-05-12', 'O', 'Andri Santoso', '081234567890', 'Krajan RT 05', 'balita', 'aktif', null),
  ('d5719b10-0000-4000-8000-000000000021', 'd5719b10-0000-4000-8000-000000000010', 'd5719b10-0000-4000-8000-000000000004',
   '3512113010910002', false, 'Anisa Rahma Putri', 'P', '2021-09-30', 'A', 'Dewi Purwanti', '081298765432', 'Krajan RT 05', 'balita', 'aktif', null),
  ('d5719b10-0000-4000-8000-000000000022', 'd5719b10-0000-4000-8000-000000000010', 'd5719b10-0000-4000-8000-000000000004',
   null, true, 'Kirana Ayu', 'P', '2026-07-01', null, 'Rina Kartika', null, 'Krajan RT 05', 'bayi', 'aktif', 'Bayi baru, NIK menyusul'),
  ('d5719b10-0000-4000-8000-000000000023', 'd5719b10-0000-4000-8000-000000000010', 'd5719b10-0000-4000-8000-000000000004',
   '3512121503120003', false, 'Dewi Lestari', 'P', '2012-03-15', 'B', 'Heru Lestari', null, 'Krajan RT 05', 'remaja', 'aktif', null),
  ('d5719b10-0000-4000-8000-000000000024', 'd5719b10-0000-4000-8000-000000000010', 'd5719b10-0000-4000-8000-000000000004',
   '3512208008940004', false, 'Siti Aminah', 'P', '1994-08-20', 'AB', 'Suparman', '085123456789', 'Krajan RT 05', 'produktif', 'aktif', 'An.ke-2'),
  ('d5719b10-0000-4000-8000-000000000025', 'd5719b10-0000-4000-8000-000000000011', 'd5719b10-0000-4000-8000-000000000002',
   '3512122506850005', false, 'Budi Setiawan', 'L', '1985-06-25', null, null, null, 'Sidorejo', 'produktif', 'aktif', 'Riwayat GDS'),
  ('d5719b10-0000-4000-8000-000000000026', 'd5719b10-0000-4000-8000-000000000011', 'd5719b10-0000-4000-8000-000000000002',
   '3512121001580006', false, 'Karto Sumadi', 'L', '1958-01-10', null, 'Sumih', null, 'Sidorejo', 'lansia', 'aktif', 'Hipertensi rutin')
on conflict (id) do nothing;

-- ---------- KEHAMILAN (untuk Siti Aminah) ----------
insert into public.kehamilan (id, sasaran_id, ke_hamil, status, tgl_hpl, tgl_mulai, catatan) values
  ('d5719b10-0000-4000-8000-000000000030', 'd5719b10-0000-4000-8000-000000000024', 2, 'hamil',
   '2026-10-15', '2026-06-01', 'Jadwal ANC bulanan di Puskesmas')
on conflict (id) do nothing;

-- ---------- KEGIATAN + KEHADIRAN (dua bulan terakhir) ----------
insert into public.kegiatan (id, posyandu_id, tanggal, nama, agenda, terbuka) values
  ('d5719b10-0000-4000-8000-000000000040', 'd5719b10-0000-4000-8000-000000000010', '2026-08-13', 'Posyandu Bulanan', '5 Meja + penyuluhan gizi', true),
  ('d5719b10-0000-4000-8000-000000000041', 'd5719b10-0000-4000-8000-000000000010', '2026-09-10', 'Posyandu Bulanan', '5 Meja + imunisasi', true)
on conflict (id) do nothing;

insert into public.kehadiran (kegiatan_id, sasaran_id, hadir, catatan) values
  ('d5719b10-0000-4000-8000-000000000040', 'd5719b10-0000-4000-8000-000000000020', true, null),
  ('d5719b10-0000-4000-8000-000000000040', 'd5719b10-0000-4000-8000-000000000021', false, 'Rujuk PMT'),
  ('d5719b10-0000-4000-8000-000000000040', 'd5719b10-0000-4000-8000-000000000022', true, null),
  ('d5719b10-0000-4000-8000-000000000041', 'd5719b10-0000-4000-8000-000000000020', true, null),
  ('d5719b10-0000-4000-8000-000000000041', 'd5719b10-0000-4000-8000-000000000021', true, null),
  ('d5719b10-0000-4000-8000-000000000041', 'd5719b10-0000-4000-8000-000000000022', true, null),
  ('d5719b10-0000-4000-8000-000000000041', 'd5719b10-0000-4000-8000-000000000024', true, 'ANC')
on conflict (kegiatan_id, sasaran_id) do nothing;
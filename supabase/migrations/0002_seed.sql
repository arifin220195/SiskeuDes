-- ============ FILE: supabase/migrations/0002_seed.sql ============
-- ============================================================
-- SiskueDes Seed — Demo data Desa Sukamaju TA 2025
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
('Perdes APBDes No. 04/2025', 'perdes', 'Peraturan Desa Sukamaju tentang APBDes TA 2025 (Salinan Asli Berstempel)', '4.8 MB', '2025-01-15', true),
('Laporan Realisasi Semester I (Jan-Jun)', 'lra', 'Rincian SPP, Rekapitulasi Kas Umum Desa, dan Bukti Setor Pajak', '7.2 MB', '2025-07-08', true),
('Infografis Baliho APBDes (Hi-Res)', 'infografis', 'Grafis poster cetak baliho 3x4m yang dipasang di Kantor Desa', '12.1 MB', '2025-01-20', true);

-- ---------- ASPIRASI ----------
insert into public.aspirasi (no_tiket, nama, nik, anon, topik, pesan, status) values
('ASP-2025-0841', 'Budi Santoso', '3201010101010001', false, 'infrastruktur', 'Rabat jalan Dusun II air tergenang saat hujan, mohon periksa drainase', 'selesai'),
('ASP-2025-0842', null, null, true, 'kesehatan', 'PMT Posyandu Melati bulan lalu berkurang jumlahnya', 'baru');

commit;
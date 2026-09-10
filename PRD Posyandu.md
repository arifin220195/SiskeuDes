# PRD v3 — Aplikasi Posyandu Digital (Working Title: "PosyanduKu")

**Tipe dokumen:** Product Requirement Document
**Versi:** 3.0
**Penulis:** Inisiatif pribadi (pengembang)
**Status:** Draft untuk divalidasi & disempurnakan oleh masing-masing posyandu
**Tujuan:** Menjadwalkan pengembangan aplikasi posyandu yang **lengkap operasional tapi realistis untuk skala 1 desa**, dijual/ditawarkan per posyandu, tanpa utopia teknis (live SATUSEHAT/FHIR) yang tidak relevan di level desa.

---

## 1. Visi & Ringkasan Eksekutif

Mengubah administrasi posyandu konvensional (buku register, KMS kertas, rekap manual) menjadi digital **sejalan dengan alur 5 Meja Posyandu dan standar Kementerian Kesehatan RI**, dengan prinsip **"Satu Klik Semua Beres"**:

- **Otomatisasi klinis:** Kalkulasi Z-Score (BB/U, TB/U, BB/TB, IMT/U, Lingkar Kepala) standar WHO tanpa human error.
- **Data teratur sejak awal:** Registri sasaran per posyandu, riwayat pertumbuhan, imunisasi, dan skrining tersimpan rapi → laporan resmi (PWS, rekapitulasi, register) jadi instan.
- **Siap intervensi:** Peringatan (Red Flag) otomatis + tracker kunjungan rumah = closed-loop pemantauan.
- **Multi-posyandu:** Satu aplikasi melayani banyak posyandu dalam satu desa (default), bisa dipakai lintas desa.

**Nilai utama bagi posyandu:** laporan bulanan yang tadinya 1–3 hari rekap manual jadi < 5 menit, data anak tidak hilang/ganda, dan TIDAK kehilangan cara kerja 5 Meja yang sudah mereka kenal.

---

## 2. Scope

### 2.1 In-Scope (MVP) — dasar operasional posyandu
1. Manajemen wilayah & unit posyandu (multi-posyandu).
2. Registri sasaran (NIK-centric): balita, ibu hamil/nifas/menyusui, remaja, usia produktif, lansia.
3. Alur kegiatan bulanan 5 Meja + absensi digital.
4. Antropometri & kalkulator gizi otomatis + KMS digital (grafik pertumbuhan).
5. Imunisasi (jadwal standar, tracking, deteksi keterlambatan).
6. Logistik & farmasi: vitamin A, TTD, obat cacing, PMT (stok + pemberian).
7. Skrining siklus hidup & PTM (smart form per kelompok usia).
8. Pelayanan KB sederhana (pencatatan).
9. Kunjungan rumah / follow-up Red Flag.
10. Rujukan tercetak.
11. Dashboard PWS desa + alert.
12. Pelaporan resmi: register, rekapitulasi bulanan, ekspor Excel/CSV, cetak.
13. Role & approval (kader input → nakes validasi → laporan resmi).
14. Portal warga (orang tua lihat KMS anak via link/NIK).

### 2.2 Out-of-Scope MVP (Roadmap v2/v3)
- Full offline (IndexedDB + sync). MVP = **online-first, mobile-friendly** (sinkron manual via internet kader; area blank spot diakomodasi roadmap).
- Integrasi live SATUSEHAT/ASIK (institusional, bukan urusan aplikasi desa). Cukup **export-ready**: NIK & skema data rapi.
- Rekam medis elektronik lengkap (RME) rumah sakit/puskesmas.
- Sinema/rembesPuskesmas (Puskesmas pakai sistemnya sendiri).
- Aplikasi aggregator antar-puskesmas/kabupaten.

---

## 3. Target Pengguna & Role Matrix

| Role | Contoh Akun | Tanggung Jawab | Hak Akses |
|---|---|---|---|
| **Super Admin** | Pengembang | Setup desa & posyandu, konfigurasi standar, manajemen user | Semua + konfigurasi sistem |
| **Admin Desa (Kepala Desa)/Pengelola** | Perangkat desa terdaftar | Aktivasi modul, lihat PWS desa, pengaturan kegiatan | Semua read + konfigurasi kegiatan |
| **Kader Posyandu** | Ketua/anggota kader | Registrasi sasaran, pengukuran, absensi, skrining, penyuluhan, kunjungan rumah | Input/edit (status *pending*), lihat data posyandunya |
| **Tenaga Kesehatan (Nakes)** | Bidan desa/perawat | Validasi data kader, approval, rujukan, pelayanan imunisasi/KB | Validasi + approval + seluruh data desa |
| **Warga/Orang Tua** | Akses via link + NIK anak | Pantau KMS & jadwal, terima notifikasi | Read-only data dirinya sendiri |

**Alur validasi:** Data dari kader = status `pending` → disetujui nakes = `approved` → hanya data `approved` masuk ke laporan resmi & PWS provinsi-esque.

---

## 4. Master Data & Konfigurasi

| Data Master | Isi |
|---|---|
| **Desa/Unit** | Nama desa, kecamatan, kabupaten, alamat, logo |
| **Wilayah** | Dusun → RW → RT (relasi hirarkis) |
| **Posyandu** | Nama, dusun/RW, nama ketua kader, jadwal buka, kategori (balita/remaja/lansia/lansia + PTM) |
| **Kader** | Data kader, posyandu, jabatan |
| **Sasaran** | Warga dengan NIK, kelompok sasaran, posyandu default |
| **Jadwal Imunisasi** | Antigen + dosis + rentang usia (sesuai pedoman imunisasi nasional) |
| **Standar WHO** | Tabel Z-Score & IMT (per jenis kelamin, 0–19 th), tabel LIKA 0–2 th |
| **Threshold Alert** | Ambang Red Flag per kelompok sasaran |
| **Item Logistik** | Daftar vitamin/suplemen/obat/PMT + satuan |
| **Materi Penyuluhan** | Digital library materi Kemenkes |

Semua standar klinis **configurable**, bukan hardcode — bisa dinilai/dipaksa update per periode.

---

## 5. Spesifikasi Modul

### 5.1 Manajemen Wilayah & Posyandu
- CRUD desa, wilayah (dusun/RW/RT), dan unit posyandu.
- Tiap sasaran punya posyandu default → otomatis masuk jadwal & kohort posyandunya.
- Dukungan tipe posyandu: Balita, Remaja, Lansia, PTM (campur).

### 5.2 Registri Sasaran (Identity Management)
- Validasi **NIK**: format 16 digit, cek digit ganda (duplikasi NIK dihambat), cek jenis kelamin & tanggal lahir wajar dari NIK.
- Bypass terdokumentasi untuk bayi baru lahir tanpa NIK (field NIK sementara/placeholder, wajib isi sebelum laporan resmi).
- Kelompok sasaran otomatis dari tanggal lahir: Bayi (0–11 bln), Balita (12–59 bln), Remaja (10–18 th), Produktif (19–49), Lansia (≥ 50 / ≥ 60 sesuai kebijakan desa), Ibu Hamil/Nifas/Menyusui (episode kehamilan).
- Data inti: NIK, nama, JK, tgl lahir, gol. darah, nama ortu/wali (untuk anak), alamat wilayah, telepon, posyandu, status aktif/pindah/meninggal.

### 5.3 Alur Kegiatan Bulanan — 5 Meja Digital
Mengikuti meja posyandu agar kader tidak kehilangan cara kerja:

| Meja | Proses | Di Aplikasi |
|---|---|---|
| 1 | Pendaftaran | Cek kehadiran via NIK (absensi digital) |
| 2 | Penimbangan | Input BB/TB/LIKA/LILA → Z-Score instan |
| 3 | Pencatatan | Status gizi + kategori (didapat dari meja 2) |
| 4 | Penyuluhan | Catat materi yang diberikan (digital library) |
| 5 | Pelayanan | Imunisasi, vitamin, TTD, obat cacing, PMT, KB |

- Ada entitas **Kegiatan** (tanggal buka, posyandu) → semua input kader pada kegiatan itu masuk dalam satu batch, memudahkan laporan bulanan & rekap.
- Absensi otomatis menandai sasaran "hadir" pada kegiatan → dasar metrik D/S (Datang/Sasaran).

### 5.4 Antropometri & Kalkulator Gizi
- Input: tanggal ukur, BB (kg), TB/PB (cm), LIKA (cm), LILA (cm, utk ibu/balita ≥ 6 bln).
- Auto-hitung: **Z-Score BB/U, TB/U, BB/TB/PB, IMT/U** (WHO Child Growth Standards, pisah laki/perempuan); LIKA/U untuk 0–2 th.
- Label otomatis:

| Indikator | Kategori |
|---|---|
| BB/U | Gizi buruk (< -3 SD), Gizi kurang (-3 s/d -2), Gizi baik, Gizi lebih (> +2 SD) |
| TB/U | Sangat pendek (< -3), Pendek/stunting (-3 s/d -2), Normal |
| BB/TB | Sangat kurus (< -3), Kurus (-3 s/d -2), Normal, Berisiko gizi lebih (+2 s/d +3), Gizi lebih (> +3) |
| IMT/U (5–19 th) | Sangat kurus, Kurus, Normal, Gemuk |

- **KMS digital:** grafik pertumbuhan BB/U & TB/U per anak dengan garis standar WHO (+ threshold -2/-3 SD).
- Simpan nilai mentah + hasil Z-Score + label sebagai data historis (audit trail).

### 5.5 Imunisasi
- Jadwal standar (configurable, mengikuti pedoman imunisasi nasional — output ke file CONFIGURASI: BCG, HB-0, DPT-HB-Hib 1–3, Polio tetes 1–4, IPV, Campak-Rubela, PCV, Rotavirus, JE sesuai wilayah).
- Input pemberian per sasaran per antigen-dosis: tanggal, status (oke/menolak/sakit/tunda/OPV drop).
- **Deteksi keterlambatan:** sistem tampilkan antigen yang lewat dari rentang usia → masuk alert/outreach.
- Ringkasan cakupan: per antigen, per kategori (lengkap/tidak).

### 5.6 Logistik & Farmasi
- **Item default:** Vitamin A (kapsul biru 200.000 IU utk 1–5 th, kapsul merah 100.000 IU utk 6–11 bln), Tablet Tambah Darah (TTD), Albendazol, Oralit, Paracetamol/sirup dasar, PMT (bubur/biskuit).
- **Stok:** mutasi masuk (terima dari puskesmas), mutasi keluar (pemberian tercatat ke sasaran), stok awal/akhir, ambang minimum → alert untuk memesan.
- **Pencatatan pemberian** terhubung ke sasaran (mis. Vitamin A Februari & Agustus, TTD untuk ibu/remaja, obat cacing 6/12 bln), otomatis mengurangi stok.
- Form sederhana **permintaan ke puskesmas** (print).

### 5.7 Skrining Siklus Hidup & PTM
Prinsip: sistem memuat riwayat statis (data lama) dan kader cukup isi data dinamis saat ini.

| Kelompok | Form Skrining (dynamic data) |
|---|---|
| Ibu Hamil | TD, LILA, TB, BB, usia kehamilan, Hb (jika ada alat), keluhan |
| Ibu Nifas/Menyusui | TD, kondisi payudara, perdarahan, keluhan |
| Bayi/Balita | Perkembangan PY: pandang/dengar/senyum (KPSP sederhana), ISPA/diare ringan |
| Remaja (10–18 th) | Anemia: Hb/LILA (jika alat ada), TD, lingkar perut, riwayat haid |
| Usia Produktif (19–49) | TD, lingkar perut, GDP/GDS (jika alat ada), riwayat keluarga DM/HT, rokok |
| Lansia (≥ 50/60) | TD, GDS, IMT, mobilisasi/keseimbangan, penglihatan/pendengaran |

- Hasil skrining disimpan historis → tren per sasaran & per wilayah.
- Keluaran otomatis: label risiko (rendah/sedang/tinggi) → pemicu rujukan / outreach.

### 5.8 Pelayanan KB
- Pencatatan: kontrasepsi aktif (jenis alat kontrasepsi, tanggal, keluhan).
- Cakupan KB aktif per posyandu (indikator PWS).
- Sederhana, bukan sistem klinik KB penuh.

### 5.9 Rujukan & Verification Queue
- **Verification Queue:** antrean data kader berstatus `pending` → nakes review, koreksi, approve/tolak. Hanya `approved` masuk laporan resmi.
- **Rujukan tercetak:** buat surat rujukan (ke Pustu/Puskesmas) auto-terisi data medis sasaran terbaru → PDF/print.
- Log siapa-mengubah-apa-kapan (audit trail).

### 5.10 Tracker Kunjungan Rumah (Outreach)
- **Auto-assign:** sistem menandai sasaran Red Flag → daftar kunjungan rumah untuk kader/posyandu.
- **Home Visit Log:** tanggal kunjungan, petugas, hasil/tindakan, solusi, status selesai/berlanjut.
- Closed-loop: catat kunjungan → perbarui status sasaran (misal: balita turun BB diarahkan UGD/Puskesmas, di-follow).

### 5.11 Penyuluhan & Repositori Kompetensi
- **Digital library:** materi edukasi Kemenkes (upload/embedded) per topik & kelompok sasaran.
- **Pencatatan penyuluhan:** pada meja 4, kader mencentang materi yang disampaikan → statistik.
- **Checklist 25 kompetensi dasar ILP kader** (kemajuan per kader, ringkasan per posyandu).

### 5.12 Dashboard PWS Desa & Alert
- **Alert / Red Flag:** notifikasi otomatis bila:
  - Balita: BB/U < -2 SD (kurus/berat kurang) atau TB/U < -2 SD (stunting) atau BB/TB < -2 SD (wasting).
  - Tidak hadir 2 kegiatan berturut-turut tanpa keterangan.
  - Ibu hamil: TD ≥ 140/90, LILA < 23,5 cm, Hb rendah (< 11 g/dL) bila ada alat.
  - Remaja: Hb < 12 g/dL (anemia), di luar angka alat.
  - Lansia: TD ≥ 140/90, GDS ≥ 200, IMT < 18,5.
  - Logistik: stok di bawah ambang minimum.
- **Dashboard PWS:** cakupan kunjungan (D/S), cakupan imunisasi per antigen, status gizi (prevalensi stunting/kurus/gemuk per posyandu), cakupan vitamin A/obat cacing/TTD, cakupan KB, kematian (jika ada). Grafik tren per bulan + filter per posyandu/dusun.

### 5.13 Pelaporan Resmi
Format out-of-the-box (print/ekspor Excel/CSV):
- **Register Balita** (register sasaran & pengukuran bulan berjalan).
- **Register Ibu Hamil / Sasaran kelompok lain.**
- **Rekapitulasi penimbangan bulanan** — S, P (hadir), N (naik BB), T (turun), dan cakupan D/S.
- **KMS digital** (per anak, cetak).
- **PWS Desa** (indikator KIA/Gizi standar).
- **Buku rujukan & register imunisasi.**
- **Data kematian** (kematian ibu/bayi/balita jika terdata).
- Expotar ke format yang disedot Puskesmas (Excel layout standar).

### 5.14 Perencanaan & Performance
- Jadwal kegiatan bulanan desa (roadmap posyandu: tanggal buka, agenda).
- Performa kader (penyelesaian tugas, checklist kompetensi, jumlah kunjungan rumah).
- Cakupan target desa per indikator (terhadap target sasaran).

---

## 6. Alur Kerja (Workflow)

### 6.1 Pra-Kegiatan (Planning)
1. Admin desa/posyandu buat jadwal kegiatan bulanan.
2. Dari registri, siapkan daftar target kunjungan & sasaran undangan (print/bagikan via portal warga).
3. Cek stok logistik → ajukan permintaan ke puskesmas bila kurang.

### 6.2 Kegiatan (5 Meja)
1. **Meja 1 — Pendaftaran:** kader cek hadir via NIK → absensi.
2. **Meja 2 — Penimbangan:** input BB/TB dll → Z-Score & label instan muncul.
3. **Meja 3 — Pencatatan:** data tersimpan di register (batch kegiatan).
4. **Meja 4 — Penyuluhan:** centang materi; beri edukasi.
5. **Meja 5 — Pelayanan:** input imunisasi & vitamin/perbekalan (stok otomatis berkurang); buat rujukan bila perlu.
6. Nakes membuka **Verification Queue**, review & approve.

### 6.3 Pasca-Kegiatan (Reporting & Outreach)
1. Sistem generate laporan bulanan (rekap + PWS) dalam 1 klik.
2. Red Flag terdeteksi → kunjungan rumah dijadwalkan → log hasil → status closed-loop.
3. Notifikasi/pengingat ke warga (jadwal berikutnya, sasaran belum hadir).

---

## 7. Model Data Inti (Awal; akan diperinci di skema migrasi)

```
desa / profil
wilayah            (dusun → rw → rt)
posyandu           (istri wilayah, tipe, jadwal)
kader              (relasi user_auth)
sasaran_warga      (NIK PK, JK, tgl_lahir, kelompok_sasaran, posyandu_id, alamat, ortu)
episode_kehamilan  (durasi, tanggal periksa, paritas)
kegiatan           (posyandu_id, tanggal, agenda)
kehadiran_kegiatan (kegiatan_id, sasaran_id, status)
pertumbuhan        (sasaran_id, kegiatan_id, tgl, bb, tb, lika, lila, zs_* , label)
imunisasi          (sasaran_id, antigen_id, dosis, tgl, status)
skrining           (sasaran_id, jenis, tgl, data_json, label_risiko)
pelayanan_kb       (sasaran_id, kontrasepsi, tgl, status)
pemberian_gizi     (sasaran_id, item_id, dosis, tgl)        → mengurangi stok
logistik_stok      (posyandu_id, item_id, qty, batch, exp)
logistik_mutasi    (stok masuk/keluar, ref pemberian/permintaan)
kunjungan_rumah    (sasaran_id, kader_id, tgl, hasil, status)
rujukan            (sasaran_id, tujuan, alasan, tgl, status)
verifikasi         (record ref, action, user, status)       → audit trail
kompetensi_kader   (kader_id, kompetensi_id, tgl_selesai)
materi_edukasi     (topik, kelompok_sasaran, file/link)
konfigurasi        (key, value, periode)  ← standar imunisasi, threshold, WHO tables
alert / notif
```

Prinsip: setiap record klinis menyimpan **siapa menginput** (user), **kapan**, **dari kegiatan apa**, dan **status approval** — audit trail penuh.

---

## 8. Konfigurasi (Berkas/lalat Konfigurasi terpisah)

Karena standar berubah (mis. jadwal imunisasi, metode WHO), buat `CONFIGURASI.md` / seed data:
- Jadwal imunisasi nasional (antigen, dosis, usia).
- Tabel WHO Z-Score & IMT (dukungan untuk data laki/perempuan 0–19 th; LIKA 0–2 th).
- Threshold alert per kelompok sasaran.
- Item logistik default + satuan + ambang stok.
- Kelompok usia sasaran.

---

## 9. Non-Fungsional & Arsitektur

| Aspek | Keputusan |
|---|---|
| Frontend | React + Vite + Tailwind (basis existing), **mobile-first** — kader kerja dari HP |
| Backend | Supabase (PostgreSQL + Auth + RLS) — basis existing, RLS per posyandu/desa |
| Deployment | Vercel/Netlify (frontend) + Supabase cloud |
| Offline | MVP **online-first**. Rescue: halaman sederhana, input cepat, toleran sinyal lambat. Offline penuh (IndexedDB + sync queue + reconciliation) → roadmap v2 |
| PWA | Installable + notifikasi push (jadwal kegiatan, reminder | v2 optional) |
| Keamanan | Supabase Auth + RLS; data pribadi (NIK, kesehatan) role-restricted 100%; log audit; backup DB harian |
| Ekspor | Excel/CSV client-side; PDF via print-friendly halaman |
| Standar | Skema data menyiapkan kolom NIK & struktur yang siap export (SATUSEHAT/ASIK), **bukan integrasi live** |

---

## 10. Integrasi Eksternal

- **SATUSEHAT/ASIK:** TIDAK integrated langsung di MVP. Data disusun agar *export-ready* (NIK valid, tanggal lengkap, ID standar). Jika posyandu di bawah puskesmas dan BUKAN aplikasi institusional, integrasi live bukan layak — cukup format laporan sesuai standar yang diminta.
- **WhatsApp/portal warga (nilai tambah, non-MVP):** link pantau KMS anak, pengingat jadwal.

---

## 11. KPI & Metrik Keberhasilan

| KPI | Target |
|---|---|
| Waktu rekap laporan bulanan | < 5 menit (vs 1–3 hari manual) |
| Kesalahan kalkulasi antropometri | 0% (otomatis, tanpa input manual Z-Score) |
| Cakupan data terdaftar | ≥ 80% balita & ibu hamil desa terdaftar dalam 3 bulan pertama |
| Penggunaan aktif kader | ≥ 70% kader aktif input ≥ 1 kegiatan/bulan |
| Follow-up Red Flag | ≥ 90% sasaran Red Flag mendapat kunjungan ≤ 7 hari |
| Kepatuhan validasi nakes | 100% laporan resmi dari data `approved` |

---

## 12. Roadmap

| Fase | Cakupan |
|---|---|
| **MVP v1** | Semua In-Scope (seksi 2.1). Single desa → multi-posyandu. Online-first. |
| **v2** | Offline penuh (IndexedDB + sync), PWA + push, portal warga & WhatsApp reminder, multi-desa deployment pararel |
| **v3** | Analitik lanjutan (prediksi risiko stunting), AI chat kader (arahan), integrasi bila ada giliran dengan aplikasi puskesmas resmi |

---

## 13. Asumsi & Keputusan Terbuka (untuk dibahas dengan posyandu)

1. **Standar kategori usia Lansia** — ≥ 50 atau ≥ 60 (per kebijakan wilayah).
2. **Siapa yang pegang admin lokal** — kader ketua vs perangkat desa (entuk zien RLS).
3. **Jadwal imunisasi** — gunakan pedoman nasional terbaru; divalidasi bidan desa.
4. **Sumber stok logistik** — didata manual dari penerimaan puskesmas (tidak otomatis).
5. **Pendataan ulang (migration)** — bagaimana data register kertas dipindah (import template, tidak input manual satu-satu).
6. **Biaya hosting** — siapa bayar supabase/domain (apakah desa ikut serta / sponsor).
7. **Perangkat** — HP kader tersedia? butuh desain halaman input yang ringan & hemat kuota.

---

## 14. Lampiran

- `CONFIGURASI.md` — jadwal imunisasi, threshold alert, item logistik, kelompok usia (menyusul).
- `MIGRASI.md` — rencana pindah data register kertas → digital (menyusul).
- Skema SQL migrasi Supabase (menyusul di fase build).
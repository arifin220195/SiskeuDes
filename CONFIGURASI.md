# Konfigurasi Standar — PosyanduKu (PRD v3)

Dokumen ini mencantumkan standar default yang dipakai aplikasi. Seluruh standar **bisa diubah** tanpa ubah kode:

| Standar | Lokasi penyimpanan | Dilengkapi di |
|---|---|---|
| Jadwal imunisasi | Tabel `standar_imunisasi` | Migrasi 0015 |
| Item logistik (vitamin/obat/PMT) | Tabel `logistik_item` | Migrasi 0015 |
| 25 kompetensi kader ILP | Tabel `kompetensi` | Migrasi 0015 |
| Materi penyuluhan | Tabel `materi` | Migrasi 0015 |
| Tabel Z-Score WHO (0-60 bln) | `src/lib/zscore.ts` (LMS) | Code (fixed) |
| Ambang Red Flag | `src/config/threshold.ts` | Code (fixed, mudah ubah) |
| Kelompok usia sasaran | `src/config/kelompok.ts` | Code (fixed) |

## 1. Jadwal Imunisasi (Pedoman Imunisasi Nasional, divalidasi bidan desa)

| Antigen | Dosis | Umur min | Umur maks |
|---|---|---|---|
| HB-0 | 0 | 0 bln (lahir) | 1 bln |
| BCG | 1 | 0 bln | 1 bln |
| Polio tetes | 1 | 0 bln | 1 bln |
| DPT-HB-Hib | 1 | 2 bln | 3 bln |
| Polio tetes | 2 | 2 bln | 3 bln |
| DPT-HB-Hib | 2 | 3 bln | 4 bln |
| Polio tetes | 3 | 3 bln | 4 bln |
| DPT-HB-Hib | 3 | 4 bln | 5 bln |
| Polio tetes | 4 | 4 bln | 5 bln |
| IPV | 1 | 4 bln | 5 bln |
| Rotavirus | 1-3 | 2-5 bln | (sesuai aturan) |
| PCV | 1-2 | 2-5 bln | (sesuai aturan) |
| Campak-Rubela | 1 | 9 bln | 10 bln |
| JE | 1 | 10 bln | 11 bln |
| Campak-Rubela | 2 (Booster) | 18 bln | 19 bln |
| JE | 2 (Booster) | 24 bln | 25 bln |
| PCV | 3 | 12 bln | 13 bln |

> Catatan: wilayah non-endemis JE dapat menonaktifkan antigen ini (`aktif = false`).

## 2. Kelompok Sasaran (dari tanggal lahir)

| Kelompok | Umur | Form skrining |
|---|---|---|
| Bayi | 0-11 bulan | Tumbuh kembang, imunisasi |
| Balita | 12-59 bulan | Gizi, KPSP |
| Remaja | 10-18 tahun | Anemia (Hb/LILA), TD, lingkar perut |
| Produktif | 19-49 tahun | PTM (TD, lingkar perut, GDS) |
| Lansia | >= 50 tahun | PTM + mobilisasi (>= 60 per kebijakan desa) |
| Ibu Hamil/Nifas/Menyusui | episode `kehamilan` | TD, LILA, TB, keluhan |

## 3. Ambang Red Flag

| Kelompok | Red Flag jika |
|---|---|
| Balita/Bayi | Z BB/U < -2 SD, Z TB/U < -2 SD, Z BB/TB < -2 SD |
| Tidak hadir | 2 kegiatan berturut-turut tanpa keterangan |
| Ibu hamil | TD >= 140/90, LILA < 23,5 cm, Hb < 11 g/dL |
| Remaja | Hb < 12 g/dL, LILA < 22 cm |
| Produktif/lansia | TD >= 140/90, GDS >= 200 mg/dL, IMT < 18,5 |
| Logistik | Stok item < ambang min |

## 4. Item Logistik Default

Vitamin A Merah (100.000 IU), Vitamin A Biru (200.000 IU), TTD, Albendazol, Paracetamol Sirup, Oralit, PMT Biskuit, PMT Bubur.

Jadwal pemberian standar:
- Vitamin A: Februari & Agustus (bayi/balita)
- Albendazol: tiap 6 bulan
- TTD: mingguan untuk remaja/ibu hamil
- PMT: sesuai kasus gizi buruk/kurang

## 5. Verifikasi & Validasi

- Data kader (antropometri, imunisasi, skrining, KB) masuk status **pending**.
- Nakes menyetujui → **approved** → baru masuk laporan resmi & PWS.
- Penolakan diberi alasan pada field catatan.
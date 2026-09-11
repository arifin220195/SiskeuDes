# Akun Demo PosyanduKu

Semua password: **demo1234**

> **Cara aktifkan:** Supabase → SQL Editor → tempel isi file
> `supabase/migrations/0017_seed_accounts.sql` → **Run** (sekali saja, aman diulang).

| Email             | Nama            | Peran       | Buat demo                                    |
|-------------------|-----------------|-------------|----------------------------------------------|
| `kades@demo.id`   | Kades Demo      | Kepala Desa | Lihat dashboard/laporan seluruh posyandu     |
| `sekdes@demo.id`  | Sekdes Demo     | Sekretaris  | Lihat dashboard/laporan                      |
| `bendahara@demo.id`| Bendahara Demo | Bendahara   | Akses operator (ist dasarnya akun baru selalu bendahara) |
| `superadmin@demo.id`| Admin Super   | Super Admin | Semua + verifikasi (approve/reject) + konfigurasi |
| `nakes@demo.id`   | Nakes Melati    | Bidan       | **Verifikasi** data kader (verifikasi gizi/imunisasi) |
| `kader@demo.id`   | Kader Melati    | Kader       | **Input**: sasaran, kegiatan 5 meja, imunisasi, skrining, kunjungan rumah |

## Alur demo yang disarankan

1. Login **`kader@demo.id`** → input sasaran baru + pengukuran/KK (status `pending`)
2. Ganti ke **`nakes@demo.id`** → menu **Verifikasi** → Approve data kader
3. Login **`kades@demo.id`** atau **`bendahara@demo.id`** → dashboard PWS & **Laporan** terisi data tervalidasi
4. **`superadmin@demo.id`** → Konfigurasi: tambah posyandu/wilayah, edit standar imunisasi

## Catatan

- Ganti password ini sebelum produksi sungguhan (`kades@demo.id` dkk nama publik).
- Akun tidak perlu konfirmasi email (sudah `email_confirmed_at`).
- User lain yang pernah signup manual **tidak terpengaruh** (SQL hanya sentuh 6 email di atas).
# SiskeuDes

Sistem Informasi Transparansi Keuangan Desa — portal manajemen keuangan desa berdasarkan regulasi Permendagri No. 20/2018.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS (design tokens dari `stitch_sistem_keuangan_desa_transparan/sistem_informasi_transparansi_keuangan_desa/DESIGN.md`)
- React Router v7

## Modul

| Route | Modul | Status |
|---|---|---|
| `/dashboard` | Dashboard APBDes | Placeholder (Phase 2) |
| `/penatausahaan` | Penatausahaan Kas, SPP & Pajak | Placeholder (Phase 2) |
| `/monitoring` | Monitoring Proyek Pembangunan | Placeholder (Phase 3) |
| `/portal` | Portal Transparansi Publik | Placeholder (Phase 3) |
| `/laporan` | Laporan & LPJ | Placeholder |
| `/regulasi` | Regulasi & Perdes | Placeholder |

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Phase Plan

- **Phase 1 (selesai):** Foundation — Vite, routing, layout, design tokens
- **Phase 2:** Dashboard APBDes + Penatausahaan Kas
- **Phase 3:** Monitoring Proyek + Portal Transparansi
- **Phase 4:** Backend — database, auth, API

Referensi design & PRD tersimpan di `stitch_sistem_keuangan_desa_transparan/`.
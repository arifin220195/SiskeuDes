import type { JenisKelamin, KelompokSasaran } from '../types/database'

export const KELOMPOK_LABEL: Record<KelompokSasaran, string> = {
  bayi: 'Bayi (0-11 bln)',
  balita: 'Balita (12-59 bln)',
  remaja: 'Remaja (10-18 th)',
  produktif: 'Produktif (19-49 th)',
  lansia: 'Lansia (>=50 th)',
}

export const KELOMPOK_SINGKAT: Record<KelompokSasaran, string> = {
  bayi: 'Bayi',
  balita: 'Balita',
  remaja: 'Remaja',
  produktif: 'Produktif',
  lansia: 'Lansia',
}

export const JK_LABEL: Record<JenisKelamin, string> = { L: 'Laki-laki', P: 'Perempuan' }

export function umurSaatIni(tanggalLahir: string, acuan?: string): string {
  const lahir = new Date(tanggalLahir)
  const rujukan = acuan ? new Date(acuan) : new Date()
  const tahun = rujukan.getFullYear() - lahir.getFullYear()
  const bulan = rujukan.getMonth() - lahir.getMonth()
  const totalBulan = tahun * 12 + bulan + (rujukan.getDate() < lahir.getDate() ? -1 : 0)
  if (totalBulan < 24) return `${Math.max(0, totalBulan)} bln`
  return `${Math.floor(totalBulan / 12)} th ${totalBulan % 12} bln`
}

export function umurBulan(tanggalLahir: string, acuan?: string): number {
  const lahir = new Date(tanggalLahir)
  const rujukan = acuan ? new Date(acuan) : new Date()
  const tahun = rujukan.getFullYear() - lahir.getFullYear()
  const bulan = rujukan.getMonth() - lahir.getMonth()
  return Math.max(0, tahun * 12 + bulan + (rujukan.getDate() < lahir.getDate() ? -1 : 0))
}

export function kelompokDariUmur(bulan: number): KelompokSasaran {
  if (bulan < 12) return 'bayi'
  if (bulan < 60) return 'balita'
  const tahun = Math.floor(bulan / 12)
  if (tahun >= 10 && tahun <= 18) return 'remaja'
  if (tahun >= 19 && tahun < 50) return 'produktif'
  return 'lansia'
}

export function kelompokDariTanggalLahir(tanggalLahir: string): KelompokSasaran {
  return kelompokDariUmur(umurBulan(tanggalLahir))
}

export function badgeKelompok(kelompok: KelompokSasaran): string {
  const map: Record<KelompokSasaran, string> = {
    bayi: 'bg-sky-500/15 text-sky-700',
    balita: 'bg-violet-500/15 text-violet-700',
    remaja: 'bg-amber-500/15 text-amber-700',
    produktif: 'bg-emerald-500/15 text-emerald-700',
    lansia: 'bg-slate-500/15 text-slate-700',
  }
  return map[kelompok]
}

export function badgeValidasi(status: string): string {
  const map: Record<string, string> = {
    approved: 'bg-emerald-500/15 text-emerald-700',
    pending: 'bg-amber-500/15 text-amber-700',
    ditolak: 'bg-rose-500/15 text-rose-700',
  }
  return map[status] ?? 'bg-surface-container text-on-surface-variant'
}

export function validasiLabel(status: string): string {
  const map: Record<string, string> = { approved: 'Tervalidasi', pending: 'Menunggu', ditolak: 'Ditolak' }
  return map[status] ?? status
}

export function validNIK(nik: string): boolean {
  return /^\d{16}$/.test(nik)
}
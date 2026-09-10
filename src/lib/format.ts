export function rupiah(n: number | string): string {
  const num = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function number(n: string | number): number {
  return typeof n === 'string' ? Number(n) : n
}

export function tanggal(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function tanggalPanjang(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function persen(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Konsep',
  diajukan: 'Diajukan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  terbayar: 'Terbayar',
  baru: 'Baru',
  diproses: 'Diproses',
  selesai: 'Selesai',
  pengadaan: 'Pengadaan',
  berjalan: 'Berjalan',
  pho: 'PHO',
}

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-surface-container-highest text-on-surface-variant',
  diajukan: 'bg-amber-500/10 text-amber-600',
  disetujui: 'bg-sky-500/10 text-sky-600',
  ditolak: 'bg-rose-500/10 text-rose-600',
  terbayar: 'bg-emerald-500/10 text-emerald-600',
  baru: 'bg-amber-500/10 text-amber-600',
  diproses: 'bg-sky-500/10 text-sky-600',
  selesai: 'bg-emerald-500/10 text-emerald-600',
  pengadaan: 'bg-surface-container-highest text-on-surface-variant',
  berjalan: 'bg-sky-500/10 text-sky-600',
  pho: 'bg-emerald-500/10 text-emerald-600',
}

export function statusChip(s: string): string {
  return STATUS_STYLE[s] ?? 'bg-surface-container-highest text-on-surface-variant'
}

export function tidakTertulisCSV(s: string): string {
  return `"${s.replace(/"/g, '""')}"`
}

export function unduhCSV(nama: string, header: string[], rows: (string | number)[][]) {
  const lines = [header, ...rows]
    .map((r) => r.map((c) => tidakTertulisCSV(String(c))).join(';'))
    .join('\r\n')
  const blob = new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  a.click()
  URL.revokeObjectURL(url)
}
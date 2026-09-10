export const THRESHOLD = {
  balita: {
    zBbu: -2, // BB/U gizi kurang
    zTbu: -2, // TB/U stunting
    zBbTb: -2, // BB/TB wasting
    hadirTerlewat: 2, // tidak hadir 2 kegiatan berturut
  },
  ibuHamil: {
    tdSistolik: 140,
    tdDiastolik: 90,
    lilaMin: 23.5,
    hbMin: 11,
  },
  remaja: {
    hbMin: 12,
    lilaMin: 22,
  },
  dewasa: {
    tdSistolik: 140,
    tdDiastolik: 90,
    gdsMaks: 200,
    imtMin: 18.5,
  },
} as const

export function lafe(label: string): string {
  return label
}

export function parseTD(td: string | undefined): { sistolik: number; diastolik: number } | null {
  if (!td || !td.includes('/')) return null
  const [s, d] = td.split('/').map((x) => Number(x.trim()))
  if (!Number.isFinite(s) || !Number.isFinite(d)) return null
  return { sistolik: s, diastolik: d }
}

export function risikoTD(td: string | undefined, min: { sistolik: number; diastolik: number }): boolean {
  const p = parseTD(td)
  if (!p) return false
  return p.sistolik >= min.sistolik || p.diastolik >= min.diastolik
}
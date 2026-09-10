/**
 * Z-Score Engine — Standar WHO Child Growth Standards
 * Referensi: WHO Multicentre Growth Reference Study (MGRS)
 * Tabel LMS (Lambda, Mu, Sigma) per usia bulan 0–60
 *
 * Kalkulasi: Z = ((X / M)^L - 1) / (L * S)
 * Jika L mendekati 0: Z = ln(X/M) / S
 */

export type JenisKelaminZ = 'L' | 'P'

export interface ZScoreResult {
  bbU: number | null   // BB/U  Weight-for-Age
  tbU: number | null   // TB/U  Length/Height-for-Age
  bbTb: number | null  // BB/TB Weight-for-Length (approx)
  imtU: number | null  // IMT/U BMI-for-Age
  statusGizi: StatusGizi
  statusTinggi: StatusTinggi
  usiaBulan: number
  redFlag: boolean
}

export type StatusGizi =
  | 'Gizi Buruk'
  | 'Gizi Kurang'
  | 'Gizi Baik'
  | 'Risiko Gizi Lebih'
  | 'Gizi Lebih'
  | 'Obesitas'
  | '-'

export type StatusTinggi =
  | 'Sangat Pendek (Stunting Berat)'
  | 'Pendek (Stunting)'
  | 'Normal'
  | 'Tinggi'
  | '-'

// Format: [usia_bulan, L, M, S]
export type LMSRow = [number, number, number, number]

// ── BB/U Laki-laki ──────────────────────────────────────────────────────────
export const BBU_L: LMSRow[] = [
  [0,0.3487,3.3464,0.14602],[1,0.2297,4.4709,0.13395],[2,0.1970,5.5675,0.12979],
  [3,0.2986,6.3762,0.12578],[4,0.3539,7.0023,0.12252],[5,0.3877,7.5105,0.11957],
  [6,0.3227,7.9340,0.11686],[7,0.3111,8.2970,0.11442],[8,0.2853,8.6151,0.11243],
  [9,0.4216,8.9007,0.11269],[10,0.3988,9.1648,0.11135],[11,0.3565,9.4122,0.11080],
  [12,0.2349,9.6479,0.11410],[15,0.2330,10.3153,0.11316],[18,0.2566,10.9094,0.11268],
  [21,0.2583,11.4421,0.11321],[24,0.1470,12.1415,0.11263],[27,0.1157,12.6282,0.11336],
  [30,0.0949,13.0840,0.11395],[33,0.0745,13.5205,0.11459],[36,0.0643,13.9375,0.11528],
  [39,0.0440,14.3366,0.11606],[42,0.0316,14.7204,0.11679],[45,0.0154,15.0918,0.11759],
  [48,0.0019,15.4541,0.11835],[51,-0.0100,15.8108,0.11910],[54,-0.0231,16.1641,0.11985],
  [57,-0.0344,16.5190,0.12058],[60,-0.0466,16.8791,0.12128],
]

// ── BB/U Perempuan ───────────────────────────────────────────────────────────
export const BBU_P: LMSRow[] = [
  [0,0.3809,3.2322,0.14171],[1,0.1714,4.1873,0.13724],[2,0.3248,5.1282,0.13000],
  [3,0.2986,5.8458,0.12619],[4,0.3539,6.4237,0.12314],[5,0.4031,6.8985,0.12066],
  [6,0.3227,7.2978,0.11741],[7,0.2364,7.6561,0.11547],[8,0.2126,7.9933,0.11405],
  [9,0.2180,8.0896,0.11582],[10,0.1737,8.4838,0.11477],[11,0.1246,8.7477,0.11369],
  [12,0.1499,8.9481,0.11977],[15,0.1435,9.5934,0.11709],[18,0.1618,10.2034,0.11561],
  [21,0.1631,10.7859,0.11535],[24,0.0268,11.5835,0.11625],[27,-0.0034,12.1383,0.11706],
  [30,-0.0260,12.6692,0.11801],[33,-0.0530,13.1896,0.11907],[36,-0.0738,13.6959,0.12019],
  [39,-0.0967,14.1948,0.12129],[42,-0.1198,14.6916,0.12244],[45,-0.1418,15.1892,0.12357],
  [48,-0.1632,15.6886,0.12470],[51,-0.1836,16.1919,0.12581],[54,-0.2026,16.7013,0.12693],
  [57,-0.2206,17.2192,0.12806],[60,-0.2376,17.7462,0.12920],
]

// ── TB/U Laki-laki ──────────────────────────────────────────────────────────
export const TBU_L: LMSRow[] = [
  [0,1,49.8842,0.03795],[1,1,54.7244,0.03557],[2,1,58.4249,0.03424],
  [3,1,61.4292,0.03328],[4,1,63.8860,0.03257],[5,1,65.9026,0.03176],
  [6,1,67.6236,0.03128],[7,1,69.1645,0.03089],[8,1,70.5994,0.03064],
  [9,1,72.0036,0.03064],[10,1,73.2812,0.03052],[11,1,74.5148,0.03044],
  [12,1,75.7490,0.03136],[15,1,79.1716,0.03168],[18,1,82.3239,0.03186],
  [21,1,85.1,0.03196],[24,1,87.8161,0.03243],[27,1,90.4822,0.03296],
  [30,1,92.8988,0.03324],[33,1,95.0686,0.03338],[36,1,96.1,0.03362],
  [39,1,98.7,0.03381],[42,1,100.6,0.03397],[45,1,102.5,0.03414],
  [48,1,104.3,0.03430],[51,1,106.0,0.03446],[54,1,107.7,0.03461],
  [57,1,109.4,0.03476],[60,1,111.0,0.03490],
]

// ── TB/U Perempuan ───────────────────────────────────────────────────────────
export const TBU_P: LMSRow[] = [
  [0,1,49.1477,0.03790],[1,1,53.6872,0.03640],[2,1,57.0673,0.03568],
  [3,1,59.8029,0.03490],[4,1,62.0899,0.03428],[5,1,64.0301,0.03360],
  [6,1,65.7311,0.03311],[7,1,67.2873,0.03271],[8,1,68.7498,0.03247],
  [9,1,70.1435,0.03258],[10,1,71.4818,0.03252],[11,1,72.7710,0.03250],
  [12,1,74.0150,0.03328],[15,1,77.4816,0.03370],[18,1,80.7,0.03382],
  [21,1,83.7,0.03393],[24,1,86.4,0.03440],[27,1,89.1,0.03490],
  [30,1,91.5,0.03519],[33,1,93.7,0.03540],[36,1,95.7,0.03568],
  [39,1,97.7,0.03588],[42,1,99.7,0.03607],[45,1,101.5,0.03625],
  [48,1,103.3,0.03643],[51,1,105.0,0.03661],[54,1,106.7,0.03679],
  [57,1,108.4,0.03696],[60,1,110.0,0.03712],
]

// ── Interpolasi linier ───────────────────────────────────────────────────────
export function interpolate(tabel: LMSRow[], usia: number): [number, number, number] | null {
  if (usia < tabel[0][0] || usia > tabel[tabel.length - 1][0]) return null
  for (let i = 0; i < tabel.length - 1; i++) {
    const [u0, l0, m0, s0] = tabel[i]
    const [u1, l1, m1, s1] = tabel[i + 1]
    if (usia >= u0 && usia <= u1) {
      const t = u1 === u0 ? 0 : (usia - u0) / (u1 - u0)
      return [l0 + t * (l1 - l0), m0 + t * (m1 - m0), s0 + t * (s1 - s0)]
    }
  }
  return null
}

// ── Kalkulasi Z (Box-Cox LMS) ────────────────────────────────────────────────
function zLMS(X: number, L: number, M: number, S: number): number {
  if (Math.abs(L) < 1e-6) return Math.log(X / M) / S
  return (Math.pow(X / M, L) - 1) / (L * S)
}

// ── Hitung usia dalam bulan ──────────────────────────────────────────────────
export function hitungUsiaBulan(tanggalLahir: string, tanggalUkur?: string): number {
  const lahir = new Date(tanggalLahir)
  const ukur = tanggalUkur ? new Date(tanggalUkur) : new Date()
  return Math.max(0, Math.floor((ukur.getTime() - lahir.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)))
}

// ── Klasifikasi ─────────────────────────────────────────────────────────────
function klasGizi(z: number | null): StatusGizi {
  if (z === null) return '-'
  if (z < -3) return 'Gizi Buruk'
  if (z < -2) return 'Gizi Kurang'
  if (z <= 1) return 'Gizi Baik'
  if (z <= 2) return 'Risiko Gizi Lebih'
  if (z <= 3) return 'Gizi Lebih'
  return 'Obesitas'
}

function klasTinggi(z: number | null): StatusTinggi {
  if (z === null) return '-'
  if (z < -3) return 'Sangat Pendek (Stunting Berat)'
  if (z < -2) return 'Pendek (Stunting)'
  if (z <= 3) return 'Normal'
  return 'Tinggi'
}

// ── API utama ────────────────────────────────────────────────────────────────
export function hitungZScore(params: {
  beratKg: number
  tinggiCm: number | null
  tanggalLahir: string
  jenisKelamin: JenisKelaminZ
  tanggalUkur?: string
}): ZScoreResult {
  const { beratKg, tinggiCm, tanggalLahir, jenisKelamin, tanggalUkur } = params
  const usiaBulan = hitungUsiaBulan(tanggalLahir, tanggalUkur)
  const cowok = jenisKelamin === 'L'

  // BB/U
  const lmsBbu = interpolate(cowok ? BBU_L : BBU_P, usiaBulan)
  const bbU = lmsBbu ? zLMS(beratKg, ...lmsBbu) : null

  // TB/U
  const lmsTbu = tinggiCm !== null ? interpolate(cowok ? TBU_L : TBU_P, usiaBulan) : null
  const tbU = lmsTbu && tinggiCm !== null ? zLMS(tinggiCm, ...lmsTbu) : null

  // BB/TB — approx: pakai BB/U karena tabel BB/TB butuh lookup 2D (panjang → BB)
  const bbTb = bbU

  // IMT/U
  let imtU: number | null = null
  if (tinggiCm !== null && tinggiCm > 0 && lmsBbu) {
    const imt = beratKg / Math.pow(tinggiCm / 100, 2)
    imtU = zLMS(imt, ...lmsBbu)
  }

  const statusGizi = klasGizi(bbU)
  const statusTinggi = klasTinggi(tbU)
  const redFlag =
    statusGizi === 'Gizi Buruk' ||
    statusTinggi === 'Sangat Pendek (Stunting Berat)' ||
    statusGizi === 'Gizi Kurang'

  return { bbU, tbU, bbTb, imtU, statusGizi, statusTinggi, usiaBulan, redFlag }
}

// ── Badge warna ──────────────────────────────────────────────────────────────
export function badgeGizi(status: StatusGizi): string {
  const map: Record<StatusGizi, string> = {
    'Gizi Buruk': 'bg-red-600 text-white',
    'Gizi Kurang': 'bg-orange-500/15 text-orange-700',
    'Gizi Baik': 'bg-emerald-500/15 text-emerald-700',
    'Risiko Gizi Lebih': 'bg-yellow-500/15 text-yellow-700',
    'Gizi Lebih': 'bg-amber-500/15 text-amber-700',
    'Obesitas': 'bg-red-500/15 text-red-700',
    '-': 'bg-surface-container text-on-surface-variant',
  }
  return map[status] ?? map['-']
}

export function badgeTinggi(status: StatusTinggi): string {
  const map: Record<StatusTinggi, string> = {
    'Sangat Pendek (Stunting Berat)': 'bg-red-600 text-white',
    'Pendek (Stunting)': 'bg-orange-500/15 text-orange-700',
    'Normal': 'bg-emerald-500/15 text-emerald-700',
    'Tinggi': 'bg-sky-500/15 text-sky-700',
    '-': 'bg-surface-container text-on-surface-variant',
  }
  return map[status] ?? map['-']
}

export function formatZ(z: number | null): string {
  if (z === null) return '-'
  return (z >= 0 ? '+' : '') + z.toFixed(2)
}

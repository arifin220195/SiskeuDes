import { useMemo } from 'react'
import type { Antropometri, Sasaran } from '../types/database'
import { BBU_L, BBU_P, TBU_L, TBU_P, hitungUsiaBulan, type LMSRow } from '../lib/zscore'

// Nilai X untuk Z-score tertentu: X = M * (1 + L*S*Z)^(1/L), L!=0.
// Inversi dari formula Box-Cox yang dipakai engine Z-Score.
function nilaiUntukZ(r: LMSRow, z: number): number {
  const [, L, M, S] = r
  if (Math.abs(L) < 1e-6) return M * Math.exp(S * z)
  const dalam = 1 + L * S * z
  if (dalam <= 0) return M
  return M * Math.pow(dalam, 1 / L)
}

interface Kurva {
  z0: number[]
  zN2: number[]
}

function bangunKurva(tabel: LMSRow[], panahZ: number): Kurva {
  const z0: number[] = []
  const zN: number[] = []
  for (const r of tabel) {
    z0.push(nilaiUntukZ(r, 0))
    zN.push(nilaiUntukZ(r, panahZ))
  }
  return { z0, zN2: zN }
}

interface Titik {
  usia: number
  nilai: number
}

function chartData(
  rowsAntropometri: Antropometri[],
  sasaran: Sasaran,
  pilih: (r: Antropometri) => number | null,
): Titik[] {
  return rowsAntropometri
    .map((r) => ({ usia: hitungUsiaBulan(sasaran.tanggal_lahir, r.tanggal), nilai: pilih(r) }))
    .filter((t): t is Titik => t.nilai !== null && t.nilai > 0)
    .sort((a, b) => a.usia - b.usia)
}

function Chart({
  judul, tabel, titik, satuan, warna = '#0ea5e9',
}: { judul: string; tabel: LMSRow[]; titik: Titik[]; satuan: string; warna?: string }) {
  const { kurva } = useMemo(() => {
    const c = bangunKurva(tabel, -2)
    return { kurva: c }
  }, [tabel])

  const W = 320
  const H = 150
  const padX = 6
  const padY = 8
  const usiaMin = 0
  const usiaMax = tabel[tabel.length - 1][0]

  const semuaNilai = [...titik.map((t) => t.nilai), ...kurva.z0, ...kurva.zN2]
  const vMin = Math.min(...semuaNilai) * 0.94
  const vMax = Math.max(...semuaNilai) * 1.04

  const x = (usia: number) => padX + (usia - usiaMin) / (usiaMax - usiaMin) * (W - padX * 2)
  const y = (nilai: number) => H - padY - ((nilai - vMin) / (vMax - vMin)) * (H - padY * 2)

  const garisKurva = (arr: number[]) => tabel.map((r, i) => `${x(r[0]).toFixed(1)},${y(arr[i]).toFixed(1)}`).join(' ')
  const titik2 = titik.map((t) => `${x(t.usia).toFixed(1)},${y(t.nilai).toFixed(1)}`).join(' ')

  const labelsUsia = [0, 12, 24, 36, 48, 60].filter((u) => u <= usiaMax)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="font-label-xs text-label-xs text-on-surface font-bold uppercase tracking-wider">
          {judul} <span className="text-on-surface-variant font-normal">({satuan})</span>
        </p>
        <div className="flex gap-space-sm">
          <span className="flex items-center gap-1 font-body-xs text-body-xs text-on-surface-variant">
            <i className="inline-block w-3 h-0.5 bg-[#94a3b8]" /> Median
          </span>
          <span className="flex items-center gap-1 font-body-xs text-body-xs text-on-surface-variant">
            <i className="inline-block w-3 h-0.5 bg-rose-400" /> -2 SD
          </span>
          <span className="flex items-center gap-1 font-body-xs text-body-xs text-on-surface-variant">
            <i className="inline-block w-3 h-0.5 bg-primary" /> Ananda
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <line x1={padX} y1={y(kurva.z0[0])} x2={W - padX} y2={y(kurva.z0[0])} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth={0.5} />
        <polyline fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" points={garisKurva(kurva.z0)} />
        <polyline fill="none" stroke="#fb7185" strokeWidth={1} strokeDasharray="2 2" points={garisKurva(kurva.zN2)} />
        {titik.length > 0 && (
          <>
            <polyline fill="none" stroke={warna} strokeWidth={2} strokeLinejoin="round" points={titik2} />
            {titik.map((t, i) => (
              <circle key={i} cx={x(t.usia)} cy={y(t.nilai)} r={2.5} fill={warna} stroke="white" strokeWidth={0.8} />
            ))}
          </>
        )}
        {labelsUsia.map((u) => (
          <text key={u} x={x(u)} y={H - 1} textAnchor="middle" fontSize={6} fill="#94a3b8">
            {u}
          </text>
        ))}
      </svg>
    </div>
  )
}

export default function KmsChart({
  rows, sasaran, minimal = 1,
}: { rows: Antropometri[]; sasaran: Sasaran; minimal?: number }) {
  const cowok = sasaran.jenis_kelamin === 'L'
  const bb = chartData(rows, sasaran, (r) => (r.berat_kg ? Number(r.berat_kg) : null))
  const tb = chartData(rows, sasaran, (r) => (r.tinggi_cm ? Number(r.tinggi_cm) : null))

  if (bb.length < minimal && tb.length < minimal) {
    return (
      <p className="font-body-xs text-body-xs text-on-surface-variant italic">
        Belum ada cukup data untuk menggambar KMS (butuh minimal {minimal} pengukuran).
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
      {bb.length > 0 && <Chart judul="KMS Berat Badan" tabel={cowok ? BBU_L : BBU_P} titik={bb} satuan="kg" />}
      {tb.length > 0 && <Chart judul="KMS Tinggi Badan" tabel={cowok ? TBU_L : TBU_P} titik={tb} satuan="cm" warna="#8b5cf6" />}
    </div>
  )
}
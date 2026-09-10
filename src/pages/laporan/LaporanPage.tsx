import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePosyandu } from '../../lib/posyandu'
import type { Antropometri, Imunisasi, Kegiatan, Kehadiran, Sasaran, Skrining } from '../../types/database'
import type { KelompokSasaran } from '../../types/database'
import { Card, CardHeader, EmptyState, PageHeader, StatCard, btnPrimary, btnSecondary, Chip } from '../../components/ui'
import { KELOMPOK_SINGKAT } from '../../config/kelompok'

const KELOMPOK_URUT: KelompokSasaran[] = ['bayi', 'balita', 'remaja', 'produktif', 'lansia']

export default function LaporanPage() {
  const { list: posyandu, aktifId, setAktif } = usePosyandu()
  const now = new Date()
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [kehadiran, setKehadiran] = useState<Kehadiran[]>([])
  const [antro, setAntro] = useState<Antropometri[]>([])
  const [imunisasi, setImunisasi] = useState<Imunisasi[]>([])
  const [skrining, setSkrining] = useState<Skrining[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const [s, k, kh, a, i, sk] = await Promise.all([
        supabase.from('sasaran').select('*').eq('status', 'aktif'),
        supabase.from('kegiatan').select('*').gte('tanggal', `${ym}-01`).lte('tanggal', `${ym}-31`),
        supabase.from('kehadiran').select('*').gt('created_at', `${ym}-01T00:00:00.000Z`),
        supabase.from('antropometri').select('*').gte('tanggal', `${ym}-01`).lte('tanggal', `${ym}-31`).eq('status_validasi', 'approved'),
        supabase.from('imunisasi').select('*').gte('tanggal', `${ym}-01`).lte('tanggal', `${ym}-31`).eq('status_validasi', 'approved'),
        supabase.from('skrining').select('*').gte('tanggal', `${ym}-01`).lte('tanggal', `${ym}-31`).eq('status_validasi', 'approved'),
      ])
      if (!s.error) setSasaran(s.data ?? [])
      if (!k.error) setKegiatan(k.data ?? [])
      if (!kh.error) setKehadiran(kh.data ?? [])
      if (!a.error) setAntro(a.data ?? [])
      if (!i.error) setImunisasi(i.data ?? [])
      if (!sk.error) setSkrining(sk.data ?? [])
    } finally {
      setBusy(false)
    }
  }, [ym])

  useEffect(() => { void load() }, [load])

  const posFilter = useMemo(() => (id: string) => !aktifId || id === aktifId, [aktifId])

  const kegiatanF = useMemo(() => kegiatan.filter((k) => posFilter(k.posyandu_id)), [kegiatan, posFilter])
  const kehadiranF = useMemo(() => kehadiran.filter((kh) => kegiatanF.some((k) => k.id === kh.kegiatan_id)), [kehadiran, kegiatanF])
  const sasaranF = useMemo(() => sasaran.filter((s) => posFilter(s.posyandu_id)), [sasaran, posFilter])

  const sasaranById = useMemo(() => new Map(sasaranF.map((s) => [s.id, s])), [sasaranF])
  const antroF = useMemo(() => antro.filter((a) => sasaranById.has(a.sasaran_id)), [antro, sasaranById])
  const imunisasiF = useMemo(() => imunisasi.filter((i) => sasaranById.has(i.sasaran_id)), [imunisasi, sasaranById])
  const skriningF = useMemo(() => skrining.filter((s) => sasaranById.has(s.sasaran_id)), [skrining, sasaranById])

  // Statistik gizi per kelompok
  const gizi = useMemo(() => {
    const map = new Map<KelompokSasaran, { ukur: number; normal: number; kurang: number; buruk: number; pendek: number; red: number }>()
    KELOMPOK_URUT.forEach((k) => map.set(k, { ukur: 0, normal: 0, kurang: 0, buruk: 0, pendek: 0, red: 0 }))
    for (const a of antroF) {
      const s = sasaranById.get(a.sasaran_id)
      if (!s) continue
      const row = map.get(s.kelompok)
      if (!row) continue
      row.ukur += 1
      const z = a.z_bbu
      if (z == null) { /* tak tersimpan */ }
      else if (z < -3) row.buruk += 1
      else if (z < -2) row.kurang += 1
      else row.normal += 1
      if (a.z_tbu != null && a.z_tbu < -2) row.pendek += 1
      if (a.red_flag) row.red += 1
    }
    return map
  }, [antroF, sasaranById])

  const antroTotal = useMemo(() => {
    let u = 0, n = 0, k = 0, b = 0, p = 0, r = 0
    for (const row of gizi.values()) { u += row.ukur; n += row.normal; k += row.kurang; b += row.buruk; p += row.pendek; r += row.red }
    return { u, n, k, b, p, r }
  }, [gizi])

  // Imunisasi per antigen
  const imunisasiGroup = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of imunisasiF) map.set(i.antigen, (map.get(i.antigen) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [imunisasiF])

  const skriningStat = useMemo(() => {
    let tinggi = 0, sedang = 0, rendah = 0
    for (const s of skriningF) {
      if (s.red_flag || s.label_risiko === 'tinggi') tinggi += 1
      else if (s.label_risiko === 'sedang') sedang += 1
      else rendah += 1
    }
    return { tinggi, sedang, rendah }
  }, [skriningF])

  const hadir = kehadiranF.filter((k) => k.hadir).length

  const unduhCSV = (filename: string, rows: string[][]) => {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const eksporGizi = useMemo(() => {
    const rows = [['Kelompok', 'Total Sasaran', 'Diukur', 'Normal (BB/U)', 'Kurang (BB/U)', 'Buruk (BB/U)', 'Pendek (TB/U)', 'Red Flag']]
    for (const k of KELOMPOK_URUT) {
      const r = gizi.get(k)!
      const total = sasaranF.filter((s) => s.kelompok === k).length
      rows.push([KELOMPOK_SINGKAT[k as KelompokSasaran], String(total), String(r.ukur), String(r.normal), String(r.kurang), String(r.buruk), String(r.pendek), String(r.red)])
    }
    const t = antroTotal
    rows.push(['TOTAL', String(sasaranF.length), String(t.u), String(t.n), String(t.k), String(t.b), String(t.p), String(t.r)])
    return rows
  }, [gizi, antroTotal, sasaranF])

  const eksporImunisasi = useMemo(() => {
    const rows = [['Antigen', 'Jumlah Dosis']]
    for (const [ag, n] of imunisasiGroup) rows.push([ag, String(n)])
    return rows
  }, [imunisasiGroup])

  return (
    <div className="flex flex-col gap-space-md print-area">
      <div className="print:hidden">
        <PageHeader icon="summarize" title="Laporan Resmi" sub="Rekap bulanan siap PWS & pemantauan (data tervalidasi Nakes)" />
      </div>

      <div className="print:hidden flex flex-wrap gap-space-md items-end">
        <label className="flex flex-col gap-space-xs">
          <span className="font-body-xs text-body-xs text-on-surface-variant font-bold">PERIODE</span>
          <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="border border-outline-variant rounded-lg px-space-xs py-space-xxs font-body-sm text-body-sm text-on-surface bg-surface-container" />
        </label>
        <label className="flex flex-col gap-space-xs">
          <span className="font-body-xs text-body-xs text-on-surface-variant font-bold">POSYANDU</span>
          <select className="border border-outline-variant rounded-lg px-space-xs py-space-xxs font-body-sm text-body-sm text-on-surface bg-surface-container min-w-60" value={aktifId} onChange={(e) => setAktif(e.target.value)}>
            <option value="">— Semua Posyandu —</option>
            {posyandu.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </label>
        <div className="flex gap-space-xs">
          <button className={btnPrimary} onClick={() => window.print()}><span className="material-symbols-rounded text-base">print</span> Cetak</button>
          <button className={btnSecondary} disabled={busy} onClick={() => unduhCSV(`rekap-gizi-${ym}.csv`, eksporGizi)}>Ekspor Gizi (CSV)</button>
          <button className={btnSecondary} disabled={busy} onClick={() => unduhCSV(`rekap-imunisasi-${ym}.csv`, eksporImunisasi)}>Ekspor Imunisasi</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <StatCard icon="groups" label="Sasaran Aktif" value={String(sasaranF.length)} />
        <StatCard icon="event_available" label="Hari Kegiatan" value={String(kegiatanF.length)} />
        <StatCard icon="how_to_reg" label="Kehadiran Bulan Ini" value={String(hadir)} sub={kegiatanF.length ? `${Math.round((hadir / kegiatanF.length) * 10) / 10} org/kegiatan` : 'belum ada kegiatan'} />
        <StatCard icon="monitor_heart" label="Red Flag (Ukur)" value={String(antroTotal.r)} />
      </div>

      <Card>
        <CardHeader title={`Rekap Status Gizi — ${ym}`} sub="Normal (BB/U) / Kurang / Buruk — kolom Pendek pakai TB/U" />
        <div className="overflow-x-auto p-space-sm">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Kelompok', 'Total', 'Diukur', 'Normal (BB/U)', 'Kurang (BB/U)', 'Buruk (BB/U)', 'Pendek ⚠ (TB/U)', 'Red Flag'].map((h) => <th key={h} className="py-space-xs px-space-sm font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {KELOMPOK_URUT.map((k) => {
                const r = gizi.get(k)!
                const total = sasaranF.filter((s) => s.kelompok === k).length
                return (
                  <tr key={k} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-sm font-bold text-on-surface">{KELOMPOK_SINGKAT[k as KelompokSasaran]}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{total}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{r.ukur}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{r.normal}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{r.kurang}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{r.buruk}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{r.pendek}</td>
                    <td className="py-space-xs px-space-sm">{r.red > 0 && <Chip className="bg-red-500/15 text-red-700">RED FLAG</Chip>}</td>
                  </tr>
                )
              })}
              <tr className="bg-surface-container font-bold text-on-surface">
                <td className="py-space-xs px-space-sm">TOTAL</td>
                <td className="py-space-xs px-space-sm">{sasaranF.length}</td>
                <td className="py-space-xs px-space-sm">{antroTotal.u}</td>
                <td className="py-space-xs px-space-sm">{antroTotal.n}</td>
                <td className="py-space-xs px-space-sm">{antroTotal.k}</td>
                <td className="py-space-xs px-space-sm">{antroTotal.b}</td>
                <td className="py-space-xs px-space-sm">{antroTotal.p}</td>
                <td className="py-space-xs px-space-sm">{antroTotal.r}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <Card>
          <CardHeader title="Cakupan Imunisasi" sub="Dosis terlayani bulan ini (tervalidasi)" />
          <div className="p-space-md flex flex-col gap-space-sm">
            {imunisasiGroup.map(([ag, n]) => (
              <div key={ag} className="flex items-center justify-between bg-surface-container rounded-lg px-space-sm py-space-xxs">
                <p className="font-body-sm text-body-sm text-on-surface font-bold">{ag}</p>
                <span className="font-label-md text-label-md text-primary font-bold">{n}</span>
              </div>
            ))}
            {imunisasiGroup.length === 0 && <EmptyState text="Tidak ada imunisasi bulan ini." />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Skrining & Rujukan" sub="Kategori risiko sasaran diskrining" />
          <div className="p-space-md flex flex-col gap-space-sm">
            {[
              { label: 'Risiko Tinggi / Red Flag', val: skriningStat.tinggi, cls: 'bg-red-500/15 text-red-700' },
              { label: 'Risiko Sedang', val: skriningStat.sedang, cls: 'bg-amber-500/15 text-amber-700' },
              { label: 'Risiko Rendah', val: skriningStat.rendah, cls: 'bg-emerald-500/15 text-emerald-700' },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between bg-surface-container rounded-lg px-space-sm py-space-xxs">
                <p className="font-body-sm text-body-sm text-on-surface font-bold">{r.label}</p>
                <Chip className={r.cls}>{r.val}</Chip>
              </div>
            ))}
            {skriningStat.tinggi + skriningStat.sedang + skriningStat.rendah === 0 && <EmptyState text="Tidak ada skrining bulan ini." />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Daftar Kegiatan Bulan Ini" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Posyandu', 'Nama Kegiatan', 'Agenda', 'Kehadiran'].map((h) => <th key={h} className="py-space-xs px-space-sm font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {kegiatanF.map((k) => {
                const hadirK = kehadiranF.filter((x) => x.kegiatan_id === k.id && x.hadir).length
                return (
                  <tr key={k.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-sm text-on-surface">{k.tanggal}</td>
                    <td className="py-space-xs px-space-sm font-bold text-on-surface">{posyandu.find((p) => p.id === k.posyandu_id)?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-sm text-on-surface">{k.nama}</td>
                    <td className="py-space-xs px-space-sm text-on-surface-variant">{k.agenda ?? '—'}</td>
                    <td className="py-space-xs px-space-sm font-bold text-primary">{hadirK} org</td>
                  </tr>
                )
              })}
              {kegiatanF.length === 0 && <tr><td colSpan={5}><EmptyState text="Tidak ada kegiatan bulan ini." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
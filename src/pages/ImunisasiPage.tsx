import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Imunisasi, Sasaran, StandarImunisasi } from '../types/database'
import { usePosyandu } from '../lib/posyandu'
import { Field, SelField, Card, CardHeader, Chip, EmptyState, Notif, PageHeader, btnPrimary } from '../components/ui'
import { KELOMPOK_SINGKAT, umurBulan } from '../config/kelompok'

function today() { return new Date().toISOString().slice(0, 10) }

export default function ImunisasiPage() {
  const { list: posyandu, aktifId, setAktif } = usePosyandu()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [rows, setRows] = useState<Imunisasi[]>([])
  const [standar, setStandar] = useState<StandarImunisasi[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ sasaran_id: '', antigen: '', dosis: '', tanggal: today(), status: 'diberikan', petugas: '', catatan: '' })

  const load = useCallback(async () => {
    const [s, r, st] = await Promise.all([
      supabase.from('sasaran').select('*').eq('status', 'aktif'),
      supabase.from('imunisasi').select('*').order('tanggal', { ascending: false }),
      supabase.from('standar_imunisasi').select('*').eq('aktif', true).order('urutan'),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!r.error) setRows(r.data ?? [])
    if (!st.error) setStandar(st.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const sasaranPos = useMemo(() => sasaran.filter((s) => (!aktifId || s.posyandu_id === aktifId) && ['bayi', 'balita'].includes(s.kelompok)), [sasaran, aktifId])

  const antigenList = useMemo(() => [...new Set(standar.map((s) => s.antigen))], [standar])

  const rowsPerSasaran = useMemo(() => {
    const m = new Map<string, Imunisasi[]>()
    for (const r of rows) m.set(r.sasaran_id, [...(m.get(r.sasaran_id) ?? []), r])
    return m
  }, [rows])

  // Cek keterlambatan per sasaran: antigen standar yang belum diberi & usia sudah lewat umur_maks
  const overdue = useMemo(() => {
    const res: { sasaran: Sasaran; antigen: string; dosis: string }[] = []
    for (const s of sasaranPos) {
      const usia = umurBulan(s.tanggal_lahir)
      const given = new Set((rowsPerSasaran.get(s.id) ?? []).filter((r) => r.status === 'diberikan').map((r) => `${r.antigen}|${r.dosis}`))
      for (const std of standar) {
        const maks = std.umur_maks_bln
        if (maks === null) continue
        if (usia > maks && !given.has(`${std.antigen}|${std.dosis}`)) {
          res.push({ sasaran: s, antigen: std.antigen, dosis: std.dosis })
        }
      }
    }
    return res
  }, [sasaranPos, standar, rowsPerSasaran])

  // Saran antigen/dosis berikut untuk sasaran terpilih
  const saranBerikut = useMemo(() => {
    if (!f.sasaran_id) return null
    const s = sasaranPos.find((x) => x.id === f.sasaran_id)
    if (!s) return null
    const usia = umurBulan(s.tanggal_lahir)
    const given = new Set((rowsPerSasaran.get(s.id) ?? []).filter((r) => r.status === 'diberikan').map((r) => `${r.antigen}|${r.dosis}`))
    for (const std of standar) {
      if (given.has(`${std.antigen}|${std.dosis}`)) continue
      const min = std.umur_min_bln ?? 0
      const maks = std.umur_maks_bln ?? 999
      if (usia >= min) return { antigen: std.antigen, dosis: std.dosis, status: usia > maks ? 'tunda' : 'ok' }
    }
    return { antigen: 'Lengkap', dosis: '', status: 'ok' }
  }, [f.sasaran_id, sasaranPos, standar, rowsPerSasaran])

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!f.sasaran_id || !f.antigen) { setPesan('Pilih sasaran & antigen.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('imunisasi').insert({
        sasaran_id: f.sasaran_id,
        kegiatan_id: null,
        antigen: f.antigen,
        dosis: f.dosis || '1',
        tanggal: f.tanggal,
        status: f.status,
        petugas: f.petugas.trim() || null,
        catatan: f.catatan.trim() || null,
      })
      if (error) throw new Error(error.message)
      const s = sasaranPos.find((x) => x.id === f.sasaran_id)
      setPesan(`${f.antigen} dosis ${f.dosis || '1'} tercatat untuk ${s?.nama ?? '-'}.`)
      setF((x) => ({ ...x, tanggal: today(), status: 'diberikan', petugas: '', catatan: '' }))
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="syringe" title="Imunisasi" sub="Jadwal standar imunisasi nasional + tracking per sasaran & deteksi keterlambatan" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.includes('tercatat') ? 'info' : 'error'} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <Card className="p-space-md flex flex-col gap-space-sm">
          <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Input Pemberian</h3>
          <div className="flex items-center justify-between">
            <SelField label="Posyandu" value={aktifId} onChange={setAktif} options={posyandu.map((p) => ({ value: p.id, label: p.nama }))} allowEmpty="— semua —" />
          </div>
          <form onSubmit={simpan} className="grid grid-cols-1 gap-space-sm">
            <SelField label="Sasaran (bayi/balita)" value={f.sasaran_id} onChange={(v) => setF((x) => ({ ...x, sasaran_id: v }))}
              options={sasaranPos.map((s) => ({ value: s.id, label: `${s.nama} (${umurBulan(s.tanggal_lahir)} bln · ${KELOMPOK_SINGKAT[s.kelompok]})` }))} allowEmpty="— pilih sasaran —" />
            {saranBerikut && saranBerikut.antigen !== 'Lengkap' && (
              <div className={`rounded-lg px-space-sm py-space-xxs font-body-sm text-body-sm ${saranBerikut.status === 'ok' ? 'bg-secondary-container text-on-secondary-fixed-variant' : 'bg-amber-500/15 text-amber-700'}`}>
                Saran berikutnya: <b>{saranBerikut.antigen}</b> dosis {saranBerikut.dosis}
                {saranBerikut.status === 'tunda' && ' (sudah lewat rentang usia — catat status tunda/menolak)'}
              </div>
            )}
            <div className="grid grid-cols-2 gap-space-sm">
              <SelField label="Antigen" value={f.antigen} onChange={(v) => setF((x) => ({ ...x, antigen: v }))}
                options={antigenList.map((a) => ({ value: a, label: a }))} allowEmpty="— pilih —" />
              <Field label="Dosis" value={f.dosis} onChange={(v) => setF((x) => ({ ...x, dosis: v }))} placeholder="mis. 1 / 2 / Booster" />
            </div>
            <div className="grid grid-cols-2 gap-space-sm">
              <Field label="Tanggal" value={f.tanggal} onChange={(v) => setF((x) => ({ ...x, tanggal: v }))} type="date" />
              <SelField label="Status" value={f.status} onChange={(v) => setF((x) => ({ ...x, status: v }))}
                options={['diberikan', 'menolak', 'sakit', 'tunda'].map((s) => ({ value: s, label: s }))} />
            </div>
            <Field label="Petugas" value={f.petugas} onChange={(v) => setF((x) => ({ ...x, petugas: v }))} placeholder="mis. Bidan Desa / Nakes" />
            <Field label="Catatan" value={f.catatan} onChange={(v) => setF((x) => ({ ...x, catatan: v }))} />
            <div>
              <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Menyimpan…' : 'Simpan Pemberian'}</button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="⚠ Keterlambatan Imunisasi" sub={overdue.length ? `${overdue.length} catatan lewat rentang usia` : 'Aman'} />
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                  {['Sasaran', 'Antigen / Dosis', 'Umur'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {overdue.length === 0 && <tr><td colSpan={3}><EmptyState text="Belum ada keterlambatan." /></td></tr>}
                {overdue.map((o, i) => (
                  <tr key={i} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{o.sasaran.nama}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{o.antigen} · {o.dosis}</td>
                    <td className="py-space-xs px-space-md text-on-surface-variant">{umurBulan(o.sasaran.tanggal_lahir)} bln</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Jadwal Standar Imunisasi Nasional" sub="Konfigurasi di tabel standar_imunisasi — dapat disesuaikan" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Urutan', 'Antigen', 'Dosis', 'Umur min', 'Umur maks'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {standar.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant/40 last:border-0">
                  <td className="py-space-xs px-space-md text-on-surface-variant">{s.urutan}</td>
                  <td className="py-space-xs px-space-md font-bold text-on-surface">{s.antigen}</td>
                  <td className="py-space-xs px-space-md text-on-surface">{s.dosis}</td>
                  <td className="py-space-xs px-space-md text-on-surface">{s.umur_min_bln ?? '—'} bln</td>
                  <td className="py-space-xs px-space-md text-on-surface">{s.umur_maks_bln ?? '—'} bln</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Riwayat Pemberian Terbaru" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Sasaran', 'Antigen', 'Dosis', 'Status', 'Validasi'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 30).map((r) => {
                const s = sasaran.find((x) => x.id === r.sasaran_id)
                return (
                  <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.antigen}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.dosis}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.status}</td>
                    <td className="py-space-xs px-space-md">
                      <Chip className={r.status_validasi === 'approved' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'}>{r.status_validasi}</Chip>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={6}><EmptyState text="Belum ada pemberian tercatat." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PelayananKb, Sasaran, Skrining } from '../types/database'
import { useAuth } from '../lib/auth'
import { usePosyandu } from '../lib/posyandu'
import { Field, SelField, Card, CardHeader, Chip, EmptyState, Notif, PageHeader, btnPrimary, Tabs } from '../components/ui'
import { KELOMPOK_SINGKAT, umurSaatIni } from '../config/kelompok'
import { THRESHOLD, parseTD } from '../config/threshold'

function today() { return new Date().toISOString().slice(0, 10) }

type Tab = 'skrining' | 'kb'

export default function SkriningPage() {
  const { list: posyandu, aktifId, setAktif } = usePosyandu()
  const { user } = useAuth()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [rows, setRows] = useState<Skrining[]>([])
  const [kb, setKb] = useState<PelayananKb[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('skrining')
  const [fSkr, setFSkr] = useState<Record<string, string>>({ sasaran_id: '' })
  const [fKb, setFKb] = useState({ sasaran_id: '', alat: 'Pil KB', keterangan: '', tanggal: today() })

  const load = useCallback(async () => {
    const [s, r, k] = await Promise.all([
      supabase.from('sasaran').select('*').eq('status', 'aktif'),
      supabase.from('skrining').select('*').order('tanggal', { ascending: false }),
      supabase.from('pelayanan_kb').select('*').order('tanggal', { ascending: false }),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!r.error) setRows(r.data ?? [])
    if (!k.error) setKb(k.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const sasaranPos = useMemo(() => sasaran.filter((s) => (!aktifId || s.posyandu_id === aktifId)), [sasaran, aktifId])
  const balita = sasaranPos.filter((s) => s.kelompok === 'bayi' || s.kelompok === 'balita')
  const remaja = sasaranPos.filter((s) => s.kelompok === 'remaja')
  const dewasa = sasaranPos.filter((s) => s.kelompok === 'produktif' || s.kelompok === 'lansia')

  const pilihanSasaran = useMemo(() => {
    const b = balita.find((x) => x.id === fSkr.sasaran_id)
    const r = remaja.find((x) => x.id === fSkr.sasaran_id)
    const d = dewasa.find((x) => x.id === fSkr.sasaran_id)
    if (b) return { jenis: 'bayi' as const, s: b }
    if (r) return { jenis: 'remaja' as const, s: r }
    if (d) return { jenis: 'produktif' as const, s: d }
    return null
  }, [fSkr.sasaran_id, balita, remaja, dewasa])

  const fields: Record<string, string[]> = {
    bayi: ['perkembangan', 'td'],
    remaja: ['td', 'lila', 'hb', 'lingkar_perut', 'riwayat_haid', 'merokok'],
    produktif: ['td', 'lingkar_perut', 'gds', 'imt', 'merokok', 'status_kehamilan', 'lila'],
  }

  function labelField(k: string): string {
    const m: Record<string, string> = {
      perkembangan: 'Perkembangan (KPSP singkat)', td: 'Tekanan Darah (mis. 120/80)', lila: 'LILA (cm)',
      hb: 'Hb/Hb meter (g/dL)', lingkar_perut: 'Lingkar Perut (cm)', riwayat_haid: 'Riwayat Haid',
      merokok: 'Perokok?', gds: 'GDS (mg/dL)', imt: 'IMT', status_kehamilan: 'Status Kehamilan (untuk ibu produktif)',
    }
    return m[k] ?? k
  }

  function hitungRisiko(jenis: string): { label: string; red: boolean } {
    const v = fSkr
    if (jenis === 'bayi') {
      return v.perkembangan === 'perlu'
        ? { label: 'tinggi', red: true }
        : { label: 'rendah', red: false }
    }
    const td = parseTD(v.td)
    if (jenis === 'remaja') {
      const hb = Number(v.hb)
      const hbRendah = v.hb && Number.isFinite(hb) && hb < THRESHOLD.remaja.hbMin
      const lila = Number(v.lila)
      const lilaRendah = v.lila && Number.isFinite(lila) && lila < THRESHOLD.remaja.lilaMin
      if (hbRendah || lilaRendah) return { label: 'tinggi', red: true }
      if (td && (td.sistolik >= THRESHOLD.dewasa.tdSistolik || td.diastolik >= THRESHOLD.dewasa.tdDiastolik)) return { label: 'tinggi', red: true }
      return { label: 'rendah', red: false }
    }
    // produktif / lansia
    const gds = Number(v.gds)
    const imt = Number(v.imt)
    const hamilRisiko = v.status_kehamilan === 'hamil' && (() => {
      const lila = Number(v.lila)
      if (v.lila && Number.isFinite(lila) && lila < THRESHOLD.ibuHamil.lilaMin) return true
      return false
    })()
    if (td && (td.sistolik >= THRESHOLD.dewasa.tdSistolik || td.diastolik >= THRESHOLD.dewasa.tdDiastolik)) return { label: 'tinggi', red: true }
    if (v.gds && Number.isFinite(gds) && gds >= THRESHOLD.dewasa.gdsMaks) return { label: 'tinggi', red: true }
    if (v.imt && Number.isFinite(imt) && imt < THRESHOLD.dewasa.imtMin) return { label: 'sedang', red: false }
    if (hamilRisiko) return { label: 'tinggi', red: true }
    if (v.status_kehamilan === 'hamil') return { label: 'sedang', red: false }
    return { label: 'rendah', red: false }
  }

  const risiko = pilihanSasaran ? hitungRisiko(pilihanSasaran.jenis) : null

  async function simpanSkrining(e: React.FormEvent) {
    e.preventDefault()
    if (!pilihanSasaran) { setPesan('Pilih sasaran.'); return }
    const data = Object.fromEntries(Object.entries(fSkr).filter(([k]) => k !== 'sasaran_id').map(([k, val]) => [k, val]))
    setBusy(true)
    try {
      const { error } = await supabase.from('skrining').insert({
        sasaran_id: pilihanSasaran.s.id,
        kelompok: pilihanSasaran.s.kelompok,
        tanggal: today(),
        data,
        label_risiko: risiko?.label ?? 'rendah',
        red_flag: risiko?.red ?? false,
        dibuat_oleh: user?.id ?? null,
      })
      if (error) throw new Error(error.message)
      setPesan(`Skrining ${pilihanSasaran.s.nama} disimpan. Risiko: ${risiko?.label}${risiko?.red ? ' (RED FLAG)' : ''}`)
      setFSkr({ sasaran_id: '' })
      void load()
    } catch (err) {
      setPesan((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function simpanKb(e: React.FormEvent) {
    e.preventDefault()
    if (!fKb.sasaran_id || !fKb.alat) { setPesan('Pilih sasaran & jenis kontrasepsi.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('pelayanan_kb').insert({
        sasaran_id: fKb.sasaran_id, tanggal: fKb.tanggal, alat_kontrasepsi: fKb.alat, keterangan: fKb.keterangan.trim() || null,
      })
      if (error) throw new Error(error.message)
      setPesan('Pelayanan KB tercatat.')
      setFKb((x) => ({ ...x, keterangan: '', tanggal: today() }))
      void load()
    } catch (err) {
      setPesan((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="monitor_heart" title="Skrining Siklus Hidup & PTM" sub="Smart form per kelompok usia — data historis & label risiko otomatis" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.includes('disimpan') || pesan.includes('tercatat') ? 'info' : 'error'} />}

      <Tabs tabs={[{ key: 'skrining', label: 'Skrining' }, { key: 'kb', label: 'Pelayanan KB' }]} value={tab} onChange={setTab} />

      {tab === 'skrining' && (
        <>
          <Card className="p-space-md flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs justify-between flex-wrap">
              <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Form Skrining</h3>
              <SelField label="" value={aktifId} onChange={setAktif} options={posyandu.map((p) => ({ value: p.id, label: p.nama }))} allowEmpty="— semua —" />
            </div>
            <form onSubmit={simpanSkrining} className="flex flex-col gap-space-sm">
              <SelField label="Sasaran" value={fSkr.sasaran_id} onChange={(v) => { setFSkr({ sasaran_id: v }) }}
                options={sasaranPos.map((s) => ({ value: s.id, label: `${s.nama} (${KELOMPOK_SINGKAT[s.kelompok]} · ${umurSaatIni(s.tanggal_lahir)})` }))} allowEmpty="— pilih sasaran —" />
              {pilihanSasaran && (
                <div className="rounded-lg bg-surface-container px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface">
                  Isi data <b>saat ini</b> {pilihanSasaran.jenis === 'bayi' ? '(tumbuh kembang balita)' : pilihanSasaran.jenis === 'remaja' ? '(skrining anemia remaja)' : '(PTM produktif / lansia / ibu hamil)'} — riwayat statis tersimpan otomatis.
                </div>
              )}
              {pilihanSasaran && pilihanSasaran.jenis === 'bayi' && (
                <SelField label={labelField('perkembangan')} value={fSkr.perkembangan ?? ''} onChange={(v) => setFSkr((x) => ({ ...x, perkembangan: v }))}
                  options={[{ value: 'normal', label: 'Normal' }, { value: 'perlu', label: 'Perlu evaluasi (KPSP)' }]} allowEmpty="— pilih —" />
              )}
              {pilihanSasaran && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                  {fields[pilihanSasaran.jenis].map((key) => {
                    if (key === 'status_kehamilan' || key === 'merokok') {
                      return (
                        <SelField key={key} label={labelField(key)} value={fSkr[key] ?? ''} onChange={(v) => setFSkr((x) => ({ ...x, [key]: v }))}
                          options={key === 'status_kehamilan'
                            ? [{ value: 'hamil', label: 'Hamil' }, { value: 'tidak', label: 'Tidak hamil' }]
                            : [{ value: 'ya', label: 'Ya' }, { value: 'tidak', label: 'Tidak' }]} allowEmpty="— pilih —" />
                      )
                    }
                    return <Field key={key} label={labelField(key)} value={fSkr[key] ?? ''} onChange={(v) => setFSkr((x) => ({ ...x, [key]: v }))} placeholder={key === 'td' ? '120/80' : 'isi nilai'} />
                  })}
                </div>
              )}
              {risiko && pilihanSasaran && (
                <div className="flex items-center gap-space-sm">
                  <span className="font-body-sm text-body-sm text-on-surface">Hasil risiko:</span>
                  <Chip className={risiko.red ? 'bg-red-500/15 text-red-700' : risiko.label === 'sedang' ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700'}>{risiko.label.toUpperCase()}</Chip>
                </div>
              )}
              <div>
                <button type="submit" disabled={busy || !pilihanSasaran} className={btnPrimary}>{busy ? 'Menyimpan…' : 'Simpan Skrining'}</button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Riwayat Skrining" sub="Terbaru dulu" />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                    {['Tanggal', 'Sasaran', 'Kelompok', 'Risiko', 'Status'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r) => {
                    const s = sasaran.find((x) => x.id === r.sasaran_id)
                    return (
                      <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                        <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                        <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                        <td className="py-space-xs px-space-md text-on-surface-variant">{KELOMPOK_SINGKAT[r.kelompok]}</td>
                        <td className="py-space-xs px-space-md">
                          <Chip className={r.red_flag ? 'bg-red-500/15 text-red-700' : r.label_risiko === 'sedang' ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700'}>{r.label_risiko}</Chip>
                        </td>
                        <td className="py-space-xs px-space-md text-on-surface-variant">{r.status_validasi}</td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && <tr><td colSpan={5}><EmptyState text="Belum ada skrining." /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'kb' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
          <Card className="p-space-md flex flex-col gap-space-sm">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Catat Pelayanan KB</h3>
            <form onSubmit={simpanKb} className="grid grid-cols-1 gap-space-sm">
              <SelField label="Sasaran (ibu produktif/lansia)" value={fKb.sasaran_id} onChange={(v) => setFKb((x) => ({ ...x, sasaran_id: v }))}
                options={dewasa.map((s) => ({ value: s.id, label: `${s.nama} (${umurSaatIni(s.tanggal_lahir)})` }))} allowEmpty="— pilih sasaran —" />
              <SelField label="Alat / Metode Kontrasepsi" value={fKb.alat} onChange={(v) => setFKb((x) => ({ ...x, alat: v }))}
                options={['Pil KB', 'Suntik KB 1 bln', 'Suntik KB 3 bln', 'IUD/AKDR', 'Implan', 'Kondom', 'MOW', 'MOP'].map((a) => ({ value: a, label: a }))} />
              <Field label="Tanggal" value={fKb.tanggal} onChange={(v) => setFKb((x) => ({ ...x, tanggal: v }))} type="date" />
              <Field label="Keterangan" value={fKb.keterangan} onChange={(v) => setFKb((x) => ({ ...x, keterangan: v }))} />
              <div><button type="submit" disabled={busy} className={btnPrimary}>{busy ? '…' : 'Simpan'}</button></div>
            </form>
          </Card>
          <Card>
            <CardHeader title="Riwayat KB" sub={`${new Set(kb.map((k) => k.sasaran_id)).size} peserta aktif tercatat`} />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                    {['Tanggal', 'Sasaran', 'Kontrasepsi', 'Status'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {kb.slice(0, 20).map((k) => {
                    const s = sasaran.find((x) => x.id === k.sasaran_id)
                    return (
                      <tr key={k.id} className="border-b border-outline-variant/40 last:border-0">
                        <td className="py-space-xs px-space-md text-on-surface">{k.tanggal}</td>
                        <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                        <td className="py-space-xs px-space-md text-on-surface">{k.alat_kontrasepsi}</td>
                        <td className="py-space-xs px-space-md text-on-surface-variant">{k.status_validasi}</td>
                      </tr>
                    )
                  })}
                  {kb.length === 0 && <tr><td colSpan={4}><EmptyState text="Belum ada data KB." /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
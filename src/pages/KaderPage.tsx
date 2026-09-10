import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Kompetensi, Kunjungan, Materi, Penyuluhan, Sasaran } from '../types/database'
import { useAuth } from '../lib/auth'
import { usePosyandu } from '../lib/posyandu'
import { Field, SelField, Card, CardHeader, EmptyState, Notif, PageHeader, btnPrimary, Tabs } from '../components/ui'
import { KELOMPOK_SINGKAT, umurBulan, umurSaatIni } from '../config/kelompok'

function today() { return new Date().toISOString().slice(0, 10) }

type Tab = 'kunjungan' | 'penyuluhan' | 'kompetensi'

export default function KaderPage() {
  const { aktifId } = usePosyandu()
  const { user, profile } = useAuth()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [kunjungan, setKunjungan] = useState<Kunjungan[]>([])
  const [penyuluhan, setPenyuluhan] = useState<Penyuluhan[]>([])
  const [materi, setMateri] = useState<Materi[]>([])
  const [kompetensi, setKompetensi] = useState<Kompetensi[]>([])
  const [selesaiSet, setSelesaiSet] = useState<Set<string>>(new Set())
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('kunjungan')
  const [fKunj, setFKunj] = useState({ sasaran_id: '', tanggal: today(), alasan: 'Red Flag gizi', petugas: '', hasil: '', tindak_lanjut: '' })
  const [fPeny, setFPeny] = useState({ topik: '', tanggal: today(), lokasi: '', sasaran: '', jumlah_peserta: '', petugas: '' })

  const load = useCallback(async () => {
    const [s, k, p, m, km, ks] = await Promise.all([
      supabase.from('sasaran').select('*').eq('status', 'aktif'),
      supabase.from('kunjungan').select('*').order('tanggal', { ascending: false }),
      supabase.from('penyuluhan').select('*').order('tanggal', { ascending: false }),
      supabase.from('materi').select('*').order('topik'),
      supabase.from('kompetensi').select('*').order('nomor'),
      user ? supabase.from('kompetensi_kader').select('kompetensi_id').eq('kader_id', user.id) : Promise.resolve({ data: [], error: null }),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!k.error) setKunjungan(k.data ?? [])
    if (!p.error) setPenyuluhan(p.data ?? [])
    if (!m.error) setMateri(m.data ?? [])
    if (!km.error) setKompetensi(km.data ?? [])
    if (!ks.error) setSelesaiSet(new Set(((ks.data as { kompetensi_id: string }[]) ?? []).map((r) => r.kompetensi_id)))
  }, [user])

  useEffect(() => { void load() }, [load])

  const sasaranPos = useMemo(() => sasaran.filter((s) => (!aktifId || s.posyandu_id === aktifId)), [sasaran, aktifId])

  // Prioritas kunjungan: anak di bawah 24 bulan (rawan gizi)
  const prioritas = useMemo(() => {
    return sasaranPos
      .filter((s) => ['bayi', 'balita'].includes(s.kelompok))
      .sort((a, b) => umurBulan(a.tanggal_lahir) - umurBulan(b.tanggal_lahir))
  }, [sasaranPos])

  async function simpanKunjungan(e: React.FormEvent) {
    e.preventDefault()
    if (!fKunj.sasaran_id || fKunj.alasan.trim().length < 3) { setPesan('Pilih sasaran & alasan.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('kunjungan').insert({
        sasaran_id: fKunj.sasaran_id, tanggal: fKunj.tanggal, alasan: fKunj.alasan.trim(),
        petugas: fKunj.petugas.trim() || null, hasil: fKunj.hasil.trim() || null,
        tindak_lanjut: fKunj.tindak_lanjut.trim() || null, dibuat_oleh: user?.id ?? null,
      })
      if (error) throw new Error(error.message)
      setPesan('Kunjungan rumah tercatat. Loop pemantauan tertutup.')
      setFKunj((x) => ({ ...x, tanggal: today(), hasil: '', tindak_lanjut: '' }))
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function simpanPenyuluhan(e: React.FormEvent) {
    e.preventDefault()
    if (fPeny.topik.trim().length < 3) { setPesan('Isi topik penyuluhan.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('penyuluhan').insert({
        topik: fPeny.topik.trim(), tanggal: fPeny.tanggal, lokasi: fPeny.lokasi.trim(),
        sasaran: fPeny.sasaran.trim(), jumlah_peserta: Number(fPeny.jumlah_peserta) || 0, petugas: fPeny.petugas.trim(),
      })
      if (error) throw new Error(error.message)
      setPesan('Penyuluhan tercatat.')
      setFPeny({ topik: '', tanggal: today(), lokasi: '', sasaran: '', jumlah_peserta: '', petugas: '' })
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleKompetensi(id: string) {
    if (!user) return
    const sudah = selesaiSet.has(id)
    setBusy(true)
    try {
      if (sudah) {
        const { error } = await supabase.from('kompetensi_kader').delete().eq('kader_id', user.id).eq('kompetensi_id', id)
        if (error) throw new Error(error.message)
        setSelesaiSet((prev) => { const n = new Set(prev); n.delete(id); return n })
      } else {
        const { error } = await supabase.from('kompetensi_kader').insert({ kader_id: user.id, kompetensi_id: id })
        if (error) throw new Error(error.message)
        setSelesaiSet((prev) => new Set(prev).add(id))
      }
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const progres = kompetensi.length ? Math.round((selesaiSet.size / kompetensi.length) * 100) : 0

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="home_health" title="Kunjungan Rumah & Kapasitas Kader" sub="Outreach sasaran Red Flag + penyuluhan + checklist 25 kompetensi ILP" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.includes('tercatat') ? 'info' : 'error'} />}

      <Tabs tabs={[
        { key: 'kunjungan', label: 'Kunjungan Rumah' },
        { key: 'penyuluhan', label: 'Penyuluhan & Materi' },
        { key: 'kompetensi', label: `Kompetensi Kader (${selesaiSet.size}/${kompetensi.length})` },
      ]} value={tab} onChange={setTab} />

      {tab === 'kunjungan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
          <Card className="p-space-md flex flex-col gap-space-sm">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Tambah Kunjungan</h3>
            <form onSubmit={simpanKunjungan} className="grid grid-cols-1 gap-space-sm">
              <SelField label="Sasaran" value={fKunj.sasaran_id} onChange={(v) => setFKunj((x) => ({ ...x, sasaran_id: v }))}
                options={sasaranPos.map((s) => ({ value: s.id, label: `${s.nama} (${KELOMPOK_SINGKAT[s.kelompok]} · ${umurSaatIni(s.tanggal_lahir)})` }))} allowEmpty="— pilih sasaran —" />
              <Field label="Tanggal" value={fKunj.tanggal} onChange={(v) => setFKunj((x) => ({ ...x, tanggal: v }))} type="date" />
              <Field label="Alasan" value={fKunj.alasan} onChange={(v) => setFKunj((x) => ({ ...x, alasan: v }))} placeholder="mis. BB turun, stunting, tidak hadir 2x" />
              <Field label="Petugas" value={fKunj.petugas} onChange={(v) => setFKunj((x) => ({ ...x, petugas: v }))} />
              <Field label="Hasil Kunjungan" value={fKunj.hasil} onChange={(v) => setFKunj((x) => ({ ...x, hasil: v }))} placeholder="temuan di lapangan" />
              <Field label="Tindak Lanjut" value={fKunj.tindak_lanjut} onChange={(v) => setFKunj((x) => ({ ...x, tindak_lanjut: v }))} placeholder="mis. rujuk ke Puskesmas / PMT" />
              <div><button type="submit" disabled={busy} className={btnPrimary}>{busy ? '…' : 'Simpan Kunjungan'}</button></div>
            </form>
          </Card>
          <Card>
            <CardHeader title="Prioritas Kunjungan" sub="Bayi & balita termuda (rawan gizi) — urutkan dari paling muda" />
            <p>Prioritas kunjungan adalah sasaran termuda.</p>
            <ul className="px-space-md pb-space-md flex flex-col gap-space-xs">
              {prioritas.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between bg-surface-container rounded-lg px-space-sm py-space-xxs">
                  <span className="font-body-sm text-body-sm text-on-surface font-bold">{s.nama}</span>
                  <span className="font-body-xs text-body-xs text-on-surface-variant">{umurSaatIni(s.tanggal_lahir)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'kunjungan' && (
        <Card>
          <CardHeader title="Log Kunjungan" sub="Closed-loop: catat hasil & tindak lanjut sampai kasus selesai" />
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                  {['Tanggal', 'Sasaran', 'Alasan', 'Hasil', 'Tindak Lanjut'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {kunjungan.slice(0, 30).map((k) => {
                  const s = sasaran.find((x) => x.id === k.sasaran_id)
                  return (
                    <tr key={k.id} className="border-b border-outline-variant/40 last:border-0">
                      <td className="py-space-xs px-space-md text-on-surface">{k.tanggal}</td>
                      <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{k.alasan}</td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{k.hasil ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{k.tindak_lanjut ?? '—'}</td>
                    </tr>
                  )
                })}
                {kunjungan.length === 0 && <tr><td colSpan={5}><EmptyState text="Belum ada kunjungan." /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'penyuluhan' && (
        <>
          <Card className="p-space-md flex flex-col gap-space-sm">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Catat Penyuluhan</h3>
            <form onSubmit={simpanPenyuluhan} className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              <Field label="Topik" value={fPeny.topik} onChange={(v) => setFPeny((x) => ({ ...x, topik: v }))} placeholder="mis. Gizi Balita" />
              <Field label="Tanggal" value={fPeny.tanggal} onChange={(v) => setFPeny((x) => ({ ...x, tanggal: v }))} type="date" />
              <Field label="Lokasi" value={fPeny.lokasi} onChange={(v) => setFPeny((x) => ({ ...x, lokasi: v }))} />
              <Field label="Sasaran" value={fPeny.sasaran} onChange={(v) => setFPeny((x) => ({ ...x, sasaran: v }))} placeholder="mis. Ibu balita" />
              <Field label="Jumlah Peserta" value={fPeny.jumlah_peserta} onChange={(v) => setFPeny((x) => ({ ...x, jumlah_peserta: v }))} type="number" />
              <div className="flex gap-space-xs items-end">
                <button type="submit" disabled={busy} className={btnPrimary}>{busy ? '…' : 'Simpan'}</button>
              </div>
            </form>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            <Card>
              <CardHeader title="Riwayat Penyuluhan" />
              <div className="p-space-md flex flex-col gap-space-sm">
                {penyuluhan.slice(0, 10).map((p) => (
                  <div key={p.id} className="bg-surface-container rounded-lg px-space-sm py-space-xxs flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-body-sm text-body-sm text-on-surface font-bold truncate">{p.topik}</p>
                      <p className="font-body-xs text-body-xs text-on-surface-variant">{p.tanggal} · {p.lokasi}</p>
                    </div>
                    <span className="font-label-md text-label-md text-primary font-bold whitespace-nowrap">{p.jumlah_peserta} org</span>
                  </div>
                ))}
                {penyuluhan.length === 0 && <EmptyState text="Belum ada penyuluhan." />}
              </div>
            </Card>
            <Card>
              <CardHeader title="📚 Digital Library — Materi Edukasi" sub="Digunakan pada Meja 4 penyuluhan" />
              <div className="p-space-md flex flex-col gap-space-sm">
                {materi.map((m) => (
                  <div key={m.id} className="bg-surface-container rounded-lg px-space-sm py-space-xxs">
                    <p className="font-body-sm text-body-sm text-on-surface font-bold">{m.topik}</p>
                    <p className="font-body-xs text-body-xs text-on-surface-variant">{KELOMPOK_SINGKAT[m.kelompok]} · {m.deskripsi}</p>
                  </div>
                ))}
                {materi.length === 0 && <EmptyState text="Belum ada materi." />}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === 'kompetensi' && (
        <Card>
          <CardHeader
            title={`Checklist 25 Kompetensi Dasar ILP — ${profile?.nama ?? 'Kader'}`}
            sub={`Progres ${selesaiSet.size}/${kompetensi.length} (${progres}%)`}
            action={
              <div className="w-40">
                <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progres}%` }} />
                </div>
              </div>
            }
          />
          <div className="p-space-md grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm">
            {kompetensi.map((k) => {
              const done = selesaiSet.has(k.id)
              return (
                <button
                  key={k.id}
                  onClick={() => void toggleKompetensi(k.id)}
                  disabled={busy}
                  className={`flex items-center gap-space-sm p-space-sm rounded-lg border transition-colors text-left ${
                    done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-surface-container border-transparent hover:bg-surface-container-high'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-on-surface-variant'
                  }`}>
                    {done && <span className="text-xs">✓</span>}
                  </span>
                  <div className="min-w-0">
                    <p className="font-body-sm text-body-sm text-on-surface font-bold truncate">{k.nomor}. {k.judul}</p>
                    {k.deskripsi && <p className="font-body-xs text-body-xs text-on-surface-variant">{k.deskripsi}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Kompetensi, Materi, Posyandu, Wilayah } from '../../types/database'
import { useAuth } from '../../lib/auth'
import { Field, SelField, Card, CardHeader, Chip, EmptyState, Notif, PageHeader, btnPrimary, Tabs } from '../../components/ui'
import { KELOMPOK_SINGKAT } from '../../config/kelompok'

type Tab = 'posyandu' | 'wilayah' | 'standar'

export default function KonfigurasiPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('posyandu')
  const [posyandu, setPosyandu] = useState<Posyandu[]>([])
  const [wilayah, setWilayah] = useState<Wilayah[]>([])
  const [standar, setStandar] = useState<any[]>([])
  const [kompetensi, setKompetensi] = useState<Kompetensi[]>([])
  const [materi, setMateri] = useState<Materi[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [fPos, setFPos] = useState({ nama: '', dusun: '', rw: '', rt: '', tipe: 'kegiatan', jadwal_buka: '' })
  const [fWil, setFWil] = useState({ nama: '', jenis: 'dusun', induk_id: '' })

  const bolehUbah = profile?.role === 'superadmin' || profile?.role === 'nakes'

  const load = useCallback(async () => {
    const [p, w, s, k, m] = await Promise.all([
      supabase.from('posyandu').select('*').order('nama'),
      supabase.from('wilayah').select('*').order('nama'),
      supabase.from('standar_imunisasi').select('*').order('umur_bulan').order('nomor'),
      supabase.from('kompetensi').select('*').order('nomor'),
      supabase.from('materi').select('*').order('topik'),
    ])
    if (!p.error) setPosyandu(p.data ?? [])
    if (!w.error) setWilayah(w.data ?? [])
    if (!s.error) setStandar(s.data ?? [])
    if (!k.error) setKompetensi(k.data ?? [])
    if (!m.error) setMateri(m.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  async function simpanPos(e: React.FormEvent) {
    e.preventDefault()
    if (!fPos.nama.trim()) { setPesan('Isi nama posyandu.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('posyandu').insert({
        nama: fPos.nama.trim(), dusun: fPos.dusun.trim() || null, rw: fPos.rw.trim() || null,
        rt: fPos.rt.trim() || null, tipe: fPos.tipe, jadwal_buka: fPos.jadwal_buka.trim() || null,
      })
      if (error) throw new Error(error.message)
      setPesan('Posyandu dibuat.')
      setFPos({ nama: '', dusun: '', rw: '', rt: '', tipe: 'kegiatan', jadwal_buka: '' })
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function simpanWil(e: React.FormEvent) {
    e.preventDefault()
    if (!fWil.nama.trim()) { setPesan('Isi nama wilayah.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('wilayah').insert({
        nama: fWil.nama.trim(), jenis: fWil.jenis, induk_id: fWil.induk_id || null,
      })
      if (error) throw new Error(error.message)
      setPesan('Wilayah ditambahkan.')
      setFWil({ nama: '', jenis: 'dusun', induk_id: '' })
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const dusun = wilayah.filter((w) => w.jenis === 'dusun')

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="settings" title="Konfigurasi Posyandu" sub="Master data posyandu, wilayah RT/RW, dan standar jadwal imunisasi" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.includes('dibuat') || pesan.includes('ditambahkan') ? 'info' : 'error'} />}

      {!bolehUbah && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-space-md font-body-sm text-body-sm text-amber-700">
          Akun {profile?.role} bersifat hanya-baca pada master data. Hubungi Nakes/Super Admin untuk mengubah.
        </div>
      )}

      <Tabs tabs={[
        { key: 'posyandu', label: `Posyandu (${posyandu.length})` },
        { key: 'wilayah', label: `Wilayah (${wilayah.length})` },
        { key: 'standar', label: 'Standar Imunisasi & Materi' },
      ]} value={tab} onChange={setTab} />

      {tab === 'posyandu' && (
        <>
          <Card className="p-space-md flex flex-col gap-space-sm">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Tambah Posyandu</h3>
            <form onSubmit={simpanPos} className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              <Field label="Nama Posyandu" value={fPos.nama} onChange={(v) => setFPos((x) => ({ ...x, nama: v }))} placeholder="mis. Posyandu Melati" />
              <Field label="Dusun" value={fPos.dusun} onChange={(v) => setFPos((x) => ({ ...x, dusun: v }))} />
              <SelField label="Tipe" value={fPos.tipe} onChange={(v) => setFPos((x) => ({ ...x, tipe: v }))}
                options={[{ value: 'kegiatan', label: 'Kegiatan rutin' }, { value: 'selter', label: 'Selter / dasawisma' }, { value: 'mobile', label: 'Mobile / gerakan' }]} />
              <Field label="RW" value={fPos.rw} onChange={(v) => setFPos((x) => ({ ...x, rw: v }))} placeholder="mis. 03" />
              <Field label="RT" value={fPos.rt} onChange={(v) => setFPos((x) => ({ ...x, rt: v }))} placeholder="mis. 05" />
              <Field label="Jadwal Buka" value={fPos.jadwal_buka} onChange={(v) => setFPos((x) => ({ ...x, jadwal_buka: v }))} placeholder="mis. Kamis pekan ke-2, 08.00-11.00" />
              <div className="md:col-span-3 flex items-center gap-space-sm">
                {bolehUbah ? <button type="submit" disabled={busy} className={btnPrimary}>{busy ? '…' : 'Simpan Posyandu'}</button> : <span className="font-body-sm text-body-sm text-on-surface-variant">Master data hanya untuk Nakes/Super Admin.</span>}
              </div>
            </form>
          </Card>
          <Card>
            <CardHeader title="Daftar Posyandu" />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                    {['Nama', 'Dusun', 'RW/RT', 'Tipe', 'Jadwal'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {posyandu.map((p) => (
                    <tr key={p.id} className="border-b border-outline-variant/40 last:border-0">
                      <td className="py-space-xs px-space-md font-bold text-on-surface">{p.nama}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{p.dusun ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{p.rw ? `RW ${p.rw}` : ''}{p.rw && p.rt ? ' / ' : ''}{p.rt ? `RT ${p.rt}` : ''}</td>
                      <td className="py-space-xs px-space-md"><Chip>{p.tipe}</Chip></td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{p.jadwal_buka ?? '—'}</td>
                    </tr>
                  ))}
                  {posyandu.length === 0 && <tr><td colSpan={5}><EmptyState text="Belum ada posyandu. Buat dulu." /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'wilayah' && (
        <>
          <Card className="p-space-md flex flex-col gap-space-sm">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Tambah Wilayah</h3>
            <form onSubmit={simpanWil} className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              <Field label="Nama" value={fWil.nama} onChange={(v) => setFWil((x) => ({ ...x, nama: v }))} />
              <SelField label="Jenis" value={fWil.jenis} onChange={(v) => setFWil((x) => ({ ...x, jenis: v }))}
                options={[{ value: 'dusun', label: 'Dusun' }, { value: 'rw', label: 'RW' }, { value: 'rt', label: 'RT' }, { value: 'kadus', label: 'Kadus/Kepala RT' }]} />
              <SelField label="Induk" value={fWil.induk_id} onChange={(v) => setFWil((x) => ({ ...x, induk_id: v }))}
                options={dusun.map((d) => ({ value: d.id, label: d.nama }))} allowEmpty="— tanpa induk —" />
              <div className="md:col-span-3">
                {bolehUbah ? <button type="submit" disabled={busy} className={btnPrimary}>{busy ? '…' : 'Simpan Wilayah'}</button> : <span className="font-body-sm text-body-sm text-on-surface-variant">Master data hanya untuk Nakes/Super Admin.</span>}
              </div>
            </form>
          </Card>
          <Card>
            <CardHeader title="Struktur Wilayah" />
            <div className="p-space-md grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm">
              {wilayah.map((w) => (
                <div key={w.id} className="bg-surface-container rounded-lg px-space-sm py-space-xs flex items-center justify-between">
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface font-bold">{w.nama}</p>
                    <p className="font-body-xs text-body-xs text-on-surface-variant">{w.jenis}</p>
                  </div>
                  <Chip>#{w.induk_id ? wilayah.find((x) => x.id === w.induk_id)?.nama ?? 'sub' : 'root'}</Chip>
                </div>
              ))}
              {wilayah.length === 0 && <EmptyState text="Belum ada wilayah." />}
            </div>
          </Card>
        </>
      )}

      {tab === 'standar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
          <Card>
            <CardHeader title="Standar Imunisasi Nasional" sub="Jadwal imunisasi dasar lengkap (sd. 24 bulan)" />
            <div className="p-space-md flex flex-col gap-space-xs">
              {standar.map((r) => (
                <div key={r.id} className="flex items-center gap-space-sm bg-surface-container rounded-lg px-space-sm py-space-xxs">
                  <Chip className="bg-primary-container text-on-primary-container font-bold">{r.umur_bulan} bln</Chip>
                  <div className="min-w-0 flex-1">
                    <p className="font-body-sm text-body-sm text-on-surface font-bold">{r.antigen} {r.dosis}</p>
                    {r.keterangan && <p className="font-body-xs text-body-xs text-on-surface-variant">{r.keterangan}</p>}
                  </div>
                </div>
              ))}
              {standar.length === 0 && <EmptyState text="Standar belum di-seed. Jalankan migrasi 0015." />}
            </div>
          </Card>
          <div className="flex flex-col gap-space-md">
            <Card>
              <CardHeader title="25 Kompetensi ILP Kader" sub={`${kompetensi.length} item`} />
              <div className="p-space-md flex flex-wrap gap-space-xs">
                {kompetensi.map((k) => (
                  <Chip key={k.id} className="bg-surface-container-high text-on-surface-variant font-bold">{k.nomor}</Chip>
                ))}
                {kompetensi.length === 0 && <EmptyState text="Belum ter-seed." />}
              </div>
            </Card>
            <Card>
              <CardHeader title="Materi Edukasi" sub="Digital library — tampil di Meja 4 & Kader" />
              <div className="p-space-md flex flex-col gap-space-sm">
                {materi.map((m) => (
                  <div key={m.id} className="bg-surface-container rounded-lg px-space-sm py-space-xxs">
                    <p className="font-body-sm text-body-sm text-on-surface font-bold">{m.topik} <span className="text-on-surface-variant font-normal">· {KELOMPOK_SINGKAT[m.kelompok]}</span></p>
                    {m.deskripsi && <p className="font-body-xs text-body-xs text-on-surface-variant">{m.deskripsi}</p>}
                  </div>
                ))}
                {materi.length === 0 && <EmptyState text="Belum ter-seed." />}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Antropometri, Imunisasi, Kegiatan, Kehadiran, Sasaran } from '../types/database'
import { useAuth } from '../lib/auth'
import { usePosyandu } from '../lib/posyandu'
import { Field, SelField, Card, CardHeader, Chip, EmptyState, Notif, PageHeader, btnPrimary, btnSecondary } from '../components/ui'
import { KELOMPOK_SINGKAT, umurSaatIni } from '../config/kelompok'
import { badgeGizi, badgeTinggi, formatZ, hitungZScore } from '../lib/zscore'

function today() { return new Date().toISOString().slice(0, 10) }

type Tab = 'meja1' | 'meja23' | 'meja4' | 'meja5'

export default function KegiatanPage() {
  const { list: posyandu, aktif, aktifId, setAktif, locked } = usePosyandu()
  const { user } = useAuth()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [kegiatans, setKegiatans] = useState<Kegiatan[]>([])
  const [kehadiran, setKehadiran] = useState<Kehadiran[]>([])
  const [antropometri, setAntropometri] = useState<Antropometri[]>([])
  const [imunisasi, setImunisasi] = useState<Imunisasi[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [kegiatanId, setKegiatanId] = useState('')
  const [tab, setTab] = useState<Tab>('meja1')
  const [formKeg, setFormKeg] = useState({ tanggal: today(), nama: 'Posyandu Bulanan', agenda: '' })
  const [hadirMap, setHadirMap] = useState<Record<string, boolean>>({})
  const [fUkur, setFUkur] = useState({ sasaran_id: '', berat: '', tinggi: '', lika: '', lila: '', catatan: '' })
  const [fPeny, setFPeny] = useState({ topik: '', lokasi: '', sasaran: '', jumlah_peserta: '', petugas: '' })

  const load = useCallback(async () => {
    const [s, k, kh, a, im] = await Promise.all([
      supabase.from('sasaran').select('*').eq('status', 'aktif'),
      supabase.from('kegiatan').select('*').order('tanggal', { ascending: false }),
      supabase.from('kehadiran').select('*'),
      supabase.from('antropometri').select('*').order('tanggal', { ascending: false }),
      supabase.from('imunisasi').select('*').order('tanggal', { ascending: false }),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!k.error) setKegiatans(k.data ?? [])
    if (!kh.error) setKehadiran(kh.data ?? [])
    if (!a.error) setAntropometri(a.data ?? [])
    if (!im.error) setImunisasi(im.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const kegiatanPos = useMemo(() => kegiatans.filter((k) => k.posyandu_id === aktifId), [kegiatans, aktifId])
  const kegiatanAktif = kegiatanPos.find((k) => k.id === kegiatanId) ?? null
  const sasaranPos = useMemo(() => sasaran.filter((s) => s.posyandu_id === aktifId), [sasaran, aktifId])

  useEffect(() => {
    if (!kegiatanAktif) return
    const m: Record<string, boolean> = {}
    for (const s of sasaranPos) {
      const rec = kehadiran.find((k) => k.kegiatan_id === kegiatanAktif.id && k.sasaran_id === s.id)
      m[s.id] = rec ? rec.hadir : false
    }
    setHadirMap(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kegiatanAktif?.id, kehadiran, sasaranPos.length])

  async function buatKegiatan(e: React.FormEvent) {
    e.preventDefault()
    if (!formKeg.tanggal || !aktifId) { setPesan('Pilih posyandu & tanggal.'); return }
    setBusy(true)
    const { data, error } = await supabase.from('kegiatan').insert({
      posyandu_id: aktifId, tanggal: formKeg.tanggal, nama: formKeg.nama.trim(),
      agenda: formKeg.agenda.trim() || null, dibuat_oleh: user?.id ?? null,
    }).select('id').single()
    setBusy(false)
    if (error) {
      setPesan(error.message)
      if (error.code === '23505') setPesan('Kegiatan untuk tanggal ini sudah ada. Pilih tanggal lain atau buka kegiatan tersebut.')
      return
    }
    setKegiatanId(data.id)
    setPesan('Kegiatan dibuat. Lanjut ke Meja 1 — Absensi.')
    void load()
  }

  async function simpanAbsensi() {
    if (!kegiatanAktif) return
    const ids = sasaranPos.filter((s) => hadirMap[s.id]).map((s) => s.id)
    setBusy(true)
    try {
      const { error } = await supabase.from('kehadiran').upsert(
        ids.map((sid) => ({ kegiatan_id: kegiatanAktif.id, sasaran_id: sid, hadir: true })),
        { onConflict: 'kegiatan_id,sasaran_id' },
      )
      if (error) throw new Error(error.message)
      // tandai tidak hadir: hapus catatan hadir utk yg tidak dicentang
      const { error: del } = await supabase
        .from('kehadiran')
        .delete()
        .eq('kegiatan_id', kegiatanAktif.id)
        .in('sasaran_id', sasaranPos.filter((s) => !hadirMap[s.id]).map((s) => s.id))
      if (del) throw new Error(del.message)
      setPesan(`Absensi disimpan: ${ids.length} hadir dari ${sasaranPos.length} sasaran.`)
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const balitaUkur = sasaranPos.find((s) => s.id === fUkur.sasaran_id) ?? null
  const zLive = balitaUkur && fUkur.berat
    ? hitungZScore({
        beratKg: Number(fUkur.berat),
        tinggiCm: fUkur.tinggi ? Number(fUkur.tinggi) : null,
        tanggalLahir: balitaUkur.tanggal_lahir,
        jenisKelamin: balitaUkur.jenis_kelamin,
        tanggalUkur: kegiatanAktif?.tanggal ?? today(),
      })
    : null

  async function simpanUkur(e: React.FormEvent) {
    e.preventDefault()
    if (!balitaUkur) { setPesan('Pilih sasaran.'); return }
    const berat = Number(fUkur.berat)
    if (!berat || berat <= 0) { setPesan('Berat wajib diisi.'); return }
    const tinggi = fUkur.tinggi ? Number(fUkur.tinggi) : null
    const lika = fUkur.lika ? Number(fUkur.lika) : null
    const z = hitungZScore({
      beratKg: berat, tinggiCm: tinggi, tanggalLahir: balitaUkur.tanggal_lahir,
      jenisKelamin: balitaUkur.jenis_kelamin, tanggalUkur: kegiatanAktif?.tanggal ?? today(),
    })
    setBusy(true)
    try {
      const { error } = await supabase.from('antropometri').insert({
        sasaran_id: balitaUkur.id,
        kegiatan_id: kegiatanAktif?.id ?? null,
        tanggal: kegiatanAktif?.tanggal ?? today(),
        berat_kg: berat,
        tinggi_cm: tinggi,
        lika_cm: lika,
        lila_cm: fUkur.lila ? Number(fUkur.lila) : null,
        z_bbu: z.bbU === null ? null : Number(z.bbU.toFixed(2)),
        z_tbu: z.tbU === null ? null : Number(z.tbU.toFixed(2)),
        z_bbtb: z.bbTb === null ? null : Number(z.bbTb.toFixed(2)),
        z_imtu: z.imtU === null ? null : Number(z.imtU.toFixed(2)),
        status_gizi: z.statusGizi === '-' ? null : z.statusGizi,
        status_tinggi: z.statusTinggi === '-' ? null : z.statusTinggi,
        red_flag: z.redFlag,
        catatan: fUkur.catatan.trim() || null,
        diukur_oleh: user?.id ?? null,
      })
      if (error) throw new Error(error.message)
      setPesan(`Pengukuran ${balitaUkur.nama} disimpan. Status: ${z.statusGizi !== '-' ? z.statusGizi : '-'}${z.redFlag ? ' · RED FLAG' : ''}`)
      setFUkur({ sasaran_id: '', berat: '', tinggi: '', lika: '', lila: '', catatan: '' })
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
        topik: fPeny.topik.trim(), tanggal: kegiatanAktif?.tanggal ?? today(),
        lokasi: fPeny.lokasi.trim(), sasaran: fPeny.sasaran.trim(),
        jumlah_peserta: Number(fPeny.jumlah_peserta) || 0, petugas: fPeny.petugas.trim(),
      })
      if (error) throw new Error(error.message)
      setPesan('Penyuluhan Meja 4 tercatat.')
      setFPeny({ topik: '', lokasi: '', sasaran: '', jumlah_peserta: '', petugas: '' })
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const jumlahHadir = kegiatanAktif ? Object.values(hadirMap).filter(Boolean).length : 0
  const ukurHariIni = kegiatanAktif ? antropometri.filter((a) => a.kegiatan_id === kegiatanAktif.id).length : 0
  const imunisasiHariIni = kegiatanAktif ? imunisasi.filter((i) => i.kegiatan_id === kegiatanAktif.id).length : 0

  const perSasaran: Record<string, Antropometri | undefined> = useMemo(() => {
    const m: Record<string, Antropometri | undefined> = {}
    for (const a of antropometri) {
      const prev = m[a.sasaran_id]
      if (!prev || a.tanggal > prev.tanggal) m[a.sasaran_id] = a
    }
    return m
  }, [antropometri])

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="deck" title="5 Meja Posyandu Digital" sub="Ikuti alur meja posyandu: Pendaftaran → Penimbangan → Pencatatan → Penyuluhan → Pelayanan" />

      {pesan && (
        <Notif pesan={pesan} onClear={() => setPesan(null)}
          tipe={pesan.startsWith('Kegiatan') || pesan.startsWith('Absensi') || pesan.startsWith('Pengukuran') || pesan.startsWith('Penyuluhan') ? 'info' : 'error'} />
      )}

      <Card className="p-space-md flex flex-col gap-space-sm">
        <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Persiapan Kegiatan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          {locked ? (
            <div className="flex flex-col gap-space-xxs">
              <span className="font-label-xs text-label-xs text-on-surface-variant font-semibold uppercase tracking-wider">Posyandu Terlampir</span>
              <div className="bg-surface-container rounded-lg px-space-md py-space-xs font-body-sm text-body-sm text-on-surface font-bold">
                {aktif?.nama ?? '—'}
              </div>
            </div>
          ) : (
            <SelField label="Posyandu" value={aktifId} onChange={setAktif}
              options={posyandu.map((p) => ({ value: p.id, label: p.nama }))} allowEmpty="— pilih posyandu —" />
          )}
          <SelField label="Kegiatan (atau buat baru)" value={kegiatanId} onChange={setKegiatanId}
            options={kegiatanPos.map((k) => ({ value: k.id, label: `${k.tanggal} · ${k.nama}` }))} allowEmpty="— pilih / buat —" />
          <div className="flex items-end gap-space-xs">
            <button className={btnSecondary} onClick={() => setTab('meja1')} disabled={!kegiatanAktif}>Mulai Meja</button>
          </div>
        </div>
        <form onSubmit={buatKegiatan} className="grid grid-cols-1 md:grid-cols-4 gap-space-sm items-end">
          <Field label="Tanggal" value={formKeg.tanggal} onChange={(v) => setFormKeg((f) => ({ ...f, tanggal: v }))} type="date" />
          <Field label="Nama Kegiatan" value={formKeg.nama} onChange={(v) => setFormKeg((f) => ({ ...f, nama: v }))} />
          <Field label="Agenda" value={formKeg.agenda} onChange={(v) => setFormKeg((f) => ({ ...f, agenda: v }))} placeholder="mis. Penimbangan + Imunisasi MR" />
          <button type="submit" disabled={busy || !aktifId} className={btnPrimary}>{busy ? '…' : '+ Buat Kegiatan'}</button>
        </form>
      </Card>

      {(!kegiatanAktif || !aktifId) && <EmptyState text={aktifId ? 'Pilih kegiatan untuk mulai 5 meja.' : 'Pilih posyandu terlebih dahulu.'} />}

      {kegiatanAktif && aktifId && (
        <>
          <div className="flex gap-space-xs flex-wrap">
            {([
              { key: 'meja1', label: `Meja 1 · Pendaftaran (${jumlahHadir} hadir)` },
              { key: 'meja23', label: `Meja 2-3 · Ukur & Catat (${ukurHariIni} terukur)` },
              { key: 'meja4', label: 'Meja 4 · Penyuluhan' },
              { key: 'meja5', label: `Meja 5 · Pelayanan (${imunisasiHariIni} imunisasi)` },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md font-bold transition-colors ${
                  tab === t.key ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'meja1' && (
            <Card>
              <CardHeader title="Meja 1 — Absensi Digital" sub={`Kegiatan ${kegiatanAktif.tanggal} · ${sasaranPos.length} sasaran`}
                action={<button className={btnPrimary} disabled={busy} onClick={simpanAbsensi}>{busy ? 'Menyimpan…' : 'Simpan Absensi'}</button>} />
              <div className="p-space-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
                {sasaranPos.map((s) => (
                  <label key={s.id} className={`flex items-center gap-space-sm p-space-sm rounded-lg border transition-colors cursor-pointer ${
                    hadirMap[s.id] ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-surface-container border-transparent'
                  }`}>
                    <input type="checkbox" checked={!!hadirMap[s.id]}
                      onChange={(e) => setHadirMap((m) => ({ ...m, [s.id]: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-body-sm text-body-sm text-on-surface font-bold truncate">{s.nama}</p>
                      <p className="font-body-xs text-body-xs text-on-surface-variant">
                        {KELOMPOK_SINGKAT[s.kelompok]} · {umurSaatIni(s.tanggal_lahir)}
                      </p>
                    </div>
                  </label>
                ))}
                {sasaranPos.length === 0 && <EmptyState text="Belum ada sasaran di posyandu ini." />}
              </div>
            </Card>
          )}

          {tab === 'meja23' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
              <Card className="p-space-md flex flex-col gap-space-sm">
                <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Meja 2 — Input Antropometri</h3>
                <form onSubmit={simpanUkur} className="grid grid-cols-1 gap-space-sm">
                  <SelField label="Sasaran" value={fUkur.sasaran_id} onChange={(v) => setFUkur((f) => ({ ...f, sasaran_id: v }))}
                    options={sasaranPos.map((s) => ({ value: s.id, label: `${s.nama} (${umurSaatIni(s.tanggal_lahir)} · ${KELOMPOK_SINGKAT[s.kelompok]})` }))} allowEmpty="— pilih sasaran —" />
                  <div className="grid grid-cols-2 gap-space-sm">
                    <Field label="Berat (kg)" value={fUkur.berat} onChange={(v) => setFUkur((f) => ({ ...f, berat: v }))} type="number" />
                    <Field label="Tinggi/Panjang (cm)" value={fUkur.tinggi} onChange={(v) => setFUkur((f) => ({ ...f, tinggi: v }))} type="number" />
                    <Field label="LIKA (cm)" value={fUkur.lika} onChange={(v) => setFUkur((f) => ({ ...f, lika: v }))} type="number" />
                    <Field label="LILA (cm)" value={fUkur.lila} onChange={(v) => setFUkur((f) => ({ ...f, lila: v }))} type="number" />
                  </div>
                  <Field label="Catatan Kader" value={fUkur.catatan} onChange={(v) => setFUkur((f) => ({ ...f, catatan: v }))} />
                  <div>
                    <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Menyimpan…' : 'Simpan Pengukuran'}</button>
                  </div>
                </form>
              </Card>

              <Card className="p-space-md flex flex-col gap-space-sm">
                <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Meja 3 — Hasil Z-Score Otomatis (WHO)</h3>
                {!zLive && <EmptyState text="Pilih sasaran dan isi berat badan untuk melihat kalkulasi otomatis." />}
                {zLive && balitaUkur && (
                  <div className="flex flex-col gap-space-sm">
                    <div className="bg-surface-container rounded-lg p-space-sm">
                      <p className="font-body-sm text-body-sm text-on-surface font-bold">{balitaUkur.nama}</p>
                      <p className="font-body-xs text-body-xs text-on-surface-variant">{zLive.usiaBulan} bulan · {balitaUkur.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-space-xs">
                      {[
                        { label: 'BB/U', z: zLive.bbU }, { label: 'TB/U', z: zLive.tbU },
                        { label: 'BB/TB', z: zLive.bbTb }, { label: 'IMT/U', z: zLive.imtU },
                      ].map(({ label, z }) => (
                        <div key={label} className="bg-surface-container rounded-lg p-space-xs">
                          <p className="font-body-xs text-body-xs text-on-surface-variant">{label}</p>
                          <p className="font-headline-sm text-headline-sm text-on-surface font-bold">{formatZ(z)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between bg-surface-container rounded-lg p-space-sm">
                      <span className="font-body-sm text-body-sm text-on-surface">Status Gizi</span>
                      <Chip className={badgeGizi(zLive.statusGizi)}>{zLive.statusGizi}</Chip>
                    </div>
                    <div className="flex items-center justify-between bg-surface-container rounded-lg p-space-sm">
                      <span className="font-body-sm text-body-sm text-on-surface">Status Tinggi</span>
                      <Chip className={badgeTinggi(zLive.statusTinggi)}>{zLive.statusTinggi}</Chip>
                    </div>
                    {zLive.redFlag && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-space-sm">
                        <p className="font-label-sm text-label-sm text-red-700 font-bold">⚠ RED FLAG — Segera intervensi & kunjungan rumah</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'meja4' && (
            <Card className="p-space-md flex flex-col gap-space-sm">
              <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">Meja 4 — Catat Penyuluhan</h3>
              <form onSubmit={simpanPenyuluhan} className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
                <Field label="Topik" value={fPeny.topik} onChange={(v) => setFPeny((f) => ({ ...f, topik: v }))} placeholder="mis. Gizi Balita & MPASI" />
                <Field label="Sasaran" value={fPeny.sasaran} onChange={(v) => setFPeny((f) => ({ ...f, sasaran: v }))} placeholder="Ibu balita" />
                <Field label="Jumlah Peserta" value={fPeny.jumlah_peserta} onChange={(v) => setFPeny((f) => ({ ...f, jumlah_peserta: v }))} type="number" />
                <Field label="Lokasi" value={fPeny.lokasi} onChange={(v) => setFPeny((f) => ({ ...f, lokasi: v }))} placeholder="Balai RW" />
                <Field label="Petugas" value={fPeny.petugas} onChange={(v) => setFPeny((f) => ({ ...f, petugas: v }))} placeholder="Kader + Bidan" />
                <div className="flex items-end">
                  <button type="submit" disabled={busy} className={btnPrimary}>{busy ? '…' : 'Simpan Penyuluhan'}</button>
                </div>
              </form>
            </Card>
          )}

          {tab === 'meja5' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
              {[
                { icon: 'syringe', judul: 'Imunisasi', desk: `Terlayani hari ini: ${imunisasiHariIni}`, href: '/imunisasi' },
                { icon: 'inventory_2', judul: 'Vitamin A, TTD & Obat', desk: 'Stok & pemberian', href: '/logistik' },
                { icon: 'monitor_heart', judul: 'Skrining / PTM', desk: 'Ibu hamil, remaja, lansia', href: '/skrining' },
                { icon: 'favorite', judul: 'Pelayanan KB', desk: 'Catat kontrasepsi', href: '/skrining' },
              ].map((m) => (
                <a key={m.judul} href={m.href} className="bg-surface-container rounded-xl p-space-md flex items-center gap-space-sm hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-3xl text-primary">{m.icon}</span>
                  <div className="flex-1">
                    <p className="font-label-md text-label-md text-on-surface font-bold">{m.judul}</p>
                    <p className="font-body-xs text-body-xs text-on-surface-variant">{m.desk}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {kegiatanAktif && tab === 'meja23' && (
        <Card>
          <CardHeader title="Terkini per Sasaran (posyandu ini)" sub="Pengukuran terakhir dari semua sasaran" />
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                  {['Nama', 'Usia', 'Terakhir Ukur', 'BB', 'Z BB/U', 'Status'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sasaranPos.map((s) => {
                  const a = perSasaran[s.id]
                  return (
                    <tr key={s.id} className="border-b border-outline-variant/40 last:border-0">
                      <td className="py-space-xs px-space-md font-bold text-on-surface">{s.nama}</td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{umurSaatIni(s.tanggal_lahir)}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{a?.tanggal ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{a?.berat_kg ?? '—'} kg</td>
                      <td className="py-space-xs px-space-md font-mono text-on-surface">{a?.z_bbu ?? '—'}</td>
                      <td className="py-space-xs px-space-md">
                        {a?.status_gizi ? <Chip className={badgeGizi(a.status_gizi as any)}>{a.status_gizi}</Chip> : <span className="text-on-surface-variant italic text-xs">Belum diukur</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
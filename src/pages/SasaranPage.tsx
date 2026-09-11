import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Antropometri, Imunisasi, Kehamilan, Sasaran, Wilayah } from '../types/database'
import { useAuth } from '../lib/auth'
import { usePosyandu } from '../lib/posyandu'
import {
  Field, SelField, Card, CardHeader, Chip, EmptyState, PageHeader, Notif, inputCls, btnPrimary, btnSecondary,
} from '../components/ui'
import {
  badgeKelompok, JK_LABEL, KELOMPOK_LABEL, KELOMPOK_SINGKAT, kelompokDariTanggalLahir, umurBulan, umurSaatIni, validNIK,
} from '../config/kelompok'
import { badgeGizi } from '../lib/zscore'
import KmsChart from '../components/KmsChart'

function today() { return new Date().toISOString().slice(0, 10) }

type Fokus = 'list' | 'detail'
type FilterKel = '' | Sasaran['kelompok']

const FIELDS: { value: Sasaran['kelompok']; label: string }[] = [
  { value: 'bayi', label: KELOMPOK_LABEL.bayi },
  { value: 'balita', label: KELOMPOK_LABEL.balita },
  { value: 'remaja', label: KELOMPOK_LABEL.remaja },
  { value: 'produktif', label: KELOMPOK_LABEL.produktif },
  { value: 'lansia', label: KELOMPOK_LABEL.lansia },
]

export default function SasaranPage() {
  const { list: posyandu, aktifId, setAktif, lockedId } = usePosyandu()
  const locked = Boolean(lockedId)
  const { user } = useAuth()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [antropometri, setAntropometri] = useState<Antropometri[]>([])
  const [imunisasi, setImunisasi] = useState<Imunisasi[]>([])
  const [kehamilan, setKehamilan] = useState<Kehamilan[]>([])
  const [wilayah, setWilayah] = useState<Wilayah[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [kel, setKel] = useState<FilterKel>('')
  const [fokus, setFokus] = useState<Fokus>('list')
  const [detail, setDetail] = useState<Sasaran | null>(null)
  const [form, setForm] = useState({
    posyandu_id: '', wilaya_id: '', nik: '', nama: '', jenis_kelamin: 'L' as 'L' | 'P',
    tanggal_lahir: '', golongan_darah: '', nama_ortu: '', telepon: '', alamat: '', catatan: '',
  })

  const load = useCallback(async () => {
    const [s, a, i, kh, w] = await Promise.all([
      supabase.from('sasaran').select('*').order('nama'),
      supabase.from('antropometri').select('*').order('tanggal'),
      supabase.from('imunisasi').select('*').order('tanggal'),
      supabase.from('kehamilan').select('*').order('ke_hamil'),
      supabase.from('wilayah').select('*').order('dusun'),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!a.error) setAntropometri(a.data ?? [])
    if (!i.error) setImunisasi(i.data ?? [])
    if (!kh.error) setKehamilan(kh.data ?? [])
    if (!w.error) setWilayah(w.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    let arr = sasaran.filter((s) => (aktifId ? s.posyandu_id === aktifId : true))
    if (kel) arr = arr.filter((s) => s.kelompok === kel)
    if (q.trim()) {
      const t = q.toLowerCase()
      arr = arr.filter(
        (s) => s.nama.toLowerCase().includes(t) || (s.nik ?? '').includes(t) || (s.nama_ortu ?? '').toLowerCase().includes(t),
      )
    }
    return arr
  }, [sasaran, aktifId, kel, q])

  async function simpanSasaran(e: React.FormEvent) {
    e.preventDefault()
    const posyanduId = lockedId || form.posyandu_id
    if (posyanduId && !posyandu.some((p) => p.id === posyanduId)) { setPesan('Pilih posyandu valid.'); return }
    if (!posyanduId) { setPesan('Pilih posyandu.'); return }
    if (!form.nama.trim() || !form.tanggal_lahir) { setPesan('Nama dan tanggal lahir wajib diisi.'); return }
    const nik = form.nik.trim()
    if (nik && !validNIK(nik)) { setPesan('NIK harus 16 digit angka. Kosongkan bila belum ada (bayi baru lahir).'); return }
    setBusy(true)
    try {
      const { error } = await supabase.from('sasaran').insert({
        posyandu_id: posyanduId,
        wilaya_id: form.wilaya_id || null,
        nik: nik || null,
        nik_sementara: !nik,
        nama: form.nama.trim(),
        jenis_kelamin: form.jenis_kelamin,
        tanggal_lahir: form.tanggal_lahir,
        golongan_darah: form.golongan_darah || null,
        nama_ortu: form.nama_ortu.trim() || null,
        telepon: form.telepon.trim() || null,
        alamat: form.alamat.trim() || null,
        kelompok: kelompokDariTanggalLahir(form.tanggal_lahir),
        catatan: form.catatan.trim() || null,
        dibuat_oleh: user?.id ?? null,
      })
      if (error) throw new Error(error.message)
      setPesan('Sasaran berhasil didaftarkan.')
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
      setForm((f) => ({ ...f, nik: '', nama: '', tanggal_lahir: '', golongan_darah: '', nama_ortu: '', telepon: '', alamat: '', catatan: '' }))
      void load()
    }
  }

  async function ubahStatus(s: Sasaran, status: Sasaran['status'], tglMeninggal?: string) {
    const { error } = await supabase
      .from('sasaran')
      .update({ status, tanggal_meninggal: status === 'meninggal' ? (tglMeninggal ?? today()) : null })
      .eq('id', s.id)
    if (!error) {
      setPesan(`Status ${s.nama} diubah ke ${status}.`)
      void load()
      if (detail?.id === s.id) setDetail({ ...s, status, tanggal_meninggal: status === 'meninggal' ? (tglMeninggal ?? today()) : null })
    } else setPesan(error.message)
  }

  const antroDetail = detail ? antropometri.filter((a) => a.sasaran_id === detail.id).sort((a, b) => b.tanggal.localeCompare(a.tanggal)) : []
  const imunisasiDetail = detail ? imunisasi.filter((i) => i.sasaran_id === detail.id).sort((a, b) => b.tanggal.localeCompare(a.tanggal)) : []
  const kehamilanDetail = detail ? kehamilan.filter((k) => k.sasaran_id === detail.id) : []

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="group" title="Registri Sasaran" sub="Registrasi NIK-based semua kelompok sasaran posyandu" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.startsWith('Sasaran') || pesan.startsWith('Status') ? 'info' : 'error'} />}

      {fokus === 'list' && (
        <>
          <form onSubmit={simpanSasaran} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">+ Daftarkan Sasaran Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              {locked ? (
              <div className="flex flex-col gap-space-xxs">
                <span className="font-label-xs text-label-xs text-on-surface-variant font-semibold uppercase tracking-wider">Posyandu Terlampir</span>
                <div className="bg-surface-container rounded-lg px-space-md py-space-xs font-body-sm text-body-sm text-on-surface font-bold">
                  {posyandu.find((p) => p.id === lockedId)?.nama ?? '—'}
                </div>
              </div>
            ) : (
              <SelField label="Posyandu" value={form.posyandu_id} onChange={(v) => setForm((f) => ({ ...f, posyandu_id: v }))}
                options={posyandu.map((p) => ({ value: p.id, label: p.nama }))} allowEmpty="— pilih —" />
            )}
              <Field label="NIK (16 digit)" value={form.nik} onChange={(v) => setForm((f) => ({ ...f, nik: v }))} placeholder="Kosong utk bayi baru lahir" hint={form.nik && !validNIK(form.nik) ? 'NIK belum valid' : undefined} />
              <SelField label="Dusun / RW" value={form.wilaya_id} onChange={(v) => setForm((f) => ({ ...f, wilaya_id: v }))}
                options={wilayah.map((w) => ({ value: w.id, label: w.nama }))} allowEmpty="— tanpa wilayah —" />
              <Field label="Nama Lengkap" value={form.nama} onChange={(v) => setForm((f) => ({ ...f, nama: v }))} placeholder="mis. Bima Putra Santoso" />
              <SelField label="Jenis Kelamin" value={form.jenis_kelamin} onChange={(v) => setForm((f) => ({ ...f, jenis_kelamin: v as 'L' | 'P' }))}
                options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]} />
              <Field label="Tanggal Lahir" value={form.tanggal_lahir} onChange={(v) => setForm((f) => ({ ...f, tanggal_lahir: v }))} type="date" />
              <Field label="Golongan Darah" value={form.golongan_darah} onChange={(v) => setForm((f) => ({ ...f, golongan_darah: v }))} placeholder="mis. A / B / O (opsional)" />
              <Field label="Nama Orang Tua / Wali" value={form.nama_ortu} onChange={(v) => setForm((f) => ({ ...f, nama_ortu: v }))} placeholder="wajib utk anak balita" />
              <Field label="Telepon" value={form.telepon} onChange={(v) => setForm((f) => ({ ...f, telepon: v }))} placeholder="08xx (opsional)" />
              <Field label="Alamat" value={form.alamat} onChange={(v) => setForm((f) => ({ ...f, alamat: v }))} placeholder="mis. Dusun Krajan RT 02" />
              <div className="flex flex-col gap-space-xxs">
                <span className="font-label-xs text-label-xs text-on-surface-variant font-semibold uppercase tracking-wider">Kelompok Otomatis</span>
                <div className="bg-surface-container rounded-lg px-space-md py-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  {form.tanggal_lahir ? KELOMPOK_LABEL[kelompokDariTanggalLahir(form.tanggal_lahir)] + ` · ${umurSaatIni(form.tanggal_lahir)}` : 'Isi tanggal lahir'}
                </div>
              </div>
              <Field label="Catatan" value={form.catatan} onChange={(v) => setForm((f) => ({ ...f, catatan: v }))} placeholder="opsional" />
            </div>
            <div className="flex gap-space-sm">
              <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Menyimpan…' : 'Daftarkan Sasaran'}</button>
            </div>
          </form>

          <Card>
            <CardHeader
              title="Daftar Sasaran"
              sub={`${filtered.length} dari ${sasaran.length} terdaftar`}
              action={
                <div className="flex gap-space-xs flex-wrap">
                  <select value={kel} onChange={(e) => setKel(e.target.value as FilterKel)} className={inputCls + ' w-40'}>
                    <option value="">Semua kelompok</option>
                    {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <select value={aktifId} onChange={(e) => setAktif(e.target.value)} className={inputCls + ' w-48'}>
                    <option value="">Semua posyandu</option>
                    {posyandu.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                  </select>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / NIK / ortu…" className={inputCls + ' w-56'} />
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                    <th className="py-space-xs px-space-md font-medium">Nama</th>
                    <th className="py-space-xs px-space-md font-medium">NIK</th>
                    <th className="py-space-xs px-space-md font-medium">Usia</th>
                    <th className="py-space-xs px-space-md font-medium">Kelompok</th>
                    <th className="py-space-xs px-space-md font-medium">Ortu</th>
                    <th className="py-space-xs px-space-md font-medium">Posyandu</th>
                    <th className="py-space-xs px-space-md font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7}><EmptyState text="Belum ada sasaran terdaftar." /></td></tr>
                  )}
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-outline-variant/40 last:border-0 hover:bg-surface-container/50">
                      <td className="py-space-xs px-space-md font-bold text-on-surface">
                        {s.nama}
                        {s.status !== 'aktif' && (
                          <span className="ml-1 text-on-surface-variant font-normal text-xs">({s.status})</span>
                        )}
                      </td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">
                        {s.nik ?? (s.nik_sementara ? <span className="italic">blm ada</span> : '—')}
                      </td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{umurSaatIni(s.tanggal_lahir)}</td>
                      <td className="py-space-xs px-space-md">
                        <Chip className={badgeKelompok(s.kelompok)}>{KELOMPOK_SINGKAT[s.kelompok]}</Chip>
                      </td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{s.nama_ortu ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{posyandu.find((p) => p.id === s.posyandu_id)?.nama ?? '-'}</td>
                      <td className="py-space-xs px-space-md">
                        <button className="font-label-xs text-label-xs text-primary font-bold hover:underline" onClick={() => { setDetail(s); setFokus('detail') }}>
                          Detail / KMS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {fokus === 'detail' && detail && (
        <div className="flex flex-col gap-space-md">
          <Card className="p-space-md flex flex-col gap-space-sm">
            <div className="flex items-start justify-between gap-space-sm">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-bold">{detail.nama}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {JK_LABEL[detail.jenis_kelamin]} · {umurSaatIni(detail.tanggal_lahir)} ({umurBulan(detail.tanggal_lahir)} bln) · {KELOMPOK_LABEL[detail.kelompok]}
                </p>
                <p className="font-body-xs text-body-xs text-on-surface-variant">
                  NIK: {detail.nik ?? '— (belum ada)'} · Ortu: {detail.nama_ortu ?? '-'} · {detail.alamat ?? '-'}
                </p>
              </div>
              <div className="flex gap-space-xs flex-wrap items-center">
                <button className={btnSecondary} onClick={() => { setFokus('list'); setDetail(null) }}>← Kembali</button>
                {detail.status !== 'meninggal' && (
                  <button
                    className="px-space-md py-space-xs rounded-lg bg-error-container text-on-error-container font-label-md text-label-md font-bold"
                    onClick={() => { if (window.confirm(`Tandai ${detail.nama} meninggal?`)) void ubahStatus(detail, 'meninggal') }}
                  >
                    Tandai Meninggal
                  </button>
                )}
                {detail.status !== 'pindah' && (
                  <button className={btnSecondary} onClick={() => void ubahStatus(detail, 'pindah')}>Tandai Pindah</button>
                )}
              </div>
            </div>
            {detail.catatan && <p className="font-body-xs text-body-xs text-on-surface-variant italic">{detail.catatan}</p>}
          </Card>

          <Card className="p-space-md">
            <CardHeader title="KMS Digital — Kurva Pertumbuhan WHO" />
            <div className="px-space-md pb-space-md">
              <KmsChart rows={antropometri.filter((a) => a.sasaran_id === detail.id)} sasaran={detail} />
            </div>
          </Card>

          {kehamilanDetail.length > 0 && (
            <Card>
              <CardHeader title="Riwayat Kehamilan" />
              <div className="p-space-md flex flex-col gap-space-sm">
                {kehamilanDetail.map((k) => (
                  <div key={k.id} className="flex items-center justify-between bg-surface-container rounded-lg px-space-sm py-space-xxs">
                    <span className="font-body-sm text-body-sm text-on-surface">Kehamilan ke-{k.ke_hamil} · {k.status}</span>
                    <span className="font-body-xs text-body-xs text-on-surface-variant">HP?: {k.tgl_hpl ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Riwayat Antropometri & Z-Score" />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                    {['Tanggal', 'BB (kg)', 'TB (cm)', 'LIKA', 'Z BB/U', 'Z TB/U', 'Status Gizi', 'Validasi'].map((h) => (
                      <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {antroDetail.map((r) => (
                    <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                      <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                      <td className="py-space-xs px-space-md font-bold text-on-surface">{r.berat_kg ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{r.tinggi_cm ?? '—'}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{r.lika_cm ?? '—'}</td>
                      <td className="py-space-xs px-space-md font-mono text-on-surface">{r.z_bbu ?? '—'}</td>
                      <td className="py-space-xs px-space-md font-mono text-on-surface">{r.z_tbu ?? '—'}</td>
                      <td className="py-space-xs px-space-md">
                        {r.status_gizi && <Chip className={badgeGizi(r.status_gizi as any)}>{r.status_gizi}</Chip>}
                      </td>
                      <td className="py-space-xs px-space-md">
                        <Chip className={r.status_validasi === 'approved' ? 'bg-emerald-500/15 text-emerald-700' : r.status_validasi === 'pending' ? 'bg-amber-500/15 text-amber-700' : 'bg-rose-500/15 text-rose-700'}>
                          {r.status_validasi}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                  {antroDetail.length === 0 && <tr><td colSpan={8}><EmptyState text="Belum ada pengukuran." /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Riwayat Imunisasi" />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                    {['Antigen', 'Dosis', 'Tanggal', 'Status', 'Petugas'].map((h) => (
                      <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {imunisasiDetail.map((r) => (
                    <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                      <td className="py-space-xs px-space-md font-bold text-on-surface">{r.antigen}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{r.dosis}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                      <td className="py-space-xs px-space-md text-on-surface">{r.status}</td>
                      <td className="py-space-xs px-space-md text-on-surface-variant">{r.petugas ?? '—'}</td>
                    </tr>
                  ))}
                  {imunisasiDetail.length === 0 && <tr><td colSpan={5}><EmptyState text="Belum ada imunisasi." /></td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
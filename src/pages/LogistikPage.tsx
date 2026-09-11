import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { LogistikItem, LogistikMutasi, LogistikStok, Sasaran } from '../types/database'
import { useAuth } from '../lib/auth'
import { usePosyandu } from '../lib/posyandu'
import { Field, SelField, Card, CardHeader, Chip, EmptyState, Notif, PageHeader, btnPrimary } from '../components/ui'
import { KELOMPOK_SINGKAT, umurSaatIni } from '../config/kelompok'

function today() { return new Date().toISOString().slice(0, 10) }

export default function LogistikPage() {
  const { list: posyandu, aktif, aktifId, setAktif, locked } = usePosyandu()
  const { user } = useAuth()
  const [items, setItems] = useState<LogistikItem[]>([])
  const [stoks, setStoks] = useState<LogistikStok[]>([])
  const [mutasis, setMutasis] = useState<LogistikMutasi[]>([])
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [jenis, setJenis] = useState<'masuk' | 'keluar'>('masuk')
  const [f, setF] = useState({ item_id: '', qty: '', sasaran_id: '', tanggal: today(), batch: '', tgl_exp: '', keterangan: '' })

  const load = useCallback(async () => {
    const [i, st, m, s] = await Promise.all([
      supabase.from('logistik_item').select('*').order('nama'),
      supabase.from('logistik_stok').select('*'),
      supabase.from('logistik_mutasi').select('*').order('tanggal', { ascending: false }),
      supabase.from('sasaran').select('*').eq('status', 'aktif'),
    ])
    if (!i.error) setItems(i.data ?? [])
    if (!st.error) setStoks(st.data ?? [])
    if (!m.error) setMutasis(m.data ?? [])
    if (!s.error) setSasaran(s.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const itemsPos = useMemo(() => items.filter((i) => !aktifId || i.posyandu_id === aktifId), [items, aktifId])
  const sasaranPos = useMemo(() => sasaran.filter((s) => (!aktifId || s.posyandu_id === aktifId)), [sasaran, aktifId])

  const stokPerItem = useMemo(() => {
    const m = new Map<string, number>()
    for (const st of stoks) {
      if (aktifId && st.posyandu_id !== aktifId) continue
      m.set(st.item_id, (m.get(st.item_id) ?? 0) + st.qty)
    }
    return m
  }, [stoks, aktifId])

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!aktifId) { setPesan('Pilih posyandu.'); return }
    const item = itemsPos.find((x) => x.id === f.item_id)
    if (!item) { setPesan('Pilih item.'); return }
    const qty = Number(f.qty)
    if (!qty || qty <= 0) { setPesan('Jumlah harus lebih dari 0.'); return }
    if (jenis === 'keluar' && !f.sasaran_id && !f.keterangan.trim()) {
      setPesan('Pemberian ke sasaran atau isi keterangan distribusi.'); return
    }
    const total = stokPerItem.get(item.id) ?? 0
    if (jenis === 'keluar' && qty > total) { setPesan(`Stok tidak cukup: sisa ${total} ${item.satuan}.`); return }

    setBusy(true)
    try {
      const { error } = await supabase.from('logistik_mutasi').insert({
        posyandu_id: aktifId,
        item_id: item.id,
        jenis,
        qty,
        sasaran_id: jenis === 'keluar' ? (f.sasaran_id || null) : null,
        tanggal: f.tanggal,
        keterangan: f.keterangan.trim() || null,
        dibuat_oleh: user?.id ?? null,
      })
      if (error) throw new Error(error.message)

      if (jenis === 'masuk') {
        const { error: e2 } = await supabase.from('logistik_stok').insert({
          posyandu_id: aktifId, item_id: item.id, qty, batch: f.batch.trim() || null, tgl_exp: f.tgl_exp || null,
        })
        if (e2) throw new Error(e2.message)
        setPesan(`+${qty} ${item.nama} masuk stok.`)
      } else {
        // kurangi stok — ambil batch yang ada
        const batchRows = stoks.filter((x) => x.item_id === item.id && (!aktifId || x.posyandu_id === aktifId)).sort((a, b) => (a.tgl_exp ?? '9999').localeCompare(b.tgl_exp ?? '9999'))
        let sisa = qty
        for (const br of batchRows) {
          if (sisa <= 0) break
          const pakai = Math.min(sisa, br.qty)
          sisa -= pakai
          await supabase.from('logistik_stok').update({ qty: br.qty - pakai }).eq('id', br.id)
        }
        setPesan(`${f.sasaran_id ? 'Pemberian' : 'Distribusi'} ${qty} ${item.nama} tercatat.`)
      }
      setF((x) => ({ ...x, qty: '', sasaran_id: '', batch: '', tgl_exp: '', keterangan: '' }))
      void load()
    } catch (err) {
      setPesan((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="inventory_2" title="Logistik & Farmasi" sub="Stok vitamin, TTD, obat cacing, PMT — pemberian otomatis kurangi stok" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.includes('tercatat') || pesan.includes('masuk stok') ? 'info' : 'error'} />}

      <div className="flex items-center gap-space-xs">
        <SelField label="" value={jenis} onChange={(v) => setJenis(v as 'masuk' | 'keluar')} options={[{ value: 'masuk', label: '+ Masuk (Terima dari Puskesmas)' }, { value: 'keluar', label: '- Keluar (Pemberian / Distribusi)' }]} />
        {locked ? (
          <div className="flex items-center gap-space-xs px-space-sm py-space-xxs bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface font-bold">
            {aktif?.nama ?? '—'}
          </div>
        ) : (
          <SelField label="" value={aktifId} onChange={setAktif} options={posyandu.map((p) => ({ value: p.id, label: p.nama }))} allowEmpty="— semua —" />
        )}
      </div>

      <Card className="p-space-md flex flex-col gap-space-sm">
        <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">
          {jenis === 'masuk' ? 'Penerimaan Stok (dari Puskesmas)' : 'Pengeluaran / Pemberian'}
        </h3>
        <form onSubmit={simpan} className="grid grid-cols-1 md:grid-cols-3 gap-space-sm items-end">
          <SelField label="Item" value={f.item_id} onChange={(v) => setF((x) => ({ ...x, item_id: v }))}
            options={itemsPos.map((i) => ({ value: i.id, label: `${i.nama} (sisa ${stokPerItem.get(i.id) ?? 0} ${i.satuan})` }))} allowEmpty="— pilih item —" />
          <Field label={`Jumlah (${'unit'})`} value={f.qty} onChange={(v) => setF((x) => ({ ...x, qty: v }))} type="number" />
          <Field label="Tanggal" value={f.tanggal} onChange={(v) => setF((x) => ({ ...x, tanggal: v }))} type="date" />
          {jenis === 'masuk' && (
            <>
              <Field label="Batch" value={f.batch} onChange={(v) => setF((x) => ({ ...x, batch: v }))} />
              <Field label="Tanggal Exp" value={f.tgl_exp} onChange={(v) => setF((x) => ({ ...x, tgl_exp: v }))} type="date" />
            </>
          )}
          {jenis === 'keluar' && (
            <SelField label="Diberikan Ke (sasaran)" value={f.sasaran_id} onChange={(v) => setF((x) => ({ ...x, sasaran_id: v }))}
              options={sasaranPos.map((s) => ({ value: s.id, label: `${s.nama} (${KELOMPOK_SINGKAT[s.kelompok]} · ${umurSaatIni(s.tanggal_lahir)})` }))} allowEmpty="— tanpa sasaran —" />
          )}
          <Field label={jenis === 'masuk' ? 'Keterangan (sumber)' : 'Keterangan (alasan / distribusi)'} value={f.keterangan} onChange={(v) => setF((x) => ({ ...x, keterangan: v }))} placeholder={jenis === 'masuk' ? 'mis. Distribusi Puskesmas' : 'mis. PMT kasus gizi kurang'} />
          <div>
            <button type="submit" disabled={busy || !aktifId} className={btnPrimary}>{busy ? 'Menyimpan…' : jenis === 'masuk' ? '+ Terima Stok' : '- Catat Pengeluaran'}</button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Stok Saat Ini" sub="Peringatan oranye = di bawah ambang minimum" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Item', 'Kategori', 'Stok', 'Ambang', 'Status'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {itemsPos.map((i) => {
                const qty = stokPerItem.get(i.id) ?? 0
                const menipis = qty < i.ambang_min
                return (
                  <tr key={i.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{i.nama}</td>
                    <td className="py-space-xs px-space-md text-on-surface-variant">{i.kategori}</td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{qty} {i.satuan}</td>
                    <td className="py-space-xs px-space-md text-on-surface-variant">{i.ambang_min} {i.satuan}</td>
                    <td className="py-space-xs px-space-md">
                      {qty === 0
                        ? <Chip className="bg-red-500/15 text-red-700">Habis</Chip>
                        : menipis ? <Chip className="bg-amber-500/15 text-amber-700">Menipis</Chip>
                        : <Chip className="bg-emerald-500/15 text-emerald-700">Cukup</Chip>}
                    </td>
                  </tr>
                )
              })}
              {itemsPos.length === 0 && <tr><td colSpan={5}><EmptyState text="Belum ada item (pilih posyandu atau seed data)." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Riwayat Mutasi" sub="Pemberian per sasaran otomatis tercatat sebagai pengeluaran" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Jenis', 'Item', 'Qty', 'Sasaran', 'Keterangan'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {mutasis.filter((m) => !aktifId || m.posyandu_id === aktifId).slice(0, 40).map((m) => {
                const item = items.find((i) => i.id === m.item_id)
                const s = sasaran.find((x) => x.id === m.sasaran_id)
                return (
                  <tr key={m.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md text-on-surface">{m.tanggal}</td>
                    <td className="py-space-xs px-space-md">
                      <Chip className={m.jenis === 'masuk' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'}>{m.jenis}</Chip>
                    </td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{item?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{m.qty} {item?.satuan ?? ''}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{s?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-md text-on-surface-variant">{m.keterangan ?? '—'}</td>
                  </tr>
                )
              })}
              {mutasis.length === 0 && <tr><td colSpan={6}><EmptyState text="Belum ada mutasi." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
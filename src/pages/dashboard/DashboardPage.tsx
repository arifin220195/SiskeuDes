import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePosyandu } from '../../lib/posyandu'
import type { Antropometri, GiziTerkini, Kehadiran, Kegiatan, LogistikItem, LogistikStok, Sasaran } from '../../types/database'
import { Card, CardHeader, Chip, EmptyState, PageHeader, StatCard } from '../../components/ui'
import { badgeGizi } from '../../lib/zscore'
import { badgeKelompok, KELOMPOK_SINGKAT } from '../../config/kelompok'

interface AlertItem {
  id: string
  tipe: 'gizi' | 'hadir' | 'kehamilan' | 'stok'
  judul: string
  detail: string
  berat: 'tinggi' | 'sedang' | 'rendah'
}

export default function DashboardPage() {
  const { list: posyandu, aktif, aktifId, setAktif } = usePosyandu()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [kehadiran, setKehadiran] = useState<Kehadiran[]>([])
  const [gizi, setGizi] = useState<GiziTerkini[]>([])
  const [antropometri, setAntropometri] = useState<Antropometri[]>([])
  const [pending, setPending] = useState(0)
  const [items, setItems] = useState<LogistikItem[]>([])
  const [stoks, setStoks] = useState<LogistikStok[]>([])
  const [imunisasiRows, setImunisasiRows] = useState<any[]>([])
  const [skriningRows, setSkriningRows] = useState<any[]>([])

  const load = useCallback(async () => {
    const [s, k, kh, g, a, p, i, st, im, sk] = await Promise.all([
      supabase.from('sasaran').select('*').eq('status', 'aktif'),
      supabase.from('kegiatan').select('*').order('tanggal', { ascending: false }),
      supabase.from('kehadiran').select('*'),
      supabase.from('v_gizi_terkini').select('*'),
      supabase.from('antropometri').select('*').order('tanggal', { ascending: false }),
      supabase.from('antropometri').select('id').eq('status_validasi', 'pending'),
      supabase.from('logistik_item').select('*'),
      supabase.from('logistik_stok').select('*'),
      supabase.from('imunisasi').select('*'),
      supabase.from('skrining').select('*').order('tanggal', { ascending: false }),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!k.error) setKegiatan(k.data ?? [])
    if (!kh.error) setKehadiran(kh.data ?? [])
    if (!g.error) setGizi(g.data ?? [])
    if (!a.error) setAntropometri(a.data ?? [])
    if (!p.error) setPending(p.data?.length ?? 0)
    if (!i.error) setItems(i.data ?? [])
    if (!st.error) setStoks(st.data ?? [])
    if (!im.error) setImunisasiRows(im.data ?? [])
    if (!sk.error) setSkriningRows(sk.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const aktifSasaran = useMemo(
    () => (aktifId ? sasaran.filter((s) => s.posyandu_id === aktifId) : sasaran),
    [sasaran, aktifId],
  )

  const kegiatanPos = useMemo(
    () => kegiatan.filter((k) => (aktifId ? k.posyandu_id === aktifId : true)),
    [kegiatan, aktifId],
  )

  const hadirBulanIni = useMemo(() => {
    const now = new Date()
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const khBulan = kehadiran.filter((k) => {
      const kg = kegiatan.find((x) => x.id === k.kegiatan_id)
      return kg && kg.tanggal.startsWith(bulanIni) && k.hadir
    })
    return khBulan.length
  }, [kehadiran, kegiatan])

  // Alert: gizi buruk / stunting / wasting (data approved terakhir)
  const alertGizi = useMemo(() => {
    const map = new Map<string, GiziTerkini>()
    for (const g of gizi) map.set(g.sasaran_id, g)
    return [...map.values()].filter((g) => g.red_flag && (aktifId ? g.posyandu_id === aktifId : true))
  }, [gizi, aktifId])

  // Alert: tidak hadir 2 kegiatan berturut
  const alertHadir = useMemo(() => {
    const kegiatanPosSorted = [...kegiatanPos].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    const last2 = kegiatanPosSorted.slice(-2)
    if (last2.length < 2) return []
    const res: AlertItem[] = []
    for (const s of aktifSasaran) {
      const hadirJumlah = last2.filter((kg) => {
        const rec = kehadiran.find((k) => k.kegiatan_id === kg.id && k.sasaran_id === s.id)
        return rec?.hadir
      }).length
      if (hadirJumlah === 0) {
        res.push({
          id: s.id,
          tipe: 'hadir',
          judul: `Tidak hadir 2x · ${s.nama}`,
          detail: `Terakhir hadir sebelum ${last2[0].tanggal}. Perlu tracing / kunjungan rumah.`,
          berat: 'sedang',
        })
      }
    }
    return res
  }, [aktifSasaran, kegiatanPos, kehadiran])

  // Alert: ibu hamil risiko dari skrining terakhir
  const alertKehamilan = useMemo(() => {
    const seen = new Map<string, any>()
    for (const sk of skriningRows) {
      if (seen.has(sk.sasaran_id) || !sk.red_flag) continue
      if (sk.kelompok === 'produktif' && sk.data?.status_kehamilan !== 'hamil') continue
      seen.set(sk.sasaran_id, sk)
    }
    const res: AlertItem[] = []
    for (const sk of seen.values()) {
      const s = aktifSasaran.find((x) => x.id === sk.sasaran_id)
      if (!s || (aktifId && s.posyandu_id !== aktifId)) continue
      res.push({
        id: sk.id,
        tipe: 'kehamilan',
        judul: `Ibu hamil risiko · ${s.nama}`,
        detail: `${sk.label_risiko}. Data skrining ${sk.tanggal}.`,
        berat: 'tinggi',
      })
    }
    return res
  }, [skriningRows, aktifSasaran, aktifId])

  // Alert: stok menipis
  const stokMenipis = useMemo(() => {
    const stokMap = new Map<string, number>()
    for (const st of stoks) {
      if (aktifId && st.posyandu_id !== aktifId) continue
      stokMap.set(st.item_id, (stokMap.get(st.item_id) ?? 0) + st.qty)
    }
    const res: AlertItem[] = []
    for (const it of items) {
      if (aktifId && it.posyandu_id !== aktifId) continue
      const qty = stokMap.get(it.id) ?? 0
      if (qty < it.ambang_min) {
        res.push({
          id: it.id, tipe: 'stok', judul: `Stok menipis · ${it.nama}`,
          detail: `Sisa ${qty} ${it.satuan}, ambang ${it.ambang_min}. Ajukan permintaan ke Puskesmas.`,
          berat: 'rendah',
        })
      }
    }
    return res
  }, [items, stoks, aktifId])

  const alerts: AlertItem[] = [...alertGizi.map((g) => ({
    id: g.sasaran_id, tipe: 'gizi' as const,
    judul: `Red Flag Gizi · ${g.nama_sasaran}`,
    detail: `${g.status_gizi ?? ''} ${g.status_tinggi ?? ''}. Ukur ${g.tanggal}.`,
    berat: 'tinggi' as const,
  })), ...alertHadir, ...alertKehamilan, ...stokMenipis]

  const distribusiGizi = useMemo(() => {
    const m = new Map<string, number>()
    for (const row of gizi) {
      if (aktifId && row.posyandu_id !== aktifId) continue
      const k = row.status_gizi ?? '-'
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [gizi, aktifId])

  const distribusiKelompok = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of aktifSasaran) m.set(KELOMPOK_SINGKAT[s.kelompok] ?? s.kelompok, (m.get(KELOMPOK_SINGKAT[s.kelompok] ?? s.kelompok) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [aktifSasaran])

  const cakupanImunisasi = useMemo(() => {
    const by = new Map<string, Set<string>>()
    for (const r of imunisasiRows) {
      if (!by.has(r.antigen)) by.set(r.antigen, new Set())
      if (r.status === 'diberikan') by.get(r.antigen)!.add(r.sasaran_id)
    }
    return [...by.entries()].map(([a, set]) => ({
      antigen: a,
      cakupan: set.size,
      sasaranBalita: aktifSasaran.filter((s) => s.kelompok === 'bayi' || s.kelompok === 'balita').length,
    }))
  }, [imunisasiRows, aktifSasaran])

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader
        icon="monitor_heart"
        title="Dashboard PWS (Pemantauan Wilayah Setempat)"
        sub={`Posyandu ILP desa · ${aktif?.nama ?? 'Semua Posyandu'} · ${hadirBulanIni} kehadiran bulan ini`}
      />

      <div className="flex items-center gap-space-xs justify-end">
        <select
          value={aktifId}
          onChange={(e) => setAktif(e.target.value)}
          className="bg-surface-container text-on-surface rounded-lg px-space-sm py-space-xs border border-outline-variant font-body-sm text-body-sm"
        >
          <option value="">Semua posyandu</option>
          {posyandu.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <StatCard icon="group" label="Sasaran Aktif" value={String(aktifSasaran.length)} sub="Terdaftar di registri" color="text-primary" />
        <StatCard icon="scale" label="Pengukuran Tercatat" value={String(antropometri.filter((a) => !aktifId || sasaran.some((s) => s.id === a.sasaran_id && s.posyandu_id === aktifId)).length)} sub="Riwayat antropometri" color="text-sky-600" />
        <StatCard icon="fact_check" label="Menunggu Verifikasi" value={String(pending)} sub="Perlu validasi Nakes" color="text-amber-600" />
        <StatCard icon="warning" label="Red Flag Aktif" value={String(alerts.length)} sub="Perlu tindak lanjut" color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        <Card>
          <CardHeader title="⚠ Alert / Tindak Lanjut" sub="Aksi yang perlu dikerjakan kader & nakes" />
          <div className="p-space-md flex flex-col gap-space-sm">
            {alerts.length === 0 && <EmptyState text="Tidak ada alert. Semua sasaran terpantau baik." />}
            {alerts.map((al, i) => (
              <div key={`${al.tipe}-${al.id}-${i}`} className={`flex items-start gap-space-sm p-space-sm rounded-lg ${
                al.berat === 'tinggi' ? 'bg-red-500/10 border border-red-500/20'
                  : al.berat === 'sedang' ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-sky-500/10 border border-sky-500/20'
              }`}>
                <span className={`material-symbols-outlined ${al.berat === 'tinggi' ? 'text-red-600' : al.berat === 'sedang' ? 'text-amber-600' : 'text-sky-600'}`}>
                  {al.tipe === 'gizi' ? 'monitor_weight' : al.tipe === 'hadir' ? 'person_off' : al.tipe === 'kehamilan' ? 'pregnant_woman' : 'package'}
                </span>
                <div className="min-w-0">
                  <p className="font-label-sm text-label-sm text-on-surface font-bold">{al.judul}</p>
                  <p className="font-body-xs text-body-xs text-on-surface-variant">{al.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-space-md">
          <Card>
            <CardHeader title="Status Gizi (Data Tervalidasi)" />
            <div className="p-space-md flex flex-col gap-space-sm">
              {distribusiGizi.length === 0 && <EmptyState text="Belum ada data tervalidasi." />}
              {distribusiGizi.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <Chip className={badgeGizi(k as any)}>{k}</Chip>
                  <span className="font-label-md text-label-md text-on-surface font-bold">{v} anak</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Distribusi Sasaran" />
            <div className="p-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              {distribusiKelompok.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between bg-surface-container rounded-lg px-space-sm py-space-xxs">
                  <Chip className={badgeKelompok(k as any)}>{k}</Chip>
                  <span className="font-label-md text-label-md text-on-surface font-bold">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        <Card>
          <CardHeader title="Cakupan Imunisasi" sub={`Balita ${aktifSasaran.filter((s) => ['bayi', 'balita'].includes(s.kelompok)).length}`} />
          <div className="p-space-md flex flex-col gap-space-sm">
            {cakupanImunisasi.length === 0 && <EmptyState text="Belum ada data imunisasi." />}
            {cakupanImunisasi.map((c) => (
              <div key={c.antigen}>
                <div className="flex justify-between text-body-sm text-body-sm mb-space-xxs">
                  <span className="text-on-surface">{c.antigen}</span>
                  <span className="text-on-surface-variant">{c.cakupan} balita · {c.sasaranBalita ? Math.round((c.cakupan / c.sasaranBalita) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${c.sasaranBalita ? Math.min(100, (c.cakupan / c.sasaranBalita) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Kegiatan Bulan Ini" sub={`${kegiatanPos.length} kegiatan tercatat`} />
          <div className="p-space-md flex flex-col gap-space-sm">
            {kegiatanPos.slice(0, 8).map((k) => (
              <div key={k.id} className="flex items-center justify-between bg-surface-container rounded-lg px-space-sm py-space-xxs">
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface font-bold">{k.nama}</p>
                  <p className="font-body-xs text-body-xs text-on-surface-variant">{k.tanggal}</p>
                </div>
                <Chip className="bg-surface-container-highest text-on-surface">{k.agenda ?? '-'}</Chip>
              </div>
            ))}
            {kegiatanPos.length === 0 && <EmptyState text="Belum ada kegiatan dibuat." />}
          </div>
        </Card>
      </div>
    </div>
  )
}
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Antropometri, Imunisasi, PelayananKb, Sasaran, Skrining } from '../types/database'
import { useAuth } from '../lib/auth'
import { Card, CardHeader, Chip, EmptyState, Notif, PageHeader, btnPrimary, btnSecondary } from '../components/ui'
import { KELOMPOK_SINGKAT } from '../config/kelompok'
import { formatZ } from '../lib/zscore'

export default function VerifikasiPage() {
  const { user, profile } = useAuth()
  const [sasaran, setSasaran] = useState<Sasaran[]>([])
  const [antro, setAntro] = useState<Antropometri[]>([])
  const [imunisasi, setImunisasi] = useState<Imunisasi[]>([])
  const [skrining, setSkrining] = useState<Skrining[]>([])
  const [kb, setKb] = useState<PelayananKb[]>([])
  const [pesan, setPesan] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isNakes = profile?.role === 'nakes' || profile?.role === 'superadmin'

  const load = useCallback(async () => {
    const [s, a, i, sk, k] = await Promise.all([
      supabase.from('sasaran').select('*'),
      supabase.from('antropometri').select('*').eq('status_validasi', 'pending').order('tanggal'),
      supabase.from('imunisasi').select('*').eq('status_validasi', 'pending').order('tanggal'),
      supabase.from('skrining').select('*').eq('status_validasi', 'pending').order('tanggal'),
      supabase.from('pelayanan_kb').select('*').eq('status_validasi', 'pending').order('tanggal'),
    ])
    if (!s.error) setSasaran(s.data ?? [])
    if (!a.error) setAntro(a.data ?? [])
    if (!i.error) setImunisasi(i.data ?? [])
    if (!sk.error) setSkrining(sk.data ?? [])
    if (!k.error) setKb(k.data ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  const nama = useMemo(() => new Map(sasaran.map((s) => [s.id, s])), [sasaran])

  async function approve(tabel: string, id: string, ok: boolean) {
    if (!isNakes) { setPesan('Hanya Nakes yang dapat memvalidasi.'); return }
    setBusy(true)
    try {
      const { error } = await supabase
        .from(tabel)
        .update({ status_validasi: ok ? 'approved' : 'ditolak', validasi_oleh: user?.id ?? null, validasi_waktu: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
      setPesan(ok ? 'Data disetujui → masuk laporan resmi.' : 'Data ditolak.')
      void load()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader icon="fact_check" title="Verification Queue" sub="Audit input kader — data disetujui Nakes baru masuk laporan resmi & PWS" />

      {pesan && <Notif pesan={pesan} onClear={() => setPesan(null)} tipe={pesan.includes('disetujui') || pesan.includes('ditolak') ? 'info' : 'error'} />}

      {!isNakes && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-space-md font-body-sm text-body-sm text-amber-700">
          Akun Anda ({profile?.role}) bukan Nakes/Super Admin — mode tampilan. Untuk menyetujui data, gunakan akun Nakes.
        </div>
      )}

      <div className="grid grid-cols-4 gap-space-md">
        {[
          { label: 'Antropometri', n: antro.length },
          { label: 'Imunisasi', n: imunisasi.length },
          { label: 'Skrining', n: skrining.length },
          { label: 'KB', n: kb.length },
        ].map((x) => (
          <div key={x.label} className="bg-surface-container p-space-md rounded-lg">
            <p className="font-body-sm text-body-sm text-on-surface-variant">{x.label}</p>
            <p className="font-label-lg text-label-lg text-on-surface font-bold">{x.n}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Antropometri Pending" sub="Periksa Z-Score & data pengukuran sebelum disetujui" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Sasaran', 'BB', 'TB', 'Z BB/U', 'Z TB/U', 'Status', 'Aksi'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {antro.map((a) => {
                const s = nama.get(a.sasaran_id)
                return (
                  <tr key={a.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md text-on-surface">{a.tanggal}</td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}{a.red_flag && <span className="ml-1 text-red-600">⚠</span>}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{a.berat_kg ?? '—'} kg</td>
                    <td className="py-space-xs px-space-md text-on-surface">{a.tinggi_cm ?? '—'} cm</td>
                    <td className="py-space-xs px-space-md font-mono text-on-surface">{formatZ(a.z_bbu)}</td>
                    <td className="py-space-xs px-space-md font-mono text-on-surface">{formatZ(a.z_tbu)}</td>
                    <td className="py-space-xs px-space-md">
                      {a.red_flag && <Chip className="bg-red-500/15 text-red-700">RED FLAG</Chip>}
                    </td>
                    <td className="py-space-xs px-space-md">
                      <div className="flex gap-space-xs">
                        <button className={btnPrimary} disabled={busy} onClick={() => void approve('antropometri', a.id, true)}>Setujui</button>
                        <button className={btnSecondary} disabled={busy} onClick={() => void approve('antropometri', a.id, false)}>Tolak</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {antro.length === 0 && <tr><td colSpan={8}><EmptyState text="Tidak ada antrean." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Imunisasi Pending" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Sasaran', 'Antigen', 'Dosis', 'Status', 'Aksi'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {imunisasi.map((r) => {
                const s = nama.get(r.sasaran_id)
                return (
                  <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.antigen}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.dosis}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.status}</td>
                    <td className="py-space-xs px-space-md">
                      <div className="flex gap-space-xs">
                        <button className={btnPrimary} disabled={busy} onClick={() => void approve('imunisasi', r.id, true)}>Setujui</button>
                        <button className={btnSecondary} disabled={busy} onClick={() => void approve('imunisasi', r.id, false)}>Tolak</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {imunisasi.length === 0 && <tr><td colSpan={6}><EmptyState text="Tidak ada antrean." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Skrining Pending" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Sasaran', 'Kelompok', 'Risiko', 'Aksi'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {skrining.map((r) => {
                const s = nama.get(r.sasaran_id)
                return (
                  <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-md text-on-surface-variant">{KELOMPOK_SINGKAT[r.kelompok]}</td>
                    <td className="py-space-xs px-space-md">
                      <Chip className={r.red_flag ? 'bg-red-500/15 text-red-700' : r.label_risiko === 'sedang' ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700'}>{r.label_risiko}</Chip>
                    </td>
                    <td className="py-space-xs px-space-md">
                      <div className="flex gap-space-xs">
                        <button className={btnPrimary} disabled={busy} onClick={() => void approve('skrining', r.id, true)}>Setujui</button>
                        <button className={btnSecondary} disabled={busy} onClick={() => void approve('skrining', r.id, false)}>Tolak</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {skrining.length === 0 && <tr><td colSpan={5}><EmptyState text="Tidak ada antrean." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Pelayanan KB Pending" />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-container">
                {['Tanggal', 'Sasaran', 'Kontrasepsi', 'Aksi'].map((h) => <th key={h} className="py-space-xs px-space-md font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {kb.map((r) => {
                const s = nama.get(r.sasaran_id)
                return (
                  <tr key={r.id} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-space-xs px-space-md text-on-surface">{r.tanggal}</td>
                    <td className="py-space-xs px-space-md font-bold text-on-surface">{s?.nama ?? '—'}</td>
                    <td className="py-space-xs px-space-md text-on-surface">{r.alat_kontrasepsi}</td>
                    <td className="py-space-xs px-space-md">
                      <div className="flex gap-space-xs">
                        <button className={btnPrimary} disabled={busy} onClick={() => void approve('pelayanan_kb', r.id, true)}>Setujui</button>
                        <button className={btnSecondary} disabled={busy} onClick={() => void approve('pelayanan_kb', r.id, false)}>Tolak</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {kb.length === 0 && <tr><td colSpan={4}><EmptyState text="Tidak ada antrean." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
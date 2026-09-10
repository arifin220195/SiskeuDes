import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface Identitas {
  desa: string
  kecamatan: string
  kabupaten: string
  tahun: string
}

export const IDENTITAS_DEFAULT: Identitas = {
  desa: 'Tegal Rejo',
  kecamatan: 'Tempursari',
  kabupaten: 'Lumajang',
  tahun: '2025',
}

let cached: Identitas | null = null
let inflight: Promise<Identitas> | null = null

function muat(force = false): Promise<Identitas> {
  if (!force && cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = Promise.resolve(
      supabase
        .from('konfigurasi')
        .select('kunci, nilai_aktif')
        .in('kunci', ['desa', 'kecamatan', 'kabupaten', 'tahun_anggaran'])
    )
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map((r) => [r.kunci, r.nilai_aktif]))
        cached = {
          desa: map.desa ?? IDENTITAS_DEFAULT.desa,
          kecamatan: map.kecamatan ?? IDENTITAS_DEFAULT.kecamatan,
          kabupaten: map.kabupaten ?? IDENTITAS_DEFAULT.kabupaten,
          tahun: map.tahun_anggaran ?? IDENTITAS_DEFAULT.tahun,
        }
        inflight = null
        return cached
      })
      .catch(() => {
        inflight = null
        return IDENTITAS_DEFAULT
      })
  }
  return inflight ?? Promise.resolve(IDENTITAS_DEFAULT)
}

/** Paksa cache ulang — panggil setelah konfigurasi desa diubah */
export function invalidateIdentitas() {
  cached = null
  inflight = null
}

export function useIdentitas(): Identitas {
  const [id, setId] = useState<Identitas>(cached ?? IDENTITAS_DEFAULT)
  useEffect(() => {
    muat().then(setId)
  }, [])
  return id
}
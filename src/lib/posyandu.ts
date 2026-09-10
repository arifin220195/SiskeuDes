import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Posyandu, Sasaran } from '../types/database'

export function usePosyandu() {
  const [list, setList] = useState<Posyandu[]>([])
  const [aktifId, setAktifId] = useState<string>(() => localStorage.getItem('posyandu-aktif') ?? '')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('posyandu').select('*').order('nama')
    if (!error) {
      const p = (data as Posyandu[]) ?? []
      setList(p)
      setAktifId((curr) => (curr && p.some((x) => x.id === curr && x.active) ? curr : ''))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function pilih(id: string) {
    setAktifId(id)
    if (id) localStorage.setItem('posyandu-aktif', id)
    else localStorage.removeItem('posyandu-aktif')
  }

  const aktif = list.find((x) => x.id === aktifId && x.active) ?? null
  return { list: list.filter((x) => x.active), aktif, aktifId, setAktif: pilih, loading, reload: load }
}

export function useSasaran(depend?: unknown) {
  const [data, setData] = useState<Sasaran[]>([])
  const load = useCallback(async () => {
    const { data: d, error } = await supabase.from('sasaran').select('*').order('nama')
    if (!error) setData((d as Sasaran[]) ?? [])
  }, [depend])
  useEffect(() => { void load() }, [load])
  return { data, reload: load }
}
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Posyandu, Sasaran } from '../types/database'

export function usePosyandu() {
  const { profile } = useAuth()
  const lockedId = profile?.posyandu_id ?? null
  const [list, setList] = useState<Posyandu[]>([])
  const [aktifId, setAktifId] = useState<string>(() => localStorage.getItem('posyandu-aktif') ?? '')
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('posyandu').select('*').order('nama')
    if (!error) {
      const p = (data as Posyandu[]) ?? []
      setList(p)
      if (lockedId && p.some((x) => x.id === lockedId && x.active)) {
        setAktifId(lockedId)
        setLocked(true)
      } else {
        setLocked(false)
        setAktifId((curr) => (curr && p.some((x) => x.id === curr && x.active) ? curr : ''))
      }
    }
    setLoading(false)
  }, [lockedId])

  useEffect(() => { void load() }, [load])

  function pilih(id: string) {
    if (locked) return
    setAktifId(id)
    if (id) localStorage.setItem('posyandu-aktif', id)
    else localStorage.removeItem('posyandu-aktif')
  }

  const aktif = list.find((x) => x.id === aktifId && x.active) ?? null
  return { list: list.filter((x) => x.active), aktif, aktifId, setAktif: pilih, loading, reload: load, locked, lockedId }
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
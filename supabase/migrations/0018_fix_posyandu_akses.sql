-- ============================================================
-- FIX: kader/nakes/superadmin tidak bisa baca daftar posyandu
-- (policy lama 0012 pakai is_staff -> ganti is_operator)
-- Jalankan di Supabase -> SQL Editor -> Run
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['posyandu','balita','penimbangan','lansia','pelayanan_lansia','penyuluhan','penduduk']
  loop
    execute format('drop policy if exists "staff read %s" on public.%I', t, t);
    execute format('drop policy if exists "staff write %s" on public.%I', t, t);
    execute format('create policy "operator read %s" on public.%I for select to authenticated using (public.is_operator());', t, t);
    execute format('create policy "operator write %s" on public.%I for all to authenticated using (public.is_operator());', t, t);
  end loop;
end $$;

-- Reload cache PostgREST biar langsung aktif
select pg_notify('pgrst', 'reload schema');
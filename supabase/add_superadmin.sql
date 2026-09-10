-- ============================================================
-- Tambah role superadmin ke enum peran
-- PENTING: Jalankan dalam 2 tahap terpisah (New Query masing-masing)
-- karena PostgreSQL tidak bisa pakai nilai enum baru dalam
-- transaksi yang sama dengan ALTER TYPE.
-- ============================================================

-- ===== QUERY 1 — Jalankan sendiri dulu, klik Run =====
ALTER TYPE peran ADD VALUE IF NOT EXISTS 'superadmin';


-- ===== QUERY 2 — Buat New Query baru, jalankan setelah Query 1 berhasil =====
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('kades', 'sekdes', 'bendahara', 'superadmin')
  )
$$;


-- ===== QUERY 3 — Ganti UUID lalu jalankan =====
-- UPDATE public.profiles
-- SET role = 'superadmin', jabatan = 'Super Admin'
-- WHERE id = 'UUID_KAMU_DISINI';

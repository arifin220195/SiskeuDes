-- ============ RESET ALL ============
-- Hapus semua object lama, lalu rebuild dari 0001-0014
-- Jalankan di Supabase SQL Editor → Run
-- ===================================

-- DROP policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "user read self" ON public.profiles;
  DROP POLICY IF EXISTS "staff read all" ON public.profiles;
  DROP POLICY IF EXISTS "user update self" ON public.profiles;
  DROP POLICY IF EXISTS "anon read publik" ON public.pendapatan;
  DROP POLICY IF EXISTS "anon read rekening" ON public.rekening;
  DROP POLICY IF EXISTS "anon insert aspirasi" ON public.aspirasi;
  DROP POLICY IF EXISTS "staff manage aspirasi" ON public.aspirasi;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- DROP triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- DROP functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff() CASCADE;
DROP FUNCTION IF EXISTS public.v_bku() CASCADE;
DROP FUNCTION IF EXISTS public.v_serapan_bidang() CASCADE;
DROP FUNCTION IF EXISTS public.v_kesehatan_ringkas() CASCADE;
DROP FUNCTION IF EXISTS public.v_gizi_per_pos() CASCADE;

-- DROP views
DROP VIEW IF EXISTS public.v_bku CASCADE;
DROP VIEW IF EXISTS public.v_serapan_bidang CASCADE;
DROP VIEW IF EXISTS public.v_kesehatan_ringkas CASCADE;
DROP VIEW IF EXISTS public.v_gizi_per_pos CASCADE;

-- DROP tables (urutan inverse FK)
DROP TABLE IF EXISTS public.aspirasi CASCADE;
DROP TABLE IF EXISTS public.dokumen CASCADE;
DROP TABLE IF EXISTS public.progres CASCADE;
DROP TABLE IF EXISTS public.proyek CASCADE;
DROP TABLE IF EXISTS public.transaksi CASCADE;
DROP TABLE IF EXISTS public.bkk CASCADE;
DROP TABLE IF EXISTS public.spp CASCADE;
DROP TABLE IF EXISTS public.pendapatan CASCADE;
DROP TABLE IF EXISTS public.rekening CASCADE;
DROP TABLE IF EXISTS public.apbdes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.konfigurasi CASCADE;
DROP TABLE IF EXISTS public.usulan_konfigurasi CASCADE;
DROP TABLE IF EXISTS public.posyandu CASCADE;
DROP TABLE IF EXISTS public.kader CASCADE;
DROP TABLE IF EXISTS public.balita CASCADE;
DROP TABLE IF EXISTS public.penimbangan CASCADE;
DROP TABLE IF EXISTS public.lansia CASCADE;
DROP TABLE IF EXISTS public.pelayanan_lansia CASCADE;
DROP TABLE IF EXISTS public.penyuluhan CASCADE;
DROP TABLE IF EXISTS public.peserta_penyuluhan CASCADE;
DROP TABLE IF EXISTS public.penduduk CASCADE;

-- DROP enums
DROP TYPE IF EXISTS peran CASCADE;
DROP TYPE IF EXISTS sumber_dana CASCADE;
DROP TYPE IF EXISTS bidang CASCADE;
DROP TYPE IF EXISTS status_spp CASCADE;
DROP TYPE IF EXISTS status_proyek CASCADE;
DROP TYPE IF EXISTS status_aspirasi CASCADE;
DROP TYPE IF EXISTS jenis_kelamin CASCADE;

-- ============ SELESAI, SEKARANG JALANKAN 0001-0014 ============

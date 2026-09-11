-- ============================================================
-- Ubah nama desa pada data live dari Sukamaju -> Tegal Rejo
-- Jalankan di Supabase -> SQL Editor -> Run
-- ============================================================

-- Konfigurasi identitas desa (dipakai di login & header)
update public.konfigurasi
set nilai_aktif = 'Tegal Rejo'
where kunci = 'desa' and nilai_aktif = 'Sukamaju';

-- Profil user yang masih tercatat 'Sukamaju'
update public.profiles
set desa = 'Tegal Rejo'
where desa = 'Sukamaju';

-- Verifikasi
select kunci, nilai_aktif from public.konfigurasi where kunci = 'desa';
select email, desa from public.profiles p join auth.users u on u.id = p.id order by u.email;
-- ============ FILE: supabase/migrations/0014_identitas.sql ============
-- SiskueDes — Identitas Desa: Tegal Rejo, Kec. Tempursari, Kab. Lumajang
-- SQL Editor -> + New query -> Run
update public.konfigurasi set nilai_aktif = 'Tegal Rejo' where kunci = 'desa';
update public.konfigurasi set nilai_aktif = 'Tempursari' where kunci = 'kecamatan';

insert into public.konfigurasi (kunci, kategori, nama, deskripsi, nilai_aktif)
values ('kabupaten', 'Profil Desa', 'Kabupaten', 'Nama kabupaten tempat desa berada.', 'Lumajang')
on conflict (kunci) do update set nilai_aktif = 'Lumajang';

update public.profiles set desa = 'Tegal Rejo', kecamatan = 'Tempursari';
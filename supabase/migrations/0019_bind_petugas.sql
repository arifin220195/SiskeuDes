-- ============================================================
-- 0019: Petugas terikat ke posyandu (langsung masuk akun posyandunya)
-- Jalankan di Supabase -> SQL Editor -> Run
-- ============================================================

-- Kolom posyandu pada profil: null = admin (bisa pilih semua)
alter table public.profiles add column if not exists posyandu_id uuid references public.posyandu (id);

-- Bind akun demo: kader & nakes -> Posyandu Melati
update public.profiles
set posyandu_id = 'd5719b10-0000-4000-8000-000000000010'
where id in (select id from auth.users where email in ('kader@demo.id', 'nakes@demo.id'));

-- Verifikasi
select u.email, p.nama, p.role::text as peran, pos.nama as posyandu
from public.profiles p
join auth.users u on u.id = p.id
left join public.posyandu pos on pos.id = p.posyandu_id
order by p.role;
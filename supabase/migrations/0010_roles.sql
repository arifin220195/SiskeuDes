-- ============ FILE: supabase/migrations/0010_roles.sql ============
-- SiskueDes — Role & jabatan akun demo
-- SQL Editor → Run
update public.profiles p
set role = (case
      when u.email = 'kades.sukamaju@gmail.com'      then 'kades'
      when u.email = 'sekdes.sukamaju@gmail.com'     then 'sekdes'
      when u.email = 'bendahara.sukamaju@gmail.com'  then 'bendahara'
    end)::peran,
    jabatan = case
      when u.email = 'kades.sukamaju@gmail.com'      then 'Kepala Desa'
      when u.email = 'sekdes.sukamaju@gmail.com'     then 'Sekretaris Desa'
      when u.email = 'bendahara.sukamaju@gmail.com'  then 'Bendahara Desa'
    end,
    nama = case
      when u.email = 'kades.sukamaju@gmail.com'      then 'Demo Kades'
      when u.email = 'sekdes.sukamaju@gmail.com'     then 'Demo Sekdes'
      when u.email = 'bendahara.sukamaju@gmail.com'  then 'Demo Bendahara'
    end
from auth.users u
where p.id = u.id
  and u.email in ('kades.sukamaju@gmail.com','sekdes.sukamaju@gmail.com','bendahara.sukamaju@gmail.com');

select u.email, p.role, p.jabatan, p.nama
from public.profiles p
join auth.users u on u.id = p.id
order by u.email;
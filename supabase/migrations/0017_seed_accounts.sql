-- ============================================================
-- AKUN DEMO POSYANDUKU — jalankan di Supabase → SQL Editor → Run
-- Membuat 6 akun demo (password seragam: demo1234)
-- Aman dijalankan berulang (idempotent, on conflict)
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  a text[][];
  v2 text[];
  v uuid;
  v_pwd text := 'demo1234';
begin
  a := array[
    array['kades@demo.id',    'Kades Demo',    'Kepala Desa',    'kades'],
    array['sekdes@demo.id',   'Sekdes Demo',   'Sekretaris Desa','sekdes'],
    array['bendahara@demo.id','Bendahara Demo','Bendahara',      'bendahara'],
    array['superadmin@demo.id','Admin Super',  'Super Admin',    'superadmin'],
    array['nakes@demo.id',    'Nakes Melati',  'Bidan Desa',     'nakes'],
    array['kader@demo.id',    'Kader Melati',  'Kader Posyandu', 'kader']
  ];

  foreach v2 slice 1 in array a
  loop
    select id into v from auth.users where email = v2[1] limit 1;

    if v is null then
      insert into auth.users
        (instance_id, id, aud, role, email, encrypted_password,
         email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
         created_at, updated_at)
      values
        ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
         'authenticated', 'authenticated', v2[1], crypt(v_pwd, gen_salt('bf')),
         now(), '{"provider":"email","providers":["email"]}',
         jsonb_build_object('nama', v2[2]), now(), now())
      returning id into v;
    end if;

    insert into public.profiles (id, nama, jabatan, role, desa)
    values (v, v2[2], v2[3], v2[4]::peran, 'Tegal Rejo')
    on conflict (id) do update
      set role = excluded.role, jabatan = excluded.jabatan, nama = excluded.nama;
  end loop;
end $$;

-- Pastikan akunmu sendiri tidak kena reset: baris di atas hanya sentuh 6 email demo.
select u.email, p.role::text as peran, p.nama, p.jabatan
from public.profiles p
join auth.users u on u.id = p.id
order by p.role;
-- ============================================================
-- FIX LOGIN AKUN DEMO (tolong jalankan di Supabase -> SQL Editor)
-- Copy seluruh isi file ini, tempel di SQL Editor, klik Run
-- ============================================================

-- 1) Isi kolom teks/angka wajib yang NULL hanya utk akun @demo.id (jangan sentuh akun lain)
do $$
declare r record;
begin
  for r in
    select column_name, data_type from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and data_type in ('character varying','text','character','smallint','integer','boolean')
      and column_name not like 'phone%'
  loop
    execute format(
      'update auth.users set %I = %L where %I is null and email like ''%%@demo.id''',
      r.column_name,
      case when r.data_type in ('smallint','integer') then '0'
           when r.data_type = 'boolean' then 'false'
           else '' end,
      r.column_name
    );
  end loop;
end $$;

-- 2) Pastikan setiap akun demo punya baris di auth.identities
insert into auth.identities
  (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', u.email, now(), now(), now()
from auth.users u
where u.email like '%@demo.id'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);
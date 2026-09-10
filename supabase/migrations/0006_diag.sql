-- ============ FILE: supabase/migrations/0006_diag.sql ============
-- SiskueDes — Diagnosa dalam 1 sel teks (tinggal copas)
select string_agg(policyname || ' | cmd=' || cmd || ' | roles=' || roles::text || ' | check=' || coalesce(with_check::text,'-'), E'\n') as policy_aspirasi
from pg_policies
where schemaname = 'public' and tablename = 'aspirasi';
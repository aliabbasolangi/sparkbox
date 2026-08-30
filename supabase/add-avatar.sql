-- Run once in Supabase → SQL Editor so Allegedly can save profile pictures.
alter table players add column if not exists avatar text;

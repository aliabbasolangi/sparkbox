-- player avatar id (matches images/pfps)
alter table players add column if not exists avatar text;

-- Records a QR scan with everything needed for real analytics.
--
-- Why a function instead of the client's two separate calls:
--   * the client IP is only visible to the database server, so it has to be read
--     here (PostgREST exposes it in the request.headers setting);
--   * the scan row and the counter bump become one atomic, one-round-trip
--     operation, so the counter can never drift away from the scan rows;
--   * the showroom location is copied from the car at scan time, which is what
--     the "Top Locations" panel groups by.
--
-- security invoker: it runs with the caller's rights. scan_records and cars both
-- have RLS disabled and anon holds the needed grants, so this grants nothing new.

alter table scan_records
  add column if not exists scanner_timezone text;

-- Backfill the showroom location for the scans recorded before this migration,
-- so the location panel has real history instead of starting from zero.
update scan_records s
   set location = nullif(trim(c.location), '')
  from cars c
 where c.id = s.car_id
   and s.location is null
   and nullif(trim(c.location), '') is not null;

create or replace function public.record_scan(
  p_car_id      text,
  p_device_type text default null,
  p_user_agent  text default null,
  p_timezone    text default null
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id      text;
  v_ip      text;
  v_headers json;
begin
  -- Client IP, read server-side. x-forwarded-for is a comma list when there are
  -- proxies in front of us; the first entry is the original client.
  v_headers := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  v_ip := nullif(trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');
  if v_ip is null then
    v_ip := nullif(trim(coalesce(v_headers ->> 'x-real-ip', '')), '');
  end if;

  insert into scan_records (
    id, car_id, company_id, scanned_at,
    device_type, location, user_agent, ip_address, scanner_timezone
  )
  select
    gen_random_uuid()::text,
    c.id,
    c.company_id,
    to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    nullif(trim(p_device_type), ''),
    nullif(trim(c.location), ''),
    left(coalesce(p_user_agent, ''), 400),
    v_ip,
    nullif(trim(p_timezone), '')
  from cars c
  where c.id = p_car_id
  returning id into v_id;

  if v_id is null then
    return null;   -- unknown car - nothing recorded, nothing counted
  end if;

  update cars
     set scan_count = coalesce(scan_count, 0) + 1,
         last_scanned_at = now()
   where id = p_car_id;

  return v_id;
end;
$$;

grant execute on function public.record_scan(text, text, text, text) to anon, authenticated, service_role;

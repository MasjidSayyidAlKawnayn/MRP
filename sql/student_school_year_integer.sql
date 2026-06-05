begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'mqs'
      and table_name = 'students'
      and column_name = 'school_year'
      and data_type <> 'integer'
  ) then
    alter table mqs.students
      alter column school_year type integer
      using (
        case
          when school_year is null or btrim(school_year::text) = '' then null
          when translate(school_year::text, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789') ~ '\d+' then
            (regexp_match(
              translate(school_year::text, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
              '\d+'
            ))[1]::integer
          when school_year::text ~ '(الحادي عشر|حادي عشر)' then 11
          when school_year::text ~ '(الثاني عشر|ثاني عشر)' then 12
          when school_year::text ~ '(الأول|الاول|اول)' then 1
          when school_year::text ~ '(الثاني|ثاني)' then 2
          when school_year::text ~ '(الثالث|ثالث)' then 3
          when school_year::text ~ '(الرابع|رابع)' then 4
          when school_year::text ~ '(الخامس|خامس)' then 5
          when school_year::text ~ '(السادس|سادس)' then 6
          when school_year::text ~ '(السابع|سابع)' then 7
          when school_year::text ~ '(الثامن|ثامن)' then 8
          when school_year::text ~ '(التاسع|تاسع)' then 9
          when school_year::text ~ '(العاشر|عاشر)' then 10
          else null
        end
      );
  end if;
end $$;

commit;

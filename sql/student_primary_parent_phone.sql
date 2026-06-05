begin;

create schema if not exists mqs;

alter table mqs.students
  add column if not exists primary_parent_phone text;

comment on column mqs.students.primary_parent_phone is
  'Primary parent/guardian phone number used for routine student updates.';

with family_named_students as (
  select
    id,
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(first_name, '^أهل[[:space:]]+', ''),
          '،.*$',
          ''
        ),
        '[[:space:]]+[٠-٩0-9]+[[:space:]]+سنين$',
        ''
      )
    ) as student_name
  from mqs.students
  where first_name like 'أهل %'
    and deleted_at is null
)
update mqs.students students
set
  primary_parent_phone = coalesce(
    nullif(students.primary_parent_phone, ''),
    nullif(students.phone, '')
  ),
  phone = case
    when students.primary_parent_phone is null or students.primary_parent_phone = ''
      then null
    else students.phone
  end,
  first_name = case
    when family_named_students.student_name ~ '[[:space:]]'
      then regexp_replace(family_named_students.student_name, '[[:space:]]+[^[:space:]]+$', '')
    else family_named_students.student_name
  end,
  last_name = case
    when family_named_students.student_name ~ '[[:space:]]'
      then regexp_replace(family_named_students.student_name, '^.*[[:space:]]+', '')
    else ''
  end,
  updated_at = now()
from family_named_students
where students.id = family_named_students.id;

notify pgrst, 'reload schema';

commit;

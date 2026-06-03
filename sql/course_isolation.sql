begin;

create schema if not exists mqs;

create table if not exists mqs.courses (
  id integer generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

insert into mqs.courses (slug, name)
values ('default', 'Default Course')
on conflict (slug) do nothing;

do $$
declare
  default_course_id integer;
  app_table text;
begin
  select id into default_course_id
  from mqs.courses
  where slug = 'default';

  foreach app_table in array array[
    'students',
    'teacher',
    'groups',
    'homework_assignments',
    'memorization_pages',
    'awqaf_certificate_pages',
    'page_point_awards',
    'manual_point_transactions',
    'page_point_tiers',
    'attendance_sessions',
    'attendance_records'
  ]
  loop
    execute format('alter table mqs.%I add column if not exists course_id integer references mqs.courses(id)', app_table);
    execute format('update mqs.%I set course_id = $1 where course_id is null', app_table)
      using default_course_id;
    execute format('alter table mqs.%I alter column course_id set not null', app_table);
  end loop;
end $$;

create index if not exists students_course_id_idx on mqs.students(course_id);
create index if not exists groups_course_id_idx on mqs.groups(course_id);
create index if not exists teacher_course_id_idx on mqs.teacher(course_id);
create index if not exists homework_assignments_course_id_idx on mqs.homework_assignments(course_id);
create index if not exists memorization_pages_course_id_idx on mqs.memorization_pages(course_id);
create index if not exists awqaf_certificate_pages_course_id_idx on mqs.awqaf_certificate_pages(course_id);
create index if not exists page_point_awards_course_id_idx on mqs.page_point_awards(course_id);
create index if not exists manual_point_transactions_course_id_idx on mqs.manual_point_transactions(course_id);
create index if not exists page_point_tiers_course_id_idx on mqs.page_point_tiers(course_id);
create index if not exists attendance_sessions_course_id_idx on mqs.attendance_sessions(course_id);
create index if not exists attendance_records_course_id_idx on mqs.attendance_records(course_id);

create unique index if not exists groups_course_name_active_unique
  on mqs.groups (course_id, name)
  where deleted_at is null;

create unique index if not exists attendance_sessions_course_sequence_active_unique
  on mqs.attendance_sessions (course_id, session_date, sequence_on_date)
  where deleted_at is null;

create unique index if not exists attendance_sessions_course_label_sequence_unique
  on mqs.attendance_sessions (course_id, session_date, label, sequence_on_date);

create unique index if not exists attendance_records_course_student_session_unique
  on mqs.attendance_records (course_id, student_id, attendance_session_id);

drop index if exists mqs.memorization_pages_student_page_active_unique;
create unique index if not exists memorization_pages_course_student_page_active_unique
  on mqs.memorization_pages (course_id, student_id, page)
  where deleted_at is null;

create or replace function mqs.assert_same_course(
  referenced_table regclass,
  referenced_id integer,
  expected_course_id integer,
  relation_name text
)
returns void
language plpgsql
stable
as $$
declare
  actual_course_id integer;
begin
  if referenced_id is null then
    return;
  end if;

  execute format('select course_id from %s where id = $1', referenced_table)
    into actual_course_id
    using referenced_id;

  if actual_course_id is null then
    raise exception 'Referenced % row % was not found', relation_name, referenced_id;
  end if;

  if actual_course_id <> expected_course_id then
    raise exception 'Cross-course reference rejected for % row %', relation_name, referenced_id;
  end if;
end;
$$;

create or replace function mqs.enforce_course_relations()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'students' then
    perform mqs.assert_same_course('mqs.groups', new.group_id, new.course_id, 'group');
    perform mqs.assert_same_course('mqs.teacher', new.teacher_id, new.course_id, 'teacher');
  elsif tg_table_name = 'groups' then
    perform mqs.assert_same_course('mqs.teacher', new.teacher_id, new.course_id, 'teacher');
  elsif tg_table_name = 'homework_assignments' then
    perform mqs.assert_same_course('mqs.students', new.student_id, new.course_id, 'student');
  elsif tg_table_name = 'memorization_pages' then
    perform mqs.assert_same_course('mqs.students', new.student_id, new.course_id, 'student');
  elsif tg_table_name = 'awqaf_certificate_pages' then
    perform mqs.assert_same_course('mqs.students', new.student_id, new.course_id, 'student');
  elsif tg_table_name = 'page_point_awards' then
    perform mqs.assert_same_course('mqs.memorization_pages', new.memorization_page_id, new.course_id, 'memorization page');
    perform mqs.assert_same_course('mqs.students', new.student_id, new.course_id, 'student');
  elsif tg_table_name = 'manual_point_transactions' then
    perform mqs.assert_same_course('mqs.students', new.student_id, new.course_id, 'student');
  elsif tg_table_name = 'attendance_records' then
    perform mqs.assert_same_course('mqs.students', new.student_id, new.course_id, 'student');
    perform mqs.assert_same_course('mqs.attendance_sessions', new.attendance_session_id, new.course_id, 'attendance session');
  end if;

  return new;
end;
$$;

do $$
declare
  app_table text;
begin
  foreach app_table in array array[
    'students',
    'teacher',
    'groups',
    'homework_assignments',
    'memorization_pages',
    'awqaf_certificate_pages',
    'page_point_awards',
    'manual_point_transactions',
    'attendance_records'
  ]
  loop
    execute format('drop trigger if exists enforce_course_relations on mqs.%I', app_table);
    execute format(
      'create trigger enforce_course_relations before insert or update on mqs.%I for each row execute function mqs.enforce_course_relations()',
      app_table
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;

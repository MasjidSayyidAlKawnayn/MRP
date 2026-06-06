begin;

alter table mqs.students
  add column if not exists memorization_summary text,
  add column if not exists awqaf_certificates_summary text,
  add column if not exists registration_source_data jsonb;

comment on column mqs.students.memorization_summary is
  'Original free-text Quran memorization answer from registration.';
comment on column mqs.students.awqaf_certificates_summary is
  'Original free-text Awqaf certificate answer from registration.';
comment on column mqs.students.registration_source_data is
  'Lossless snapshot of the source registration row.';

notify pgrst, 'reload schema';

commit;

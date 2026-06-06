begin;

alter table mqs.teacher
  alter column "group" drop not null;

commit;

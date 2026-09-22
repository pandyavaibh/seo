-- Every other accounts(id)-referencing table cascades on account delete
-- (contacts, deals set null, deliverables, invoices, reports, ...) except
-- projects, which was left as NO ACTION (the default) — meaning "Delete
-- client" was impossible for any account with an engagement on it, with
-- no clear error surfaced to explain why. Bring it in line with the rest:
-- deleting a client removes its engagements too, same as deleting a
-- project already removes its tasks/checklist/keyword history.
alter table projects drop constraint projects_account_id_fkey;
alter table projects add constraint projects_account_id_fkey
  foreign key (account_id) references accounts(id) on delete cascade;

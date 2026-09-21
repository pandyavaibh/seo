-- =====================================================================
-- A client should never see a draft invoice (same "draft is staff-only"
-- rule already applied to reports) — the original Stage 7 policy let
-- a client read every invoice on their account regardless of status.
-- =====================================================================

drop policy invoices_read on invoices;
create policy invoices_read on invoices for select using (
  auth_member_role() in ('admin', 'manager')
  or (account_id = auth_member_account_id() and status != 'draft')
);

drop policy invoice_line_items_read on invoice_line_items;
create policy invoice_line_items_read on invoice_line_items for select using (
  exists (
    select 1 from invoices i where i.id = invoice_line_items.invoice_id
    and (
      auth_member_role() in ('admin', 'manager')
      or (i.account_id = auth_member_account_id() and i.status != 'draft')
    )
  )
);

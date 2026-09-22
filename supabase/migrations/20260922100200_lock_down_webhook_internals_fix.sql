-- =====================================================================
-- fire_webhooks() and the trg_*() trigger functions are internal only
-- — they're meant to run exclusively as part of the reports/invoices/
-- deals triggers, never as a directly-callable RPC. Unlike this app's
-- existing SECURITY DEFINER helpers (auth_member_id() etc., which are
-- harmless to call directly since they only ever report facts about
-- the caller), fire_webhooks() takes an arbitrary event/account/
-- payload and fires a real outbound HTTP POST to every matching
-- webhook_subscriptions row — left publicly callable, any signed-in
-- user could spoof "report.sent"/"invoice.paid"/"deal.won" events with
-- fabricated data at every subscriber's URL.
--
-- Supabase grants EXECUTE on every public-schema function directly to
-- anon/authenticated (not just to the PUBLIC pseudo-role), so
-- `revoke ... from public` alone doesn't remove it — has to be
-- revoked from anon/authenticated explicitly, which is what actually
-- closes this. The triggers keep working because trigger invocation
-- isn't gated by the invoking role's EXECUTE privilege on the trigger
-- function at all — only a direct RPC call is.
-- =====================================================================

revoke execute on function fire_webhooks(text, uuid, jsonb) from anon, authenticated;
revoke execute on function trg_report_sent() from anon, authenticated;
revoke execute on function trg_invoice_paid() from anon, authenticated;
revoke execute on function trg_deal_won() from anon, authenticated;

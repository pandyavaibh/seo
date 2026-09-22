-- =====================================================================
-- Keyword search volume — the real tool's Keywords tab has a "Search
-- volume (optional)" field alongside each keyword (confirmed against
-- the user's own rank-tracking spreadsheet, which lists Sr. No. /
-- Keywords / Search Volume). Free-text monthly search volume the
-- staff member enters by hand — no keyword-research API involved,
-- same manual-tracking approach as the rest of Rankings.
-- =====================================================================

alter table keywords add column search_volume integer;

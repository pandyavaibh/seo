-- =====================================================================
-- Real sitewide checklist — replaces the 6-item placeholder seeded in
-- the baseline schema with the actual 81-item checklist from the
-- user's live tool (vrbonkers.com/tracker/), transcribed exactly from
-- screenshots of that tool: 9 categories, each item carrying a
-- priority (high/medium/low) and a reference tag (e.g. "robots.txt",
-- "Spam Policies") the real tool shows as a small pill under the
-- label. Nothing here is invented — every label, category, priority
-- and tag matches what's shown in the live tool.
--
-- checklist_runs.done (boolean) becomes checklist_runs.status, a
-- 4-state field (to_do/in_progress/done/na) — the real tool tracks
-- "N/A" and "In Progress" as real states, not just done/not-done.
-- Backfilled from the old boolean before it's dropped. done_at still
-- only gets set when status becomes 'done' (see use-checklist.ts).
-- =====================================================================

alter table checklist_template_items add column priority text check (priority in ('high', 'medium', 'low'));
alter table checklist_template_items add column reference_tag text;

alter table checklist_runs add column status text not null default 'to_do'
  check (status in ('to_do', 'in_progress', 'done', 'na'));
update checklist_runs set status = case when done then 'done' else 'to_do' end;
alter table checklist_runs drop column done;

-- Clears the 6 placeholder items and, via checklist_runs'
-- on-delete-cascade template_item_id FK, any demo checklist_runs rows
-- pointing at them.
delete from checklist_template_items;

insert into checklist_template_items (label, category, priority, reference_tag, sort_order) values
-- Technical Foundation (21)
('Site publicly accessible, no login wall blocking Googlebot', 'Technical Foundation', 'high', 'Technical Requirements', 100),
('robots.txt reviewed line-by-line for accidental blocks', 'Technical Foundation', 'high', 'robots.txt', 101),
('robots.txt under 500 KiB, UTF-8, at domain root', 'Technical Foundation', 'low', 'robots.txt Spec', 102),
('Important pages return real HTTP 200 (no soft 404s)', 'Technical Foundation', 'high', 'Troubleshoot Crawling Errors', 103),
('Crawl Stats report checked for availability issues', 'Technical Foundation', 'medium', 'Googlebot', 104),
('URL Inspection Tool used to confirm rendered content matches user view', 'Technical Foundation', 'high', 'JavaScript SEO', 105),
('CSS/JS resources not blocked from crawling', 'Technical Foundation', 'high', 'Technical Requirements', 106),
('JS-rendered content confirmed present in rendered HTML (not behind scroll/click)', 'Technical Foundation', 'high', 'Lazy Loading', 107),
('All key links use real <a href> markup', 'Technical Foundation', 'high', 'Crawlable Links', 108),
('site: search sanity-checked against actual indexed content', 'Technical Foundation', 'medium', 'SEO Starter Guide', 109),
('No conflicting canonical signals (sitemap vs rel=canonical)', 'Technical Foundation', 'high', 'Canonicalization', 110),
('noindex pages confirmed NOT also blocked by robots.txt', 'Technical Foundation', 'high', 'noindex', 111),
('<head> validated - no stray tags breaking metadata parsing', 'Technical Foundation', 'medium', 'Valid Page Metadata', 112),
('XML sitemap exists, submitted in Search Console, within size limits', 'Technical Foundation', 'high', 'Sitemaps', 113),
('URL structure reviewed (descriptive, hyphens, minimal parameters)', 'Technical Foundation', 'medium', 'URL Structure', 114),
('Mobile/desktop content parity confirmed', 'Technical Foundation', 'high', 'Mobile-First Indexing', 115),
('Core Web Vitals within acceptable range', 'Technical Foundation', 'medium', 'Getting Started', 116),
('Broken internal/external links fixed and a useful custom 404 page in place', 'Technical Foundation', 'high', 'Troubleshoot Crawling Errors', 117),
('Redirect chains and loops cleaned up - one-hop 301s, no unnecessary hops', 'Technical Foundation', 'medium', '301 Redirects', 118),
('Duplicate URLs and parameter variants controlled (filters, sessions, tags, pagination)', 'Technical Foundation', 'high', 'Canonicalization', 119),
('PageSpeed and render-blocking assets reviewed (images, scripts, CSS, fonts, third-party tags)', 'Technical Foundation', 'medium', 'Getting Started', 120),
-- Content Quality (10)
('Content run through Google''s helpful-content self-assessment questions', 'Content Quality', 'high', 'Creating Helpful Content', 200),
('Content originality confirmed (no scraped/spun content)', 'Content Quality', 'high', 'Spam Policies', 201),
('Content comprehensiveness checked against top-ranking competitors', 'Content Quality', 'medium', 'SEO Strategy', 202),
('Authorship/bylines clear and credible on key content', 'Content Quality', 'medium', 'Creating Helpful Content', 203),
('E-E-A-T signals present for YMYL topics (health/finance/safety) - remember E-E-A-T itself isn''t a Google ranking factor; it describes the kind of content that informs the signals ranking systems use', 'Content Quality', 'high', 'Creating Helpful Content', 204),
('AI-assisted content reviewed for genuine added value (not mass-produced)', 'Content Quality', 'high', 'Using Gen-AI Content', 205),
('Content calendar mapped to real search intent', 'Content Quality', 'medium', 'SEO Strategy', 206),
('Outdated content flagged for refresh or removal', 'Content Quality', 'medium', 'SEO Starter Guide', 207),
('Thin, duplicate and outdated pages audited - improved, consolidated, redirected or removed based on real relevance and performance', 'Content Quality', 'high', 'SEO Starter Guide', 208),
('Relevant FAQs answer real recurring questions; FAQ schema added only when the same Q&A is visible - Google limits the FAQ rich result to a narrow set of authoritative government/health sites, so treat this as a content and AI-answer aid, not a guaranteed snippet', 'Content Quality', 'medium', 'SD Policies', 209),
-- On-Page & Structured Data (7)
('Unique, descriptive title tags on every page (no stuffing/boilerplate)', 'On-Page & Structured Data', 'high', 'Title Link', 300),
('Unique meta descriptions per page, around 150-160 characters as a practical guide - Google has no hard length limit and may substitute its own snippet', 'On-Page & Structured Data', 'medium', 'Snippet', 301),
('One H1 per page with the primary keyword, in a logical H1 > H2 > H3 hierarchy - good for readers and accessibility; heading order itself is a low-priority ranking factor per Google', 'On-Page & Structured Data', 'high', 'SEO Strategy', 302),
('Images use real <img> tags with descriptive filenames and alt text', 'On-Page & Structured Data', 'medium', 'Google Images', 303),
('Structured data implemented for applicable content types', 'On-Page & Structured Data', 'high', 'Structured Data', 304),
('Structured data validated with the Rich Results Test - remember Google doesn''t guarantee a rich result even when markup is valid', 'On-Page & Structured Data', 'high', 'SD Policies', 305),
('Byline dates visible on-page and matching structured data', 'On-Page & Structured Data', 'low', 'Publication Dates', 306),
-- Internal Linking (3)
('Internal linking reviewed - every important page reachable, none orphaned', 'Internal Linking', 'medium', 'Crawlable Links', 400),
('Descriptive, natural anchor text used - not "click here" or repetitive exact-match phrases', 'Internal Linking', 'low', 'Crawlable Links', 401),
('Service, location and content hub pages linked logically, without overlinking', 'Internal Linking', 'medium', 'SEO Strategy', 402),
-- Local SEO (5)
('Google Business Profile audited - category, services, description, hours, posts, photos, reviews, website and appointment links', 'Local SEO', 'high', 'Establish Business Details', 500),
('NAP (name, address, phone) consistent across the website, Google Business Profile and key citations', 'Local SEO', 'high', 'Establish Business Details', 501),
('Local citations built or corrected on accurate, reputable industry and local listings - not directory spam', 'Local SEO', 'medium', 'Spam Policies', 502),
('Location/service pages reviewed for genuine local value - no city-name swaps, thin pages or doorway-page patterns', 'Local SEO', 'high', 'Spam Policies', 503),
('Reviews monitored and responded to professionally, using a compliant request process', 'Local SEO', 'medium', 'Establish Business Details', 504),
-- AEO / GEO / AI Search Readiness (7)
('Content crawlable and indexed (baseline gate for AI Overviews/AI Mode)', 'AEO / GEO / AI Search Readiness', 'high', 'AI Features', 600),
('No llms.txt / content-chunking / AI-specific rewrites sold to client - Google has said these don''t help', 'AEO / GEO / AI Search Readiness', 'medium', 'AI Optimization Guide', 601),
('Content favors a distinctive viewpoint over commodity information', 'AEO / GEO / AI Search Readiness', 'medium', 'AI Optimization Guide', 602),
('Main question or answer given directly near the top of informational pages', 'AEO / GEO / AI Search Readiness', 'medium', 'AI Optimization Guide', 603),
('Complex answers made scannable with question-style headings, lists and comparison tables', 'AEO / GEO / AI Search Readiness', 'medium', 'AI Optimization Guide', 604),
('People, services, places and sources named clearly, with claims backed by genuine evidence', 'AEO / GEO / AI Search Readiness', 'medium', 'AI Optimization Guide', 605),
('Generative AI performance report monitored in Search Console', 'AEO / GEO / AI Search Readiness', 'low', 'AI Features', 606),
-- Link Authority & Spam Policy Compliance (13)
('No cloaking (content shown to Google differs from users)', 'Link Authority & Spam Policy Compliance', 'high', 'Spam Policies', 700),
('No doorway pages', 'Link Authority & Spam Policy Compliance', 'high', 'Spam Policies', 701),
('No keyword stuffing, hidden text, or hidden links', 'Link Authority & Spam Policy Compliance', 'high', 'Spam Policies', 702),
('No link buying/selling or undisclosed paid links without rel=sponsored/nofollow', 'Link Authority & Spam Policy Compliance', 'high', 'Link Spam', 703),
('No scraped or thinly-spun content presented as original', 'Link Authority & Spam Policy Compliance', 'high', 'Spam Policies', 704),
('No thin affiliate content with unmodified merchant descriptions', 'Link Authority & Spam Policy Compliance', 'medium', 'Spam Policies', 705),
('No scaled/mass AI content generation without real value-add', 'Link Authority & Spam Policy Compliance', 'high', 'Scaled Content Abuse', 706),
('No expired domain abuse', 'Link Authority & Spam Policy Compliance', 'medium', 'Spam Policies', 707),
('No site reputation abuse (third-party content just to borrow authority)', 'Link Authority & Spam Policy Compliance', 'medium', 'Spam Policies', 708),
('No sneaky redirects or misleading functionality', 'Link Authority & Spam Policy Compliance', 'high', 'Spam Policies', 709),
('No cloaked or unreasonably long-running A/B tests', 'Link Authority & Spam Policy Compliance', 'medium', 'Website Testing', 710),
('Backlink profile audited regularly - referring domains, relevance, new/lost links, anchor patterns and suspicious activity', 'Link Authority & Spam Policy Compliance', 'high', 'Spam Policies', 711),
('Relevant links and mentions earned through genuinely useful content, PR, partnerships and outreach - not manipulative link building', 'Link Authority & Spam Policy Compliance', 'medium', 'Spam Policies', 712),
-- SEO Strategy & Planning (3)
('Keyword map created - one primary intent and supporting terms per important page, avoiding cannibalisation', 'SEO Strategy & Planning', 'high', 'SEO Strategy', 800),
('Search intent reviewed against current search results before creating or updating a page', 'SEO Strategy & Planning', 'high', 'SEO Strategy', 801),
('Competitor topic coverage, UX, content gaps and visibility audited (without copying content)', 'SEO Strategy & Planning', 'medium', 'SEO Strategy', 802),
-- Analytics, Reporting & Ongoing Monitoring (12)
('GA4 setup verified - key events, conversions, exclusions, cross-domain settings and reporting access', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'SEO Strategy', 900),
('Google Search Console verified - ownership, index coverage, sitemap status, queries, pages and manual actions', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'Security', 901),
('Keyword and local visibility tracked using consistent monitoring rules', 'Analytics, Reporting & Ongoing Monitoring', 'medium', 'SEO Strategy', 902),
('Traffic, leads and conversions reported - real business outcomes, not rankings alone', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'SEO Strategy', 903),
('Issues prioritised and assigned an owner, target date and fixed date', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'Debugging Traffic Drops', 904),
('Weekly/biweekly Search Console Performance report reviewed', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'Debugging Traffic Drops', 905),
('Monthly Crawl Stats, Page Indexing, and Security Issues reports reviewed', 'Analytics, Reporting & Ongoing Monitoring', 'medium', 'Security', 906),
('Quarterly full traffic-drop debugging framework run (or after any reported drop)', 'Analytics, Reporting & Ongoing Monitoring', 'medium', 'Debugging Traffic Drops', 907),
('Core update timing checked against Search Status Dashboard when drops occur', 'Analytics, Reporting & Ongoing Monitoring', 'medium', 'Core Updates', 908),
('Site migration checklist followed for any URL/domain changes', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'Site Move', 909),
('Regular site crawls run to recheck technical health, content gaps, internal linking and indexation as the site changes', 'Analytics, Reporting & Ongoing Monitoring', 'medium', 'SEO Starter Guide', 910),
('SEO plan reviewed and updated using performance evidence, customer feedback and search changes', 'Analytics, Reporting & Ongoing Monitoring', 'high', 'SEO Strategy', 911);

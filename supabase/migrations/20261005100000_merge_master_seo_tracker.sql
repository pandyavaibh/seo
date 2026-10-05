-- Merge in a 109-task "Master SEO Tracker" uploaded by the user — a
-- consolidated methodology checklist merged from 7 source workbooks,
-- covering Planning, Technical SEO, Content, On-page SEO, Structured
-- data, AEO and GEO, Off-page SEO, Local SEO, Ecommerce, International
-- SEO, Migration and launch, User experience, Measurement and Keyword
-- research. By request: "mix both 81 item checklist and 109 task as
-- well" — added alongside the existing 53 active checklist items
-- (Content Quality / Internal Linking / Local SEO / AEO-GEO / Link
-- Authority / SEO Strategy / Analytics categories), not replacing
-- them. The one exact category-name match ("Local SEO") merges
-- naturally into a single section in the Checklist UI, which groups by
-- category text; the rest add as new sections.
--
-- Not touched: the 28 Technical Foundation / On-Page & Structured Data
-- items already deactivated when those categories became the dated
-- Backlinks/On-Page/Technical activity-group system
-- (20260922290000_client_activities.sql) — reactivating them would
-- double-track the same work two different ways. "81 item checklist"
-- in the request is read as naming the feature, not asking to restore
-- those 28.
--
-- reference_tag holds each task's original Task ID (SEO-001 .. SEO-109)
-- from the source workbook, same role the existing items' reference_tag
-- already plays (a short, clickable-looking provenance badge next to
-- the label). sort_order starts at 1000 (existing items top out at
-- 911) in blocks of 100 per category, in the source sheet's own
-- category order, so new sections render after the existing ones.
insert into checklist_template_items (label, category, priority, reference_tag, sort_order) values
('Agree objectives and SEO scope', 'Planning', 'high', 'SEO-001', 1000),
('Confirm access and responsible owners', 'Planning', 'high', 'SEO-002', 1001),
('Save the starting baseline', 'Planning', 'high', 'SEO-003', 1002),
('Review vendors and proposed tactics', 'Planning', 'high', 'SEO-004', 1003),
('Document AI crawler and preview policy', 'Planning', 'medium', 'SEO-005', 1004),
('Review account permissions', 'Planning', 'high', 'SEO-006', 1005),
('Audit robots.txt and crawler access', 'Technical SEO', 'high', 'SEO-007', 1100),
('Check indexability and noindex rules', 'Technical SEO', 'high', 'SEO-008', 1101),
('Resolve HTTP errors and soft 404s', 'Technical SEO', 'high', 'SEO-009', 1102),
('Simplify redirects', 'Technical SEO', 'high', 'SEO-010', 1103),
('Monitor server and crawl health', 'Technical SEO', 'high', 'SEO-011', 1104),
('Inspect rendered templates', 'Technical SEO', 'high', 'SEO-012', 1105),
('Make navigation links crawlable', 'Technical SEO', 'high', 'SEO-013', 1106),
('Review canonical signals', 'Technical SEO', 'high', 'SEO-014', 1107),
('Validate head metadata', 'Technical SEO', 'high', 'SEO-015', 1108),
('Maintain XML sitemaps', 'Technical SEO', 'high', 'SEO-016', 1109),
('Review URL design', 'Technical SEO', 'medium', 'SEO-017', 1110),
('Control facets and crawl traps', 'Technical SEO', 'medium', 'SEO-018', 1111),
('Check mobile content parity', 'Technical SEO', 'high', 'SEO-019', 1112),
('Check HTTPS and mixed content', 'Technical SEO', 'high', 'SEO-020', 1113),
('Improve Core Web Vitals', 'Technical SEO', 'high', 'SEO-021', 1114),
('Reduce unnecessary page weight', 'Technical SEO', 'medium', 'SEO-022', 1115),
('Review security and manual actions', 'Technical SEO', 'high', 'SEO-023', 1116),
('Validate favicon delivery', 'Technical SEO', 'low', 'SEO-024', 1117),
('Audit existing AMP pages', 'Technical SEO', 'low', 'SEO-025', 1118),
('Check pagination and infinite scroll', 'Technical SEO', 'high', 'SEO-026', 1119),
('Review removals and private content', 'Technical SEO', 'high', 'SEO-027', 1120),
('Audit content and assign actions', 'Content', 'high', 'SEO-028', 1200),
('Check originality and usefulness', 'Content', 'high', 'SEO-029', 1201),
('Show authorship and expertise', 'Content', 'high', 'SEO-030', 1202),
('Review AI-assisted drafts', 'Content', 'high', 'SEO-031', 1203),
('Fact-check all page elements', 'Content', 'high', 'SEO-032', 1204),
('Maintain an intent-led content calendar', 'Content', 'high', 'SEO-033', 1205),
('Arrange expert review for sensitive topics', 'Content', 'high', 'SEO-034', 1206),
('Keep publication and update dates honest', 'Content', 'medium', 'SEO-035', 1207),
('Refresh high-value pages', 'Content', 'medium', 'SEO-036', 1208),
('Review writing and readability', 'Content', 'medium', 'SEO-037', 1209),
('Create evidence-based product reviews', 'Content', 'medium', 'SEO-038', 1210),
('Maintain a claim source log', 'Content', 'medium', 'SEO-039', 1211),
('Write useful unique titles', 'On-page SEO', 'high', 'SEO-040', 1300),
('Write accurate meta descriptions', 'On-page SEO', 'medium', 'SEO-041', 1301),
('Use clear heading structure', 'On-page SEO', 'high', 'SEO-042', 1302),
('Improve internal links and orphan pages', 'On-page SEO', 'high', 'SEO-043', 1303),
('Optimise images and alternative text', 'On-page SEO', 'medium', 'SEO-044', 1304),
('Check social and image previews', 'On-page SEO', 'low', 'SEO-045', 1305),
('Choose supported relevant markup', 'Structured data', 'medium', 'SEO-046', 1400),
('Validate markup on live pages', 'Structured data', 'high', 'SEO-047', 1401),
('Audit reviews and rating markup', 'Structured data', 'medium', 'SEO-048', 1402),
('Review organisation and site identity', 'Structured data', 'medium', 'SEO-049', 1403),
('Check publisher discovery readiness', 'Content', 'medium', 'SEO-050', 1212),
('Check video landing pages', 'Content', 'medium', 'SEO-051', 1213),
('Check eligibility for Google AI features', 'AEO and GEO', 'high', 'SEO-052', 1500),
('Answer user questions clearly', 'AEO and GEO', 'medium', 'SEO-053', 1501),
('Use helpful summaries and structured explanations', 'AEO and GEO', 'medium', 'SEO-054', 1502),
('Add useful FAQs', 'AEO and GEO', 'medium', 'SEO-055', 1503),
('Publish original research and proof', 'AEO and GEO', 'medium', 'SEO-056', 1504),
('Build useful comparison and cost content', 'AEO and GEO', 'medium', 'SEO-057', 1505),
('Keep brand identity consistent', 'AEO and GEO', 'medium', 'SEO-058', 1506),
('Maintain About and expert pages', 'AEO and GEO', 'medium', 'SEO-059', 1507),
('Define AI search reporting terms', 'AEO and GEO', 'low', 'SEO-060', 1508),
('Track identifiable AI referrals', 'AEO and GEO', 'medium', 'SEO-061', 1509),
('Review spam risks and inherited tactics', 'Off-page SEO', 'high', 'SEO-062', 1600),
('Audit backlinks and link vendors', 'Off-page SEO', 'medium', 'SEO-063', 1601),
('Qualify paid and user-generated links', 'Off-page SEO', 'high', 'SEO-064', 1602),
('Review third-party and sponsored content', 'Off-page SEO', 'high', 'SEO-065', 1603),
('Plan authentic digital PR', 'Off-page SEO', 'medium', 'SEO-066', 1604),
('Review review-acquisition practices', 'Off-page SEO', 'medium', 'SEO-067', 1605),
('Keep a change and approval log', 'Off-page SEO', 'medium', 'SEO-068', 1606),
('Maintain Google Business Profile', 'Local SEO', 'high', 'SEO-069', 1700),
('Reconcile business citations', 'Local SEO', 'high', 'SEO-070', 1701),
('Create useful location pages', 'Local SEO', 'medium', 'SEO-071', 1702),
('Check local search intent', 'Local SEO', 'medium', 'SEO-072', 1703),
('Review product and category architecture', 'Ecommerce', 'high', 'SEO-073', 1800),
('Improve product information', 'Ecommerce', 'high', 'SEO-074', 1801),
('Validate product and offer markup', 'Ecommerce', 'high', 'SEO-075', 1802),
('Maintain product feeds and identifiers', 'Ecommerce', 'high', 'SEO-076', 1803),
('Handle unavailable products consistently', 'Ecommerce', 'medium', 'SEO-077', 1804),
('Improve product discovery links', 'Ecommerce', 'medium', 'SEO-078', 1805),
('Validate language and region targeting', 'International SEO', 'high', 'SEO-079', 1900),
('Save backup and rollback plan', 'Migration and launch', 'high', 'SEO-080', 2000),
('Map old URLs to new destinations', 'Migration and launch', 'high', 'SEO-081', 2001),
('Run pre-launch SEO checks', 'Migration and launch', 'high', 'SEO-082', 2002),
('Verify production after launch', 'Migration and launch', 'high', 'SEO-083', 2003),
('Monitor the migration', 'Migration and launch', 'high', 'SEO-084', 2004),
('Test conversion forms and integrations', 'User experience', 'high', 'SEO-085', 2100),
('Test calls to action and user journeys', 'User experience', 'high', 'SEO-086', 2101),
('Test checkout and payment information', 'User experience', 'high', 'SEO-087', 2102),
('Review mobile and browser usability', 'User experience', 'high', 'SEO-088', 2103),
('Remove intrusive or deceptive UI', 'User experience', 'high', 'SEO-089', 2104),
('Improve form usability', 'User experience', 'medium', 'SEO-090', 2105),
('Review internal search', 'User experience', 'medium', 'SEO-091', 2106),
('Review contact and trust information', 'User experience', 'medium', 'SEO-092', 2107),
('Validate GA4 collection', 'Measurement', 'high', 'SEO-093', 2200),
('Define and validate key events', 'Measurement', 'high', 'SEO-094', 2201),
('Validate ecommerce events', 'Measurement', 'high', 'SEO-095', 2202),
('Review traffic quality and consent effects', 'Measurement', 'medium', 'SEO-096', 2203),
('Review search performance', 'Measurement', 'high', 'SEO-097', 2204),
('Review indexing and site health', 'Measurement', 'high', 'SEO-098', 2205),
('Identify query and snippet opportunities', 'Measurement', 'medium', 'SEO-099', 2206),
('Investigate sustained traffic changes', 'Measurement', 'high', 'SEO-100', 2207),
('Reconcile Search Console and GA4', 'Measurement', 'medium', 'SEO-101', 2208),
('Report outcomes and next actions', 'Measurement', 'high', 'SEO-102', 2209),
('Explain AI measurement limits', 'Measurement', 'medium', 'SEO-103', 2210),
('Build a target keyword and intent map', 'Keyword research', 'high', 'SEO-104', 2300),
('Review competitors and content gaps', 'Keyword research', 'medium', 'SEO-105', 2301),
('Prioritise keyword opportunities', 'Keyword research', 'high', 'SEO-106', 2302),
('Monitor target queries', 'Keyword research', 'medium', 'SEO-107', 2303),
('Consolidate overlapping intent', 'Keyword research', 'medium', 'SEO-108', 2304),
('Review user-generated spam controls', 'Technical SEO', 'high', 'SEO-109', 1121);

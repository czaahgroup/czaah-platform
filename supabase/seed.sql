-- ============================================
-- CZAAH Platform — Seed Data
-- Run AFTER 001_schema.sql in Supabase SQL Editor
-- ============================================

-- ============================================
-- SECTORS (13 — matching existing czaah.com)
-- ============================================

INSERT INTO sectors (name, slug, description, display_order) VALUES
('Minerals & Mining', 'minerals-mining', 'Pakistan holds an estimated $1 trillion in mineral reserves — copper, gold, rare earths, coal, and gemstones — largely unexplored. CZAAH provides the regulatory access and deal structuring to bring international capital to the sector.', 1),
('Real Estate', 'real-estate', 'Pakistan''s real estate market is valued at over $300 billion — and CPEC is creating entirely new growth corridors. Investment advisory, CPEC corridor properties, diaspora investment gateway, and due diligence.', 2),
('Construction & Development', 'construction-development', 'Infrastructure development, CPEC corridor construction, industrial estates, and commercial property development across Pakistan.', 3),
('Technology & IT', 'technology-it', 'Pakistan is one of the fastest-growing technology markets in the world with $3.2B+ in IT exports. Government digital programmes, elite engineering talent, and 60-70% cost advantage.', 4),
('Textiles & Trade', 'textiles-trade', 'Pakistan is the world''s 4th largest textile exporter and 4th largest cotton producer. CZAAH connects international buyers with Pakistan''s vast manufacturing base.', 5),
('Agriculture', 'agriculture', 'Agriculture contributes 23% of Pakistan''s GDP. Opportunities in crop production, agri-tech, food processing, cold chain logistics, and export of rice, mangoes, and citrus.', 6),
('Pharmaceuticals', 'pharmaceuticals', 'Pakistan''s pharmaceutical market exceeds $4 billion. DRAP-regulated manufacturing, API production, clinical research, and export to emerging markets.', 7),
('Engineering & Energy', 'engineering-energy', 'Eight engineering disciplines spanning power generation, renewable energy, transmission infrastructure, and industrial engineering across Pakistan.', 8),
('Aviation', 'aviation', 'Premium private charter, executive transport, and aviation logistics across Pakistan and the Gulf. Flexible scheduling, discreet service, and access to locations beyond commercial airline reach.', 9),
('Human Resources', 'human-resources', 'Access to Pakistan''s 70M+ workforce. Recruitment, staff augmentation, manpower export, and workforce solutions across all sectors.', 10),
('Tourism & Hospitality', 'tourism-hospitality', 'Destination management, hospitality investment, heritage tourism, and adventure tourism across Pakistan''s world-class landscapes.', 11),
('Luxury Car Rentals', 'luxury-car-rentals', 'Executive fleet services, VIP transport, corporate car programmes, and luxury vehicle leasing across major Pakistani cities and the Gulf.', 12),
('Education', 'education', 'Education sector opportunities serving Pakistan''s 230 million population. EdTech, vocational training, international school partnerships, and higher education.', 13);

-- ============================================
-- SERVICES (10 — matching existing czaah.com)
-- ============================================

INSERT INTO services (name, slug, description, display_order) VALUES
('Business Setup', 'business-setup', 'Entity formation, SECP registration, DMCC setup, and complete business infrastructure for entering the Pakistani market.', 1),
('Licensing & Compliance', 'licensing-compliance', 'Government licensing, FBR registration, BOI approvals, SECP filings, and regulatory compliance across all sectors.', 2),
('Import & Export', 'import-export', 'Trade facilitation — customs clearance, trade documentation, logistics coordination, supplier connections, and export management.', 3),
('Investor Protection', 'investor-protection', 'Risk mitigation, legal structuring, SPV architecture, contract governance, and dispute resolution for international investors.', 4),
('Investment Advisory', 'investment-advisory', 'Data-driven investment advisory — feasibility studies, market analysis, financial modelling, opportunity identification, and strategic guidance.', 5),
('Partnership Development', 'partnership-development', 'Local partner identification, JV structuring, stakeholder mapping, and relationship facilitation across government, industry, and capital.', 6),
('Government Contracts', 'government-contracts', 'Tender intelligence, bid preparation, PPRA compliance, government relations, and contract management for Pakistan''s PKR 2T+ annual procurement.', 7),
('Security Services', 'security-services', 'Corporate security, executive protection, risk assessment, and security logistics for international operations in Pakistan.', 8),
('Payment Solutions', 'payment-solutions', 'Cross-border payment facilitation, multi-currency banking, trade finance, and financial infrastructure for international transactions.', 9),
('Investment Migration', 'investment-migration', 'Residency and citizenship by investment programmes, visa facilitation, and immigration advisory for investors and executives.', 10);

-- ============================================
-- PROMOTE SUPER ADMIN
-- After info@czaah.com registers through the app, run:
-- ============================================
-- UPDATE profiles
-- SET role = 'super_admin', status = 'approved'
-- WHERE email = 'info@czaah.com';

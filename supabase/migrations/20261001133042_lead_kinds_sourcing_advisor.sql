-- Two more lead types for CZAAH Properties (additive only):
--   property_sourcing_request — the guided "Find a property for me" request
--   advisor_request           — "Speak to an advisor" from the contact page
-- Existing rows are untouched; the check only widens.

alter table public.property_leads drop constraint if exists property_leads_kind_check;
alter table public.property_leads add constraint property_leads_kind_check
  check (kind in ('property_enquiry', 'viewing_request', 'investment_enquiry', 'property_sourcing_request', 'advisor_request'));

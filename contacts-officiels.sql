-- ============================================================
--  Hola Vecino — contacts officiels pour « Contacts utiles »
--  Sources : sites officiels des ambassades et de l'office espagnol du tourisme (septembre 2026)
--  Supabase > SQL Editor > page vide > coller > Run (une seule fois)
--  Pensez à revérifier ces coordonnées une fois par an.
-- ============================================================

insert into public.contacts (name, category, city, languages, phone, email, website, address, description, approved) values
('Ambassade et consulat général de Belgique', 'embassy', 'Madrid', '{fr,nl,es}',
 '+34 915 776 300', 'madrid@diplobel.fed.be', 'https://spain.diplomatie.belgium.be',
 'Paseo de la Castellana 18, 6º, 28046 Madrid',
 'Passeports, cartes d''identité et état civil pour les Belges. Guichets sur rendez-vous. / Belgian embassy and consulate general.', true),

('Consulat général de France à Madrid', 'embassy', 'Madrid', '{fr,es}',
 '+34 912 159 100', null, 'https://es.ambafrance.org',
 'Calle Marqués de la Ensenada 10, 28004 Madrid',
 'Compétent notamment pour Madrid, la Communauté valencienne, Murcie, l''Andalousie et les Canaries. Démarches sur rendez-vous.', true),

('Ambassade des Pays-Bas', 'embassy', 'Madrid', '{nl,es,en}',
 '+34 913 537 500', null, 'https://www.nederlandwereldwijd.nl',
 'Paseo de la Castellana 259-D, Torre Emperador, planta 36, 28046 Madrid',
 'Paspoorten en ID-kaarten alleen op afspraak. / Embassy of the Netherlands, passports by appointment.', true),

('Ambassade d''Allemagne', 'embassy', 'Madrid', '{de,es}',
 '+34 915 579 000', 'info@madrid.diplo.de', 'https://spanien.diplo.de',
 'Calle de Fortuny 8, 28010 Madrid',
 'Konsularische Dienste nur mit Online-Termin. / German embassy, consular services by online appointment.', true),

('Consulat honoraire d''Allemagne à Alicante', 'embassy', 'Alicante', '{de,es}',
 '+34 965 118 070', 'alicante@hk-diplo.de', 'https://spanien.diplo.de',
 'Avenida de Maisonnave 7, 2º, 03003 Alicante',
 'Honorarkonsulat für die Region Alicante. / German honorary consulate.', true),

('Ambassade britannique', 'embassy', 'Madrid', '{en,es}',
 '+34 917 146 300', null, 'https://www.gov.uk/world/organisations/british-embassy-madrid',
 'Torre Emperador, Paseo de la Castellana 259D, 28046 Madrid',
 'British Embassy. Consular help for British nationals in Spain.', true),

('Consulat britannique à Alicante', 'embassy', 'Alicante', '{en,es}',
 '+34 965 216 022', null, 'https://www.gov.uk/world/organisations/british-consulate-alicante',
 'Rambla Méndez Núñez 28-32, 6º, 03002 Alicante',
 'British Consulate for the Alicante area.', true),

('Numéro d''urgence européen 112', 'emergency', 'Toute l''Espagne', '{es,en,fr,de}',
 '112', null, null, null,
 'Gratuit, 24 h/24 : police, pompiers, ambulance. / Free European emergency number, 24/7.', true);

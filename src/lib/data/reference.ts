/**
 * Reference data for the synthetic dataset.
 *
 * Geography (Moroccan regions and cities) is real public geography.
 * Every organisation, company, person and procurement record built from
 * these lists is FICTIONAL. Names were composed for this prototype and are
 * not intended to resemble any real entity.
 */
import type { BuyerType, Region, Sector } from "../types";

export interface SectorProfile extends Sector {
  /** median estimated value in MAD */
  medianValue: number;
  /** log-normal dispersion */
  sigma: number;
  /** relative annual activity multiplier (growth >1, decline <1) */
  growth: number;
  /** typical re-procurement cycle in months when the need recurs */
  cycleMonths: number;
  /** typical contract duration in months [min,max] */
  duration: [number, number];
  /** French title stems used in tender objects */
  titles: string[];
  /** keywords used for classification consistency checks */
  keywords: string[];
  requirements: string[];
}

export const SECTORS: SectorProfile[] = [
  {
    id: "construction", code: "S01", name: "Construction & public works", domain: "Built environment",
    activities: ["Building construction", "Rehabilitation works", "Civil works"],
    medianValue: 9_000_000, sigma: 0.85, growth: 1.0, cycleMonths: 24, duration: [10, 24],
    titles: ["Travaux de construction d'un bâtiment administratif", "Travaux de réhabilitation des locaux", "Travaux d'extension et d'aménagement", "Travaux de gros œuvre et corps d'état secondaires"],
    keywords: ["construction", "réhabilitation", "gros œuvre", "extension", "aménagement"],
    requirements: ["Certificat de qualification et classification (secteur A, classe 2 minimum)", "Références de travaux similaires (3 dernières années)", "Moyens matériels et humains détaillés", "Planning d'exécution"],
  },
  {
    id: "it", code: "S02", name: "IT & software", domain: "Digital",
    activities: ["Software development", "Information systems", "IT equipment"],
    medianValue: 2_200_000, sigma: 0.8, growth: 1.18, cycleMonths: 24, duration: [12, 36],
    titles: ["Développement et maintenance du système d'information", "Acquisition de matériel informatique", "Maintenance applicative et support utilisateurs", "Mise en place d'une plateforme de gestion électronique des documents"],
    keywords: ["informatique", "système d'information", "logiciel", "plateforme", "applicative"],
    requirements: ["Certification ISO 27001 ou équivalent", "Équipe projet (chef de projet, architecte, développeurs)", "Références de projets SI publics", "Plan d'assurance qualité"],
  },
  {
    id: "telecom", code: "S03", name: "Telecommunications", domain: "Digital",
    activities: ["Network infrastructure", "Connectivity services", "Unified communications"],
    medianValue: 3_000_000, sigma: 0.8, growth: 1.15, cycleMonths: 24, duration: [12, 36],
    titles: ["Fourniture de services de connectivité et liaisons spécialisées", "Mise à niveau de l'infrastructure réseau et télécom", "Déploiement d'une solution de communications unifiées", "Maintenance du réseau de télécommunications"],
    keywords: ["connectivité", "réseau", "télécom", "communications", "liaisons"],
    requirements: ["Licence d'exploitation réseau (le cas échéant)", "Engagement de niveau de service (SLA)", "Centre de support 24/7", "Références d'opérateurs ou intégrateurs"],
  },
  {
    id: "transport", code: "S04", name: "Transport & logistics", domain: "Operations",
    activities: ["Personnel transport", "Freight and logistics", "Fleet services"],
    medianValue: 1_800_000, sigma: 0.7, growth: 1.0, cycleMonths: 12, duration: [12, 12],
    titles: ["Transport du personnel", "Prestations de transport et de logistique", "Location de véhicules de service avec chauffeur", "Gestion et entretien du parc automobile"],
    keywords: ["transport", "logistique", "véhicules", "parc automobile"],
    requirements: ["Agrément de transport", "Flotte minimale et assurance", "Plan de continuité de service"],
  },
  {
    id: "catering", code: "S05", name: "Catering", domain: "Facility services",
    activities: ["Collective catering", "Event catering"],
    medianValue: 900_000, sigma: 0.6, growth: 1.0, cycleMonths: 12, duration: [12, 12],
    titles: ["Prestations de restauration collective", "Fourniture de repas pour les internats", "Restauration et pause-café pour événements"],
    keywords: ["restauration", "repas", "pause-café"],
    requirements: ["Autorisation sanitaire ONSSA (fictive en démo)", "Plan HACCP", "Menus et grammages"],
  },
  {
    id: "cleaning", code: "S06", name: "Cleaning & maintenance", domain: "Facility services",
    activities: ["Cleaning", "Building maintenance", "Green spaces"],
    medianValue: 1_100_000, sigma: 0.6, growth: 1.02, cycleMonths: 12, duration: [12, 12],
    titles: ["Nettoyage des locaux administratifs", "Entretien et maintenance des bâtiments", "Entretien des espaces verts", "Nettoyage et hygiène des sites"],
    keywords: ["nettoyage", "entretien", "espaces verts", "hygiène"],
    requirements: ["Attestation CNSS (fictive en démo)", "Effectif et encadrement proposés", "Liste du matériel et produits"],
  },
  {
    id: "security", code: "S07", name: "Security services", domain: "Facility services",
    activities: ["Guarding", "Electronic security"],
    medianValue: 1_300_000, sigma: 0.6, growth: 1.03, cycleMonths: 12, duration: [12, 12],
    titles: ["Gardiennage et surveillance des sites", "Prestations de sécurité et de contrôle d'accès", "Installation de vidéosurveillance"],
    keywords: ["gardiennage", "surveillance", "sécurité", "vidéosurveillance"],
    requirements: ["Autorisation d'exercice de gardiennage", "Effectif d'agents formés", "Plan de sécurité"],
  },
  {
    id: "medical", code: "S08", name: "Medical equipment", domain: "Health",
    activities: ["Medical devices", "Hospital equipment", "Laboratory supplies"],
    medianValue: 3_500_000, sigma: 0.9, growth: 1.05, cycleMonths: 18, duration: [6, 24],
    titles: ["Acquisition d'équipements médicaux", "Fourniture de dispositifs médicaux et consommables", "Maintenance des équipements biomédicaux", "Équipement du laboratoire d'analyses"],
    keywords: ["médicaux", "biomédicaux", "laboratoire", "dispositifs"],
    requirements: ["Enregistrement des dispositifs médicaux", "Service après-vente local", "Formation des utilisateurs"],
  },
  {
    id: "office", code: "S09", name: "Office supplies", domain: "Supplies",
    activities: ["Stationery", "Office furniture", "Printing"],
    medianValue: 350_000, sigma: 0.6, growth: 0.86, cycleMonths: 12, duration: [3, 12],
    titles: ["Fourniture de bureau et consommables", "Acquisition de mobilier de bureau", "Travaux d'impression et de reprographie"],
    keywords: ["fourniture de bureau", "mobilier", "impression", "consommables"],
    requirements: ["Échantillons", "Délais de livraison", "Catalogue des prix"],
  },
  {
    id: "energy", code: "S10", name: "Renewable energy", domain: "Energy",
    activities: ["Solar PV", "Energy efficiency", "Solar water heating"],
    medianValue: 6_000_000, sigma: 1.0, growth: 1.35, cycleMonths: 24, duration: [6, 18],
    titles: ["Installation de centrales solaires photovoltaïques", "Travaux d'efficacité énergétique des bâtiments", "Fourniture et installation de chauffe-eau solaires", "Éclairage public LED et solaire"],
    keywords: ["solaire", "photovoltaïque", "énergétique", "LED"],
    requirements: ["Références d'installations PV", "Qualification des installateurs", "Garantie de performance"],
  },
  {
    id: "engineering", code: "S11", name: "Engineering studies", domain: "Advisory",
    activities: ["Technical studies", "Project supervision", "Surveying"],
    medianValue: 1_600_000, sigma: 0.7, growth: 1.05, cycleMonths: 24, duration: [6, 18],
    titles: ["Études techniques et suivi des travaux", "Assistance à maîtrise d'ouvrage", "Études topographiques et géotechniques"],
    keywords: ["études", "maîtrise d'ouvrage", "topographiques", "géotechniques"],
    requirements: ["Agrément de bureau d'études", "CV des ingénieurs proposés", "Méthodologie"],
  },
  {
    id: "consulting", code: "S12", name: "Consulting", domain: "Advisory",
    activities: ["Strategy consulting", "Organisational audit", "Communication"],
    medianValue: 1_200_000, sigma: 0.7, growth: 1.0, cycleMonths: 24, duration: [4, 12],
    titles: ["Étude stratégique et accompagnement", "Audit organisationnel et financier", "Élaboration du schéma directeur", "Accompagnement à la conduite du changement"],
    keywords: ["stratégique", "audit", "schéma directeur", "accompagnement"],
    requirements: ["Méthodologie et planning", "Équipe d'experts", "Références similaires"],
  },
  {
    id: "industrial", code: "S13", name: "Industrial equipment", domain: "Supplies",
    activities: ["Machinery", "Pumping equipment", "Workshop equipment"],
    medianValue: 2_800_000, sigma: 0.8, growth: 0.95, cycleMonths: 24, duration: [4, 12],
    titles: ["Fourniture d'équipements industriels", "Acquisition de groupes électrogènes", "Fourniture et installation de stations de pompage"],
    keywords: ["industriels", "groupes électrogènes", "pompage"],
    requirements: ["Fiches techniques", "Garantie constructeur", "Pièces de rechange"],
  },
  {
    id: "training", code: "S14", name: "Training", domain: "Advisory",
    activities: ["Professional training", "Language training", "Digital skills"],
    medianValue: 600_000, sigma: 0.6, growth: 1.08, cycleMonths: 12, duration: [3, 12],
    titles: ["Formation continue du personnel", "Formation aux compétences numériques", "Programme de formation linguistique"],
    keywords: ["formation", "compétences"],
    requirements: ["Programme pédagogique", "CV des formateurs", "Attestation de formation"],
  },
  {
    id: "infrastructure", code: "S15", name: "Infrastructure", domain: "Built environment",
    activities: ["Roads", "Water networks", "Sanitation"],
    medianValue: 18_000_000, sigma: 0.9, growth: 1.1, cycleMonths: 36, duration: [12, 30],
    titles: ["Travaux de voirie et d'aménagement routier", "Renforcement du réseau d'eau potable", "Travaux d'assainissement liquide", "Construction d'ouvrages d'art"],
    keywords: ["voirie", "routier", "eau potable", "assainissement", "ouvrages d'art"],
    requirements: ["Qualification secteur routier / hydraulique", "Matériel lourd", "Références de chantiers comparables"],
  },
];

export const REGIONS: Region[] = [
  { id: "cs", name: "Casablanca-Settat", cities: ["Casablanca", "Mohammedia", "El Jadida", "Settat", "Berrechid"] },
  { id: "rsk", name: "Rabat-Salé-Kénitra", cities: ["Rabat", "Salé", "Kénitra", "Témara", "Khémisset"] },
  { id: "ms", name: "Marrakech-Safi", cities: ["Marrakech", "Safi", "Essaouira", "El Kelaâ des Sraghna"] },
  { id: "fm", name: "Fès-Meknès", cities: ["Fès", "Meknès", "Ifrane", "Taza"] },
  { id: "tta", name: "Tanger-Tétouan-Al Hoceïma", cities: ["Tanger", "Tétouan", "Al Hoceïma", "Larache"] },
  { id: "sm", name: "Souss-Massa", cities: ["Agadir", "Inezgane", "Taroudant", "Tiznit"] },
  { id: "or", name: "Oriental", cities: ["Oujda", "Nador", "Berkane"] },
  { id: "bmk", name: "Béni Mellal-Khénifra", cities: ["Béni Mellal", "Khouribga", "Khénifra"] },
  { id: "dt", name: "Drâa-Tafilalet", cities: ["Errachidia", "Ouarzazate", "Midelt"] },
  { id: "gon", name: "Guelmim-Oued Noun", cities: ["Guelmim", "Tan-Tan"] },
  { id: "lsh", name: "Laâyoune-Sakia El Hamra", cities: ["Laâyoune", "Boujdour"] },
  { id: "dod", name: "Dakhla-Oued Ed-Dahab", cities: ["Dakhla"] },
];

export interface BuyerSeed {
  name: string;
  acronym: string;
  type: BuyerType;
  regionId: string;
  city: string;
  sectors: string[]; // preferred sectors, strongest first
  activity: number; // relative publication intensity
}

/** 40 fictional contracting authorities. */
export const BUYER_SEEDS: BuyerSeed[] = [
  { name: "Agence Atlas des Équipements Publics", acronym: "AAEP", type: "Public agency", regionId: "rsk", city: "Rabat", sectors: ["construction", "engineering", "infrastructure"], activity: 1.6 },
  { name: "Office Chergui de l'Eau et de l'Assainissement", acronym: "OCEA", type: "Public office", regionId: "or", city: "Oujda", sectors: ["infrastructure", "industrial", "engineering"], activity: 1.3 },
  { name: "Centre Hospitalier Al Manar", acronym: "CHAM", type: "Public hospital", regionId: "cs", city: "Casablanca", sectors: ["medical", "cleaning", "catering", "security"], activity: 1.5 },
  { name: "Université Al Bayane des Sciences Appliquées", acronym: "UBSA", type: "University", regionId: "fm", city: "Fès", sectors: ["it", "catering", "training", "cleaning"], activity: 1.2 },
  { name: "Agence Numérique Tafilalt", acronym: "ANT", type: "Public agency", regionId: "dt", city: "Errachidia", sectors: ["it", "telecom", "training"], activity: 0.8 },
  { name: "Direction des Systèmes d'Information — Département Fictif des Finances", acronym: "DSI-DFF", type: "Ministry department", regionId: "rsk", city: "Rabat", sectors: ["it", "telecom", "consulting"], activity: 1.7 },
  { name: "Conseil Régional Fictif du Souss", acronym: "CRFS", type: "Regional council", regionId: "sm", city: "Agadir", sectors: ["infrastructure", "energy", "construction"], activity: 1.2 },
  { name: "Commune Fictive de Nakhla", acronym: "CFN", type: "Municipality", regionId: "ms", city: "Marrakech", sectors: ["cleaning", "infrastructure", "energy"], activity: 1.0 },
  { name: "Société Publique Azur Transport", acronym: "SPAT", type: "State-owned enterprise", regionId: "cs", city: "Casablanca", sectors: ["transport", "industrial", "security"], activity: 1.1 },
  { name: "Office Portuaire Nour du Nord", acronym: "OPNN", type: "Public office", regionId: "tta", city: "Tanger", sectors: ["security", "industrial", "telecom"], activity: 1.2 },
  { name: "Centre Hospitalier Régional Ibn Qamar", acronym: "CHRIQ", type: "Public hospital", regionId: "fm", city: "Meknès", sectors: ["medical", "catering", "cleaning"], activity: 1.1 },
  { name: "Agence de Développement Oasis Sud", acronym: "ADOS", type: "Public agency", regionId: "dt", city: "Ouarzazate", sectors: ["energy", "infrastructure", "consulting"], activity: 0.9 },
  { name: "Institut Supérieur Tifawt de Formation", acronym: "ISTF", type: "University", regionId: "ms", city: "Marrakech", sectors: ["training", "it", "catering"], activity: 0.8 },
  { name: "Commune Fictive d'Amlal", acronym: "CFA", type: "Municipality", regionId: "tta", city: "Tétouan", sectors: ["cleaning", "construction", "security"], activity: 0.9 },
  { name: "Département Fictif de l'Équipement — Direction Provinciale", acronym: "DFE-DP", type: "Ministry department", regionId: "bmk", city: "Béni Mellal", sectors: ["infrastructure", "engineering", "construction"], activity: 1.2 },
  { name: "Agence Marine Dakhla Horizon", acronym: "AMDH", type: "Public agency", regionId: "dod", city: "Dakhla", sectors: ["energy", "transport", "construction"], activity: 0.6 },
  { name: "Office Régional Agricole Fictif du Gharb", acronym: "ORAFG", type: "Public office", regionId: "rsk", city: "Kénitra", sectors: ["industrial", "engineering", "transport"], activity: 0.9 },
  { name: "Université Ibn Noujoum", acronym: "UIN", type: "University", regionId: "or", city: "Oujda", sectors: ["it", "cleaning", "security", "office"], activity: 0.9 },
  { name: "Société Fictive de Distribution Énergétique Atlas", acronym: "SFDEA", type: "State-owned enterprise", regionId: "cs", city: "Mohammedia", sectors: ["energy", "industrial", "telecom"], activity: 1.3 },
  { name: "Conseil Préfectoral Fictif de Salé-Médina", acronym: "CPFSM", type: "Regional council", regionId: "rsk", city: "Salé", sectors: ["construction", "cleaning", "transport"], activity: 0.8 },
  { name: "Centre Hospitalier Universitaire Fictif Warda", acronym: "CHUW", type: "Public hospital", regionId: "ms", city: "Marrakech", sectors: ["medical", "security", "catering", "cleaning"], activity: 1.4 },
  { name: "Agence Tazga de Promotion Économique", acronym: "ATPE", type: "Public agency", regionId: "or", city: "Nador", sectors: ["consulting", "training", "it"], activity: 0.7 },
  { name: "Département Fictif de l'Éducation — Académie Régionale", acronym: "DFE-AR", type: "Ministry department", regionId: "cs", city: "Casablanca", sectors: ["office", "catering", "construction", "training"], activity: 1.5 },
  { name: "Office Fictif des Aéroports du Sud", acronym: "OFAS", type: "Public office", regionId: "sm", city: "Agadir", sectors: ["security", "cleaning", "telecom"], activity: 1.0 },
  { name: "Commune Fictive d'Imzi", acronym: "CFI", type: "Municipality", regionId: "sm", city: "Tiznit", sectors: ["infrastructure", "cleaning", "energy"], activity: 0.7 },
  { name: "Agence Fictive de Régulation Numérique", acronym: "AFRN", type: "Public agency", regionId: "rsk", city: "Rabat", sectors: ["telecom", "consulting", "it"], activity: 1.0 },
  { name: "Société Publique Fictive des Autoroutes du Centre", acronym: "SPFAC", type: "State-owned enterprise", regionId: "bmk", city: "Khouribga", sectors: ["infrastructure", "engineering", "security"], activity: 1.0 },
  { name: "Centre Hospitalier Provincial Fictif de Taza", acronym: "CHPT", type: "Public hospital", regionId: "fm", city: "Taza", sectors: ["medical", "cleaning"], activity: 0.7 },
  { name: "Conseil Régional Fictif de l'Oriental", acronym: "CRFO", type: "Regional council", regionId: "or", city: "Oujda", sectors: ["infrastructure", "construction", "energy"], activity: 1.0 },
  { name: "Département Fictif de la Santé — Direction Régionale Nord", acronym: "DFS-DRN", type: "Ministry department", regionId: "tta", city: "Tanger", sectors: ["medical", "transport", "office"], activity: 1.1 },
  { name: "Agence Fictive de l'Habitat Saharien", acronym: "AFHS", type: "Public agency", regionId: "lsh", city: "Laâyoune", sectors: ["construction", "infrastructure", "energy"], activity: 0.8 },
  { name: "Office Fictif de la Formation Technique", acronym: "OFFT", type: "Public office", regionId: "cs", city: "Settat", sectors: ["training", "industrial", "office"], activity: 1.1 },
  { name: "Commune Fictive de Warzazat-Est", acronym: "CFWE", type: "Municipality", regionId: "dt", city: "Ouarzazate", sectors: ["cleaning", "energy"], activity: 0.5 },
  { name: "Université Fictive Atlantique", acronym: "UFA", type: "University", regionId: "cs", city: "El Jadida", sectors: ["it", "construction", "catering", "security"], activity: 0.9 },
  { name: "Agence Fictive des Bassins Hydrauliques Ouest", acronym: "AFBHO", type: "Public agency", regionId: "ms", city: "Safi", sectors: ["infrastructure", "engineering", "industrial"], activity: 0.9 },
  { name: "Société Fictive de Logistique Portuaire Atlas", acronym: "SFLPA", type: "State-owned enterprise", regionId: "tta", city: "Tanger", sectors: ["transport", "it", "security"], activity: 0.9 },
  { name: "Département Fictif de l'Intérieur — Préfecture de Démo", acronym: "DFI-PD", type: "Ministry department", regionId: "fm", city: "Fès", sectors: ["office", "transport", "it", "security"], activity: 1.0 },
  { name: "Conseil Provincial Fictif de Guelmim", acronym: "CPFG", type: "Regional council", regionId: "gon", city: "Guelmim", sectors: ["infrastructure", "construction"], activity: 0.5 },
  { name: "Office Fictif National de Statistique Appliquée", acronym: "OFNSA", type: "Public office", regionId: "rsk", city: "Rabat", sectors: ["it", "consulting", "training", "office"], activity: 0.8 },
  { name: "Centre Fictif de Recherche Énergétique Sahel", acronym: "CFRES", type: "Public agency", regionId: "sm", city: "Agadir", sectors: ["energy", "engineering", "industrial"], activity: 0.7 },
];

/** Name pools for fictional companies, keyed by primary sector. */
export const COMPANY_NAMES: Record<string, string[]> = {
  construction: ["Bâtisseurs Nakhla", "Tazga Construction", "Imzi Génie Civil", "Ouaha Bâtiment", "Kasbah Travaux Généraux", "Amlal Construction Moderne", "Sahara BTP Moderne"],
  it: ["Tifawt Digital Systems", "Noujoum Informatique", "Argania Software Labs", "Sahel Data Services", "Zellij Tech Solutions", "Medina Cloud Engineering", "Qantara Systems"],
  telecom: ["Atlas Netlink", "Chergui Telecom Services", "Horizon Fibre Maghreb", "Azur Communications Intégrées", "Mawja Télécom"],
  transport: ["Trans-Oasis Mobilité", "Nakhla Logistique", "Rif Transport Services", "Atlas Flotte Services"],
  catering: ["Mounassaba Restauration", "Ftour Collectif Services", "Table d'Amlal Traiteur"],
  cleaning: ["Nadafa Pro Services", "Imzi Propreté", "Clairo Maintenance Maroc", "Riyad Facility Services", "Lamaan Services Généraux"],
  security: ["Hiraasa Sécurité", "Sentinelle Atlas", "Tafraout Gardiennage", "Bab Securité Systèmes"],
  medical: ["Shifa Medical Equipment", "Biomed Atlantique", "Labo-Sahel Fournitures", "Nour Santé Technologies", "Dawaa Équipements Médicaux"],
  office: ["Qalam Fournitures", "Bureau Plus Maghreb", "Warak Impression"],
  energy: ["Shams Énergie Solaire", "Tafilalt Solar Works", "Rih Renewables", "Lumina Atlas Énergie", "Oasis PV Engineering", "Nour Watt Solutions"],
  engineering: ["Bureau d'Études Handassa", "Topo-Sud Ingénierie", "Mizan Engineering Consultants", "Geo-Atlas Études"],
  consulting: ["Rouaya Conseil", "Massar Advisory", "Bousla Stratégie & Organisation"],
  industrial: ["Atlas Équipements Industriels", "Hydro-Pompes du Maghreb", "Mécanique Sud Industrie"],
  training: ["Ta3lim Formation Professionnelle", "Kafaat Academy", "Lissan Centre de Langues"],
  infrastructure: ["Routes & Réseaux Atlas", "Hydro-Réseaux du Sud", "Grand Chantiers Oued Noun", "Voirie Moderne du Nord", "Ouvrages Atlas Génie", "Hydra-Sud Travaux"],
};

export const PROCEDURES = [
  "Appel d'offres ouvert",
  "Appel d'offres restreint",
  "Appel d'offres avec présélection",
  "Concours",
  "Procédure négociée",
  "Bon de commande",
] as const;
export const PROCEDURE_WEIGHTS = [62, 9, 6, 3, 7, 13];

export const SUPPLIER_COUNTRIES: { country: string; count: number; cities: string[]; region: string }[] = [
  { country: "Morocco", count: 24, cities: ["Casablanca", "Rabat", "Tanger", "Marrakech", "Agadir", "Fès", "Oujda", "Laâyoune"], region: "North Africa" },
  { country: "France", count: 6, cities: ["Lyon", "Marseille", "Toulouse"], region: "Europe" },
  { country: "Spain", count: 5, cities: ["Madrid", "Sevilla", "Valencia"], region: "Europe" },
  { country: "Senegal", count: 5, cities: ["Dakar", "Thiès"], region: "West Africa" },
  { country: "Côte d'Ivoire", count: 4, cities: ["Abidjan", "Yamoussoukro"], region: "West Africa" },
  { country: "Tunisia", count: 3, cities: ["Tunis", "Sfax"], region: "North Africa" },
  { country: "Portugal", count: 3, cities: ["Lisbon", "Porto"], region: "Europe" },
  { country: "United Arab Emirates", count: 3, cities: ["Dubai", "Abu Dhabi"], region: "Middle East" },
  { country: "Mauritania", count: 2, cities: ["Nouakchott"], region: "West Africa" },
  { country: "Egypt", count: 2, cities: ["Cairo"], region: "North Africa" },
  { country: "Germany", count: 2, cities: ["Hamburg", "Stuttgart"], region: "Europe" },
  { country: "Nigeria", count: 1, cities: ["Lagos"], region: "West Africa" },
];

export const SUPPLIER_STEMS = [
  "Alto", "Borealis", "Cedra", "Delta Nord", "Eskal", "Fenix", "Garnet", "Halcyon", "Iris", "Jasmin", "Kora", "Lumen",
  "Meridian", "Nova Sahel", "Orion", "Palmera", "Quartz", "Rivage", "Sable", "Teranga", "Umbra", "Vela", "Wadi", "Xenon",
  "Yasmina", "Zenith", "Acacia", "Baobab", "Cobalt", "Dune", "Etoile", "Flux", "Granit", "Harmattan", "Indigo", "Jade",
  "Karité", "Lagune", "Mistral", "Nacre", "Olivia", "Prisme", "Quiétude", "Rocher", "Sirocco", "Tamaris", "Ulysse", "Vertex",
  "Wave", "Xylo", "Yucca", "Zéphyr", "Amarante", "Brisa", "Corail", "Doré", "Écume", "Figuier", "Grenade", "Hélios",
];

export const SUPPLIER_SUFFIX: Record<string, string[]> = {
  construction: ["Construction", "Building Systems"], it: ["Digital", "Software"], telecom: ["Networks", "Telecom"],
  transport: ["Logistics", "Freight"], catering: ["Catering"], cleaning: ["Facility Services"], security: ["Security"],
  medical: ["Medical", "MedTech"], office: ["Supplies"], energy: ["Solar", "Energy"], engineering: ["Engineering"],
  consulting: ["Advisory"], industrial: ["Industrial", "Machinery"], training: ["Learning"], infrastructure: ["Infra", "Civil Works"],
};

/** Fictional internal relationship owners (Telecontact demo team — not real staff). */
export const TEAM = ["Demo Analyst A. Idrissi", "Demo BD Lead S. Kettani", "Demo Partner Mgr. Y. Alaoui", "Demo Bid Mgr. O. Tazi"];

export const FIRST_NAMES = ["Salma", "Youssef", "Nadia", "Karim", "Imane", "Omar", "Leïla", "Hamza", "Sofia", "Mehdi", "Aïcha", "Rachid", "Inès", "Tarik", "Meryem", "Adil", "Camille", "Diego", "Awa", "Moussa", "Clara", "Mariam", "Jonas", "Fatou"];
export const LAST_NAMES = ["Benamar", "El Ouardi", "Lahlou", "Bennis", "Chraïbi", "Tahiri", "Ouazzani", "Berrada", "Sefrioui", "Amrani", "Dupré", "Martín", "Diallo", "Ndiaye", "Kouassi", "Haddad", "Ferreira", "Schmidt", "Bensaïd", "Mansouri"];

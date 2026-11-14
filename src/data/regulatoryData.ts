import { AllowedBody, FlaggedAdditive, GlossaryTerm, OfficialRegistry } from '../types/product';

export const ALLOWED_BODIES: AllowedBody[] = [
  {
    id: 'WHO/IARC',
    name: 'WHO / IARC',
    fullName: 'World Health Organization & International Agency for Research on Cancer',
    jurisdiction: 'International / UN',
    conflictRank: 1,
    scope: 'Carcinogenicity monographs (Groups 1, 2A, 2B), global public health toxicology, and micronutrient guidelines.',
    url: 'https://monographs.iarc.who.int/'
  },
  {
    id: 'EFSA',
    name: 'EFSA',
    fullName: 'European Food Safety Authority',
    jurisdiction: 'European Union',
    conflictRank: 2,
    scope: 'Precautionary scientific opinions on food additives (E-numbers), food contact plastics (BPA, phthalates), and cosmetic/novel ingredients.',
    url: 'https://www.efsa.europa.eu/'
  },
  {
    id: 'FDA',
    name: 'FDA',
    fullName: 'U.S. Food and Drug Administration',
    jurisdiction: 'United States',
    conflictRank: 3,
    scope: 'Food Additive Status List, GRAS Notices, Import Alerts, Recalls, Cosmetics (MoCRA), and OTC drug monographs.',
    url: 'https://www.fda.gov/food/food-ingredients-packaging'
  },
  {
    id: 'USDA',
    name: 'USDA (NOP)',
    fullName: 'U.S. Department of Agriculture — National Organic Program',
    jurisdiction: 'United States',
    conflictRank: 4,
    scope: 'National Organic Program (7 CFR Part 205), USDA Organic Integrity Database, and bioengineered food disclosure standards.',
    url: 'https://www.ams.usda.gov/about-ams/programs-offices/national-organic-program'
  },
  {
    id: 'EPA',
    name: 'EPA',
    fullName: 'U.S. Environmental Protection Agency',
    jurisdiction: 'United States',
    conflictRank: 5,
    scope: ' Safer Choice chemical Ingredient List, pesticide residue tolerances, PFAS/drinking water thresholds, and environmental toxicity.',
    url: 'https://www.epa.gov/saferchoice/safer-ingredients'
  },
  {
    id: 'NIH',
    name: 'NIH',
    fullName: 'National Institutes of Health (ODS & NIEHS)',
    jurisdiction: 'United States',
    conflictRank: 6,
    scope: 'Office of Dietary Supplements fact sheets, National Toxicology Program (NTP) endocrine disruptor reports, and PubChem toxicology.',
    url: 'https://ods.od.nih.gov/'
  },
  {
    id: 'CDC',
    name: 'CDC',
    fullName: 'Centers for Disease Control and Prevention (ATSDR)',
    jurisdiction: 'United States',
    conflictRank: 7,
    scope: 'Biomonitoring data on phthalates, bisphenols, parabens, heavy metals, and vulnerable population exposure guidance.',
    url: 'https://www.cdc.gov/biomonitoring/'
  },
  {
    id: 'Codex Alimentarius',
    name: 'Codex Alimentarius',
    fullName: 'FAO/WHO Codex Alimentarius Commission',
    jurisdiction: 'International',
    conflictRank: 8,
    scope: 'General Standard for Food Additives (GSFA), international nutrition labeling, and commodity purity standards.',
    url: 'https://www.fao.org/fao-who-codexalimentarius/'
  },
  {
    id: 'FSSAI',
    name: 'FSSAI',
    fullName: 'Food Safety and Standards Authority of India',
    jurisdiction: 'India',
    conflictRank: 9,
    scope: 'Food Safety and Standards Regulations, Ayurvedic/Nutraceutical product standards (relevant to Sri Sri Tattva and Indian imports).',
    url: 'https://www.fssai.gov.in/'
  }
];

export const SOURCE_CONFLICT_RULES = [
  {
    title: '1. Precautionary Threshold Precedence (Conflict Resolution Rule)',
    description:
      'When two allowed bodies disagree on an ingredient risk level (for example, Titanium Dioxide E171 banned in food by EFSA in 2022 while still permitted under numeric limits by the FDA), the stricter precautionary finding sets the Risk Tier, and BOTH official positions are explicitly documented in the report.'
  },
  {
    title: '2. Strictly Allowed Authorities Only',
    description:
      'Risk ratings may ONLY cite FDA, USDA (including NOP), EPA, CDC, NIH, EFSA, WHO/IARC, Codex Alimentarius, or FSSAI. No consumer blogs, wellness influencers, or proprietary app scores may be cited.'
  },
  {
    title: '3. Journalism & Media Separation Rule',
    description:
      'Investigative journalism (such as The New York Times or Consumer Reports) may be noted strictly as secondary consumer context and is NEVER used to calculate or justify an ingredient Risk Tier or Wellbeing Index deduction.'
  },
  {
    title: '4. Mandatory Citation & No-Data Honesty Rule',
    description:
      'Every risk claim must name its authoritative source and registry. When no allowed authority has published toxicological or regulatory guidance for a botanical or proprietary ingredient, the analyzer must output "No authoritative data found" rather than guessing.'
  }
];

export const OFFICIAL_REGISTRIES: OfficialRegistry[] = [
  {
    id: 'fda-food-additive-status',
    name: 'FDA Food Additive Status List & Substances Added to Food',
    authority: 'FDA',
    url: 'https://www.fda.gov/food/food-additives-petitions/food-additive-status-list',
    whatItCovers: 'Regulatory status, maximum permitted usage percentages, and specific food category restrictions under 21 CFR.',
    howToRead: [
      'Locate the exact chemical name or INS/CAS number in alphabetical order.',
      'Check the letter code (e.g., REG = regulated with tolerance limit, BAN = banned/revoked, GRAS = Generally Recognized As Safe).',
      'Verify whether the product uses the additive within the permitted category and numeric concentration limit.'
    ],
    checkRecordFields: ['Registry Name', '21 CFR Citation', 'Status Code (REG/GRAS/BAN)', 'Permitted Limit / Restriction', 'Check Date']
  },
  {
    id: 'fda-gras-notices',
    name: 'FDA GRAS Notice Inventory',
    authority: 'FDA',
    url: 'https://www.cfsanappsexternal.fda.gov/scripts/fdcc/index.cfm?set=GRASNotices',
    whatItCovers: 'Notifications submitted for substances claimed as Generally Recognized As Safe under intended conditions of use.',
    howToRead: [
      'Search by substance name and inspect the FDA response letter status.',
      '"FDA has no questions" indicates accepted GRAS status for the stated intended use.',
      '"Ceased to evaluate at notifier request" or "Notice does not provide a basis" flags unverified safety.'
    ],
    checkRecordFields: ['GRN Number', 'Substance Name', 'Intended Conditions of Use', 'FDA Closure Letter Verdict']
  },
  {
    id: 'fda-import-alerts-recalls',
    name: 'FDA Import Alerts & Enforcement Recall Registry',
    authority: 'FDA',
    url: 'https://www.accessdata.fda.gov/cms_ia/default.html',
    whatItCovers: 'Detention Without Physical Examination (DWPE) alerts (e.g., lead in spices, undeclared allergens, unapproved colors) and active product recalls.',
    howToRead: [
      'Cross-check manufacturer name, country of origin, and product category against active Import Alerts (e.g., IA 99-19 for contamination, IA 45-02 for illegal colors).',
      'Verify whether the specific lot or product line has Class I, II, or III recall actions.'
    ],
    checkRecordFields: ['Import Alert / Recall Number', 'Reason for Alert', 'Detention Status', 'Manufacturer / Brand Match']
  },
  {
    id: 'usda-organic-integrity',
    name: 'USDA Organic Integrity Database',
    authority: 'USDA',
    url: 'https://organic.ams.usda.gov/integrity/',
    whatItCovers: 'Official registry of all certified organic operations, certifying agents, and active/surrendered/revoked organic certificates.',
    howToRead: [
      'Search the brand or co-packer operating name.',
      'Confirm Operation Status is "Certified" (not Surrendered, Suspended, or Revoked).',
      'Match the certified scope (Crops, Handling/Processing) to the packaging claim.'
    ],
    checkRecordFields: ['NOP Operation ID', 'Certifying Agent', 'Operation Status', 'Certified Scope & Effective Date']
  },
  {
    id: 'efsa-openfoodtox',
    name: 'EFSA OpenFoodTox & Scientific Opinions Register',
    authority: 'EFSA',
    url: 'https://www.efsa.europa.eu/en/data-report/chemical-hazards-database-openfoodtox',
    whatItCovers: 'Acceptable Daily Intake (ADI) re-evaluations, genotoxicity checks, and endocrine disruptor assessments for additives and packaging migrants.',
    howToRead: [
      'Search the substance name or E-number (e.g., E171 Titanium Dioxide, E407 Carrageenan).',
      'Check whether EFSA has established a numerical ADI, lowered the TDI (such as BPA in 2023), or concluded that safety cannot be established.'
    ],
    checkRecordFields: ['EFSA Question/Opinion ID', 'Acceptable Daily Intake (ADI)', 'Genotoxicity / Endocrine Verdict', 'Publication Year']
  }
];

export const INITIAL_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'term-usda-organic',
    term: 'Organic / USDA Organic',
    aliases: ['organic', 'usda organic', '100% organic', 'certified organic'],
    category: 'core_label',
    legalDefinition:
      'Under 7 CFR Part 205, "100% Organic" requires 100% certified organic ingredients; "Organic" requires at least 95% certified organic agricultural ingredients (excluding water and salt), produced without synthetic pesticides, sewage sludge, bioengineering, or ionizing radiation.',
    certifyingBody: 'USDA National Organic Program (NOP) Accredited Certifying Agent (or India Organic / NPOP under FSSAI)',
    authorityCited: 'USDA',
    citationUrl: 'https://www.ams.usda.gov/rules-regulations/organic/labeling',
    redFlags: [
      'Front label claims "Organic" without naming an accredited certifying agent on the information panel.',
      'Personal care product uses "Organic" in brand name while main surfactants/preservatives are synthetic petrochemicals.',
      'Contains fewer than 95% organic ingredients without using the restricted phrase "Made with organic [specified ingredients]".'
    ],
    verificationRule: 'Verified if Certified'
  },
  {
    id: 'term-natural',
    term: 'Natural / All-Natural',
    aliases: ['natural', 'all natural', '100% natural', 'naturally derived', 'nature inspired'],
    category: 'core_label',
    legalDefinition:
      'In food, FDA has no formal rulemaking definition for "Natural", maintaining only an informal policy that nothing artificial or synthetic (including color additives) has been added. In cosmetics and personal care, "Natural" has zero legal definition or federal certification under FDA.',
    certifyingBody: 'None (No federal certifying body in US/EU for general "Natural" claims)',
    authorityCited: 'FDA',
    citationUrl: 'https://www.fda.gov/food/food-labeling-nutrition/use-term-natural-food-labeling',
    redFlags: [
      'Product claims "Natural" on the front while containing synthetic preservatives (e.g., parabens, sodium benzoate, phenoxyethanol) or synthetic fragrance.',
      'Used to imply organic certification or toxicological safety without third-party verification.'
    ],
    verificationRule: 'Unregulated / Marketing Term'
  },
  {
    id: 'term-non-gmo',
    term: 'Non-GMO / No GMO',
    aliases: ['non-gmo', 'no gmo', 'gmo free', 'non-bioengineered', 'non gmo project verified'],
    category: 'questioned_claim',
    legalDefinition:
      'Indicates ingredients are not derived from bioengineered crops as defined by the USDA National Bioengineered Food Disclosure Standard (7 CFR Part 66) or verified by third-party testing below 0.9% action thresholds.',
    certifyingBody: 'USDA AMS (Bioengineered Disclosure) or Non-GMO Project (third-party standard)',
    authorityCited: 'USDA',
    citationUrl: 'https://www.ams.usda.gov/rules-regulations/be',
    redFlags: [
      '"No GMO" claim placed on products or ingredients for which no genetically modified commercial variety exists (e.g., water, salt, herbal shampoos), creating a misleading halo effect.',
      'Unverified self-declaration without supply-chain segregation for high-risk crops (corn, soy, canola, sugar beet).'
    ],
    verificationRule: 'Verified if Certified'
  },
  {
    id: 'term-clean-label',
    term: 'Clean / Clean Label',
    aliases: ['clean', 'clean label', 'clean beauty', 'clean formula', 'pure & clean'],
    category: 'core_label',
    legalDefinition:
      'No statutory or regulatory definition exists under FDA, USDA, EFSA, or FSSAI. "Clean" is an industry and retailer marketing construct (such as Whole Foods Quality Standards) rather than a public health standard.',
    certifyingBody: 'None (Retailer-specific lists only)',
    authorityCited: 'FDA',
    citationUrl: 'https://www.fda.gov/cosmetics/cosmetics-labeling-claims',
    redFlags: [
      'Replaces well-studied preservatives with high concentrations of allergenic essential oils or unregulated botanical extracts.',
      'Masks undisclosed fragrance allergens under "natural fragrance".'
    ],
    verificationRule: 'Unregulated / Marketing Term'
  },
  {
    id: 'term-no-micronutrients',
    term: 'No Micronutrients / Micronutrient-Depleted Claim',
    aliases: ['no micronutrients', 'zero micronutrients', 'stripped of micronutrients', 'micronutrient free'],
    category: 'questioned_claim',
    legalDefinition:
      'Under FDA (21 CFR 101.9) and Codex Alimentarius guidelines, essential vitamins and minerals (Vitamin D, Calcium, Iron, Potassium) are required on nutrition panels. A product lacking micronutrients or making unusual micronutrient claims indicates ultra-refined calories with low nutrient density.',
    certifyingBody: 'FDA / Codex Alimentarius Nutrition Labeling Standards',
    authorityCited: 'Codex Alimentarius',
    citationUrl: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
    redFlags: [
      'High caloric or sugar load paired with 0% Daily Value across essential micronutrients.',
      'Marketing copy framing the absence of fortifying vitamins/minerals as "simpler" or "purer" while offering poor nutritional balance.'
    ],
    verificationRule: 'Regulated Threshold'
  },
  {
    id: 'term-plastic-free-eco',
    term: 'Biodegradable / Eco-Friendly / Plastic-Free Formula',
    aliases: ['biodegradable', 'eco-friendly', 'earth friendly', 'microplastic free', 'sustainable formula'],
    category: 'environment_body',
    legalDefinition:
      'Under EPA Safer Choice and EU REACH microplastics rules, environmental impact claims must be substantiated by rapid aerobic biodegradation testing (OECD 301) and absence of synthetic polymer microparticles.',
    certifyingBody: 'EPA Safer Choice / EU Ecolabel',
    authorityCited: 'EPA',
    citationUrl: 'https://www.epa.gov/saferchoice/standard-safer-choice-labeled-products',
    redFlags: [
      'Claims "Eco-Friendly" on front label while ingredient list contains persistent synthetic polymers (Acrylates Copolymer, Carbomer, Dimethicone, PEG compounds).',
      'Packaging resin code #3 (PVC/phthalates) or #7 (polycarbonate/BPA) contradicts environmental wellness positioning.'
    ],
    verificationRule: 'Regulated Threshold'
  },
  {
    id: 'term-hypoallergenic-derm',
    term: 'Hypoallergenic / Dermatologist Tested',
    aliases: ['hypoallergenic', 'dermatologist tested', 'dermatologically tested', 'gentle for sensitive skin', 'tear free'],
    category: 'personal_care',
    legalDefinition:
      'FDA explicitly states there are no federal standards or definitions governing the use of the term "hypoallergenic" or "dermatologist tested". The term means whatever a particular company chooses it to mean.',
    certifyingBody: 'None under FDA regulations',
    authorityCited: 'FDA',
    citationUrl: 'https://www.fda.gov/cosmetics/cosmetics-labeling-claims/hypoallergenic-cosmetics',
    redFlags: [
      'Contains known contact sensitizers (Methylisothiazolinone, DMDM Hydantoin, Linalool, Limonene, Synthetic Fragrance) despite claiming "Hypoallergenic".',
      '"Dermatologist Tested" does not disclose sample size or whether test subjects experienced irritation.'
    ],
    verificationRule: 'Unregulated / Marketing Term'
  },
  {
    id: 'term-sulfate-paraben-free',
    term: 'Sulfate-Free / Paraben-Free',
    aliases: ['sulfate free', 'sulfate-free', 'paraben free', 'paraben-free', 'phthalate free', 'no sulfates', 'no parabens'],
    category: 'personal_care',
    legalDefinition:
      'Verifiable ingredient exclusion claim indicating absence of alkyl sulfates (SLS, SLES, ALS) or para-hydroxybenzoic acid esters (methyl-, propyl-, butylparaben) on the INCI declaration.',
    certifyingBody: 'INCI Ingredient List Verification (FDA / EU Cosmetics Regulation)',
    authorityCited: 'FDA',
    citationUrl: 'https://www.fda.gov/cosmetics/cosmetics-ingredients/parabens-cosmetics',
    redFlags: [
      'Claims "Sulfate-Free" while substituting equally harsh anionic surfactants like Sodium C14-16 Olefin Sulfonate without consumer disclosure.',
      'Claims "Paraben-Free" while replacing parabens with formaldehyde-releasing preservatives (DMDM Hydantoin, Imidazolidinyl Urea) or Methylisothiazolinone.'
    ],
    verificationRule: 'Regulated Threshold'
  },
  {
    id: 'term-ayurvedic-herbal',
    term: 'Ayurvedic / Herbal Proprietary Formula',
    aliases: ['ayurvedic', 'authentic ayurveda', 'herbal active', 'plant protein enriched', 'botanical complex'],
    category: 'questioned_claim',
    legalDefinition:
      'Under FSSAI (Ayurveda Aahara) and Indian Drugs & Cosmetics Act, authentic Ayurvedic formulations must declare exact botanical standardization and excipient bases; in cosmetic/shampoo exports, full INCI base surfactants and preservatives must still be disclosed.',
    certifyingBody: 'FSSAI / Ministry of AYUSH / FDA Cosmetic INCI Rules',
    authorityCited: 'FSSAI',
    citationUrl: 'https://www.fssai.gov.in/cms/ayurveda-aahara.php',
    redFlags: [
      'Highlights herbal extracts (e.g., Bhringraj, Amla, Chickpea protein) on the front while listing synthetic surfactants, artificial dyes, and undisclosed parfum as the primary base.',
      'Omits complete INCI disclosure of synthetic base ingredients under a "Proprietary Base" (Q.S.) label.'
    ],
    verificationRule: 'Regulated Threshold'
  }
];

export const FLAGGED_ADDITIVES_DB: FlaggedAdditive[] = [
  {
    id: 'add-phthalates',
    name: 'Phthalates (DEP, DBP, DEHP / Undisclosed Fragrance Carrier)',
    synonyms: ['phthalate', 'diethyl phthalate', 'dibutyl phthalate', 'dehp', 'dbp', 'dep', 'fragrance', 'parfum'],
    category: 'plastic_endocrine',
    isPlasticRelated: true,
    riskTier: 'High',
    primaryAuthority: 'NIH',
    registryName: 'NIH NIEHS Endocrine Disruptors & CDC National Biomonitoring Program',
    regulatoryStatusAndLimit:
      'DBP and DEHP are prohibited in cosmetics in the EU (Regulation EC 1223/2009 Annex II). In the US, DEP remains permitted as a fragrance solvent and often hides under generic "Fragrance/Parfum".',
    conflictNote:
      'EFSA/EU bans DBP and DEHP outright in personal care and strictly limits food-contact plastic migration; FDA does not ban DEP in cosmetics.',
    sideEffectsSummary:
      'Plasticizer and fragrance fixative linked to endocrine disruption, anti-androgenic developmental effects, reproductive toxicity, and hormone interference.',
    vulnerableGroups: ['pregnancy', 'children', 'allergies'],
    citationUrl: 'https://www.niehs.nih.gov/health/topics/agents/phthalates',
    contextJournalismNote: 'Frequently highlighted in consumer packaging investigations regarding hidden plasticizers in scented personal care.'
  },
  {
    id: 'add-bpa-bps',
    name: 'Bisphenol A (BPA) / Bisphenol S (BPS)',
    synonyms: ['bisphenol a', 'bpa', 'bisphenol s', 'bps', 'polycarbonate resin', 'epoxy resin lining'],
    category: 'plastic_endocrine',
    isPlasticRelated: true,
    riskTier: 'High',
    primaryAuthority: 'EFSA',
    registryName: 'EFSA 2023 Re-evaluation of Bisphenol A in Food Contact Materials',
    regulatoryStatusAndLimit:
      'In April 2023, EFSA reduced the Tolerable Daily Intake (TDI) for BPA by 20,000-fold to 0.2 nanograms/kg body weight/day due to immune system toxicity. FDA banned BPA in baby bottles (2012) but still permits it in adult food contact linings.',
    conflictNote:
      'Major conflict: EFSA (2023) concluded dietary BPA exposure exceeds safe levels across all age groups; FDA maintains current non-infant food contact uses are safe.',
    sideEffectsSummary:
      'Plastic monomer that leaches from containers into food/liquids; mimics estrogen, disrupts immune Th17 response, metabolic function, and fetal neurodevelopment.',
    vulnerableGroups: ['pregnancy', 'children'],
    citationUrl: 'https://www.efsa.europa.eu/en/topics/topic/bisphenol'
  },
  {
    id: 'add-microplastics-acrylates',
    name: 'Synthetic Polymer Microparticles (Acrylates / Polyethylene / Carbomer)',
    synonyms: ['acrylates copolymer', 'polyethylene', 'polyquaternium', 'carbomer', 'nylon-12', 'pmma', 'dimethicone'],
    category: 'plastic_endocrine',
    isPlasticRelated: true,
    riskTier: 'Moderate',
    primaryAuthority: 'EPA',
    registryName: 'US Microbead-Free Waters Act (FDA) & EU REACH Microplastics Restriction',
    regulatoryStatusAndLimit:
      'Solid rinse-off microbeads are banned under the US Microbead-Free Waters Act; soluble/liquid synthetic polymers (Acrylates Copolymer, Dimethicone) remain permitted but face phased EU restrictions.',
    sideEffectsSummary:
      'Plastic-derived film formers and thickeners that persist in aquatic ecosystems, contribute to microplastic bioaccumulation, and can trap irritants on skin/scalp.',
    vulnerableGroups: ['allergies'],
    citationUrl: 'https://www.fda.gov/cosmetics/cosmetics-laws-regulations/microbead-free-waters-act-faqs'
  },
  {
    id: 'add-sls-sles',
    name: 'Sodium Lauryl Sulfate (SLS) / Sodium Laureth Sulfate (SLES)',
    synonyms: ['sodium lauryl sulfate', 'sodium laureth sulfate', 'sls', 'sles', 'ammonium lauryl sulfate', 'sodium xylenesulfonate'],
    category: 'personal_care_preservative',
    isPlasticRelated: false,
    riskTier: 'Moderate',
    primaryAuthority: 'FDA',
    registryName: 'FDA Cosmetic Ingredient Review & 1,4-Dioxane Manufacturing Guidance',
    regulatoryStatusAndLimit:
      'Permitted surfactant in rinse-off cleansers; however, ethoxylated surfactants (SLES) can contain trace 1,4-dioxane (a WHO/IARC Group 2B possible human carcinogen) as an ethoxylation byproduct.',
    sideEffectsSummary:
      'Strong anionic detergent that strips epidermal lipids, triggers contact dermatitis in sensitive skin, and carries potential 1,4-dioxane ethoxylation residue.',
    vulnerableGroups: ['children', 'allergies'],
    citationUrl: 'https://www.fda.gov/cosmetics/potential-contaminants-cosmetics/14-dioxane-cosmetics-manufacturing-byproduct'
  },
  {
    id: 'add-parabens',
    name: 'Parabens (Propylparaben, Butylparaben, Methylparaben)',
    synonyms: ['propylparaben', 'butylparaben', 'methylparaben', 'ethylparaben', 'isobutylparaben', 'isopropylparaben'],
    category: 'plastic_endocrine',
    isPlasticRelated: false,
    riskTier: 'High',
    primaryAuthority: 'EFSA',
    registryName: 'EFSA Food Additive Opinion & EU Cosmetics Regulation (EC 1223/2009)',
    regulatoryStatusAndLimit:
      'Isopropyl- and isobutylparaben are banned in EU cosmetics; propylparaben and butylparaben are restricted to 0.14% and prohibited in leave-on products for children under 3 diaper areas. FDA banned propylparaben as a food additive in 2023/2024 state actions.',
    conflictNote:
      'EU strictly restricts long-chain parabens and bans them in infant leave-on zones due to estrogenic activity; FDA cosmetics regulations impose no specific numeric cap.',
    sideEffectsSummary:
      'Weak estrogenic endocrine activity, potential interference with male reproductive development, and allergic contact dermatitis on damaged skin.',
    vulnerableGroups: ['pregnancy', 'children', 'allergies'],
    citationUrl: 'https://www.cdc.gov/biomonitoring/Parabens_FactSheet.html'
  },
  {
    id: 'add-dmdm-formaldehyde',
    name: 'Formaldehyde-Releasing Preservatives (DMDM Hydantoin, Imidazolidinyl Urea)',
    synonyms: ['dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea', 'quaternium-15', 'bronopol', 'sodium hydroxymethylglycinate'],
    category: 'personal_care_preservative',
    isPlasticRelated: false,
    riskTier: 'High',
    primaryAuthority: 'WHO/IARC',
    registryName: 'WHO/IARC Monograph Vol. 100F (Formaldehyde Group 1) & EU Annex V',
    regulatoryStatusAndLimit:
      'Formaldehyde is classified as a Group 1 known human carcinogen by WHO/IARC. EU requires warning labels ("contains formaldehyde") at concentrations as low as 0.001% (10 ppm).',
    sideEffectsSummary:
      'Slowly releases free formaldehyde into water-based shampoos and lotions; potent skin allergen causing scalp dermatitis and respiratory/ocular sensitization.',
    vulnerableGroups: ['children', 'pregnancy', 'allergies'],
    citationUrl: 'https://monographs.iarc.who.int/list-of-classifications'
  },
  {
    id: 'add-methylisothiazolinone',
    name: 'Methylisothiazolinone (MI) / Methylchloroisothiazolinone (MCI)',
    synonyms: ['methylisothiazolinone', 'methylchloroisothiazolinone', 'kathon cg'],
    category: 'personal_care_preservative',
    isPlasticRelated: false,
    riskTier: 'High',
    primaryAuthority: 'EFSA',
    registryName: 'EU Scientific Committee on Consumer Safety (SCCS) / Regulation 2016/1198',
    regulatoryStatusAndLimit:
      'Banned in all leave-on cosmetics in the EU and restricted to 0.0015% (15 ppm) in rinse-off products due to severe epidemic contact allergy rates.',
    sideEffectsSummary:
      'High-potency contact allergen linked to acute allergic eczema and scalp/facial dermatitis.',
    vulnerableGroups: ['children', 'allergies'],
    citationUrl: 'https://www.fda.gov/cosmetics/cosmetics-ingredients/allergens-cosmetics'
  },
  {
    id: 'add-zinc-pyrithione',
    name: 'Pyrithione Zinc (Zinc Pyrithione)',
    synonyms: ['pyrithione zinc', 'zinc pyrithione', 'zpt'],
    category: 'personal_care_preservative',
    isPlasticRelated: false,
    riskTier: 'Moderate',
    primaryAuthority: 'FDA',
    registryName: 'FDA OTC Dandruff Monograph (21 CFR 358.710) vs. EU Omnibus IV Ban (2022)',
    regulatoryStatusAndLimit:
      'Approved by FDA as an effective OTC anti-dandruff active ingredient (0.3%–2% rinse-off). However, banned in all EU cosmetics since March 2022 following CLP classification as Reprotoxic Category 1B.',
    conflictNote:
      'Major regulatory split: Permitted by FDA as a proven OTC anti-dandruff active; banned in EU cosmetics under reproductive toxicity hazard classification.',
    sideEffectsSummary:
      'Effective antifungal active for seborrheic dermatitis/dandruff, but carries EU reproductive toxicity hazard classification and high aquatic toxicity.',
    vulnerableGroups: ['pregnancy'],
    citationUrl: 'https://www.fda.gov/drugs/status-otc-rulemakings/rulemaking-history-otc-dandruff-seborrheic-dermatitis-and-psoriasis-drug-products'
  },
  {
    id: 'add-titanium-dioxide',
    name: 'Titanium Dioxide (E171 / CI 77891)',
    synonyms: ['titanium dioxide', 'e171', 'ci 77891'],
    category: 'colorant_sweetener',
    isPlasticRelated: false,
    riskTier: 'High',
    primaryAuthority: 'EFSA',
    registryName: 'EFSA 2021 Safety Assessment of Titanium Dioxide (E171) as Food Additive',
    regulatoryStatusAndLimit:
      'Banned as a food additive in the EU since 2022 after EFSA concluded genotoxicity concerns from nanoparticles could not be ruled out. FDA still allows up to 1% by weight in food and permits cosmetic whitening use.',
    conflictNote:
      'EFSA considers E171 no longer safe as a food additive due to potential DNA damage; FDA and Codex still permit food use up to 1%.',
    sideEffectsSummary:
      'Inorganic whitening pigment; ingested nanoparticle fraction may accumulate in tissues with unresolvable genotoxicity concerns.',
    vulnerableGroups: ['children'],
    citationUrl: 'https://www.efsa.europa.eu/en/news/titanium-dioxide-e171-no-longer-considered-safe-when-used-food-additive'
  },
  {
    id: 'add-synthetic-dyes',
    name: 'Synthetic Azo Dyes (Red 40, Yellow 5, Yellow 6, Blue 1)',
    synonyms: ['red 40', 'allura red', 'yellow 5', 'tartrazine', 'yellow 6', 'sunset yellow', 'blue 1', 'brilliant blue', 'fd&c red no. 40', 'fd&c yellow no. 5', 'ci 19140', 'ci 16035', 'ci 42090'],
    category: 'colorant_sweetener',
    isPlasticRelated: false,
    riskTier: 'High',
    primaryAuthority: 'EFSA',
    registryName: 'EFSA Re-evaluation of Azo Dyes & EU Regulation 1333/2008 Annex V',
    regulatoryStatusAndLimit:
      'Batch-certified by FDA under 21 CFR Part 74; in the EU, foods containing Yellow 5, Yellow 6, or Red 40 must carry a mandatory warning: "May have an adverse effect on activity and attention in children."',
    conflictNote:
      'EU mandates child hyperactivity warning labels on Red 40, Yellow 5, and Yellow 6; FDA requires ingredient declaration (especially Yellow 5 for sensitivity) without a behavioral warning.',
    sideEffectsSummary:
      'Petroleum-derived colorants with zero nutritional or functional cleansing value; associated with neurobehavioral sensitivity in children and urticaria/asthma flares in sensitive individuals.',
    vulnerableGroups: ['children', 'allergies'],
    citationUrl: 'https://www.fda.gov/food/color-additives-information-consumers/color-additives-questions-and-answers-consumers'
  },
  {
    id: 'add-bha-bht',
    name: 'Butylated Hydroxyanisole (BHA) / Butylated Hydroxytoluene (BHT)',
    synonyms: ['bha', 'butylated hydroxyanisole', 'bht', 'butylated hydroxytoluene', 'e320', 'e321'],
    category: 'food_additive',
    isPlasticRelated: false,
    riskTier: 'High',
    primaryAuthority: 'WHO/IARC',
    registryName: 'WHO/IARC Monograph Vol. 40 & NIH National Toxicology Program (NTP) Report on Carcinogens',
    regulatoryStatusAndLimit:
      'BHA is classified by WHO/IARC as Group 2B (possibly carcinogenic to humans) and by NIH NTP as "reasonably anticipated to be a human carcinogen". FDA permits up to 0.02% of fat/oil content.',
    sideEffectsSummary:
      'Synthetic phenolic antioxidants associated with forestomach tumors in animal models and suspected endocrine-disrupting properties.',
    vulnerableGroups: ['pregnancy', 'children'],
    citationUrl: 'https://ntp.niehs.nih.gov/whatwestudy/assessments/cancer/roc'
  },
  {
    id: 'add-carrageenan',
    name: 'Carrageenan (E407)',
    synonyms: ['carrageenan', 'e407', 'degraded carrageenan'],
    category: 'food_additive',
    isPlasticRelated: false,
    riskTier: 'Moderate',
    primaryAuthority: 'EFSA',
    registryName: 'EFSA Re-evaluation of Carrageenan (E407) & USDA National List',
    regulatoryStatusAndLimit:
      'Permitted as an emulsifier/thickener by FDA (21 CFR 172.620); EFSA set a temporary ADI of 75 mg/kg bw/day in 2018 while noting uncertainties regarding low-molecular-weight poligeenan fractions.',
    sideEffectsSummary:
      'Seaweed-derived thickener that may trigger gastrointestinal inflammation or bloating in individuals with sensitive digestive tracts.',
    vulnerableGroups: ['children'],
    citationUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/5238'
  },
  {
    id: 'add-sodium-benzoate',
    name: 'Sodium Benzoate (E211)',
    synonyms: ['sodium benzoate', 'e211', 'benzoic acid'],
    category: 'food_additive',
    isPlasticRelated: false,
    riskTier: 'Moderate',
    primaryAuthority: 'FDA',
    registryName: 'FDA 21 CFR 184.1733 & Benzene in Beverages Survey',
    regulatoryStatusAndLimit:
      'GRAS preservative up to 0.1% in foods. However, when combined with Ascorbic Acid (Vitamin C) or Citric Acid under heat/light, it can form trace benzene (a WHO/IARC Group 1 carcinogen).',
    sideEffectsSummary:
      'Antimicrobial preservative; safe alone at <0.1% but warrants caution when paired with Vitamin C/ascorbic acid due to potential benzene formation.',
    vulnerableGroups: ['children', 'allergies'],
    citationUrl: 'https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages'
  },
  {
    id: 'add-aspartame-sweeteners',
    name: 'Artificial Non-Nutritive Sweeteners (Aspartame, Sucralose, Acesulfame K)',
    synonyms: ['aspartame', 'sucralose', 'acesulfame potassium', 'acesulfame k', 'ace-k', 'saccharin', 'neotame'],
    category: 'colorant_sweetener',
    isPlasticRelated: false,
    riskTier: 'Moderate',
    primaryAuthority: 'WHO/IARC',
    registryName: 'WHO/IARC & JECFA 2023 Aspartame Hazard and Risk Assessment + WHO Non-Sugar Sweeteners Guideline',
    regulatoryStatusAndLimit:
      'In July 2023, WHO/IARC classified Aspartame as Group 2B (possibly carcinogenic), while JECFA reaffirmed the ADI of 0–40 mg/kg bw. WHO further advised against using non-sugar sweeteners for long-term weight control.',
    conflictNote:
      'WHO/IARC classified aspartame as Group 2B and WHO issued a conditional recommendation against non-sugar sweeteners; FDA disagrees with IARC and maintains safety under 50 mg/kg ADI.',
    sideEffectsSummary:
      'High-intensity synthetic sweeteners; Aspartame must be strictly avoided by individuals with Phenylketonuria (PKU), and WHO notes lack of long-term metabolic benefit.',
    vulnerableGroups: ['children', 'pregnancy'],
    citationUrl: 'https://www.who.int/news/item/14-07-2023-aspartame-hazard-and-risk-assessment-results-released'
  },
  {
    id: 'add-hfcs',
    name: 'High-Fructose Corn Syrup (HFCS) / Refined Glucose-Fructose Syrup',
    synonyms: ['high fructose corn syrup', 'high-fructose corn syrup', 'hfcs', 'glucose-fructose syrup', 'corn syrup solids'],
    category: 'food_additive',
    isPlasticRelated: false,
    riskTier: 'Moderate',
    primaryAuthority: 'FDA',
    registryName: 'FDA 21 CFR 184.1866 & Dietary Guidelines Added Sugars Cap (<10% kcal)',
    regulatoryStatusAndLimit:
      'GRAS sweetener under FDA; FDA and WHO recommend limiting added sugars to under 10% (ideally <5% per WHO) of daily energy intake.',
    sideEffectsSummary:
      'Ultra-processed caloric sweetener contributing to glycemic spikes, hepatic de novo lipogenesis, dental caries, and zero micronutrient density.',
    vulnerableGroups: ['children'],
    citationUrl: 'https://www.fda.gov/food/nutrition-education-resources-materials/added-sugars-nutrition-facts-label'
  }
];

export const SAFE_COMMON_INGREDIENTS: Record<
  string,
  {
    authority: AllowedBody['id'];
    registry: string;
    status: string;
    note: string;
    url: string;
  }
> = {
  water: {
    authority: 'FDA',
    registry: 'USP / FDA Cosmetic & Food Baseline',
    status: 'Standard solvent (Safe / Low Risk)',
    note: 'Primary purified water vehicle; zero toxicological concern.',
    url: 'https://www.fda.gov/cosmetics/cosmetics-labeling/cosmetics-labeling-guide'
  },
  aqua: {
    authority: 'FDA',
    registry: 'INCI Standard Nomenclature',
    status: 'Standard solvent (Safe / Low Risk)',
    note: 'Purified water vehicle in personal care.',
    url: 'https://www.fda.gov/cosmetics/cosmetics-labeling/cosmetics-labeling-guide'
  },
  glycerin: {
    authority: 'FDA',
    registry: '21 CFR 182.1320 (GRAS) & CIR Safe',
    status: 'Generally Recognized As Safe (GRAS)',
    note: 'Well-established humectant and moisture barrier support with strong safety record.',
    url: 'https://www.cfsanappsexternal.fda.gov/scripts/fdcc/index.cfm?set=SCOGS'
  },
  'citric acid': {
    authority: 'FDA',
    registry: '21 CFR 184.1033 (Direct Food Substance Affirmed as GRAS)',
    status: 'Affirmed GRAS with no limitation other than Good Manufacturing Practice',
    note: 'Organic acid used for pH adjustment and chelating stability.',
    url: 'https://www.fda.gov/food/food-additives-petitions/food-additive-status-list'
  },
  'aloe barbadensis leaf juice': {
    authority: 'NIH',
    registry: 'NIH NCCIH Botanical Monograph & CIR Assessment',
    status: 'Safe decolorized inner leaf gel in topical and dietary applications',
    note: 'Soothing botanical humectant when decolorized (aloin removed).',
    url: 'https://www.nccih.nih.gov/health/aloe-vera'
  },
  'aloe vera': {
    authority: 'NIH',
    registry: 'NIH NCCIH Botanical Monograph',
    status: 'Safe inner leaf gel extract',
    note: 'Traditional skin and scalp conditioning botanical.',
    url: 'https://www.nccih.nih.gov/health/aloe-vera'
  },
  'coco-glucoside': {
    authority: 'EPA',
    registry: 'EPA Safer Choice Chemical Ingredient List (Green Circle)',
    status: 'Verified low concern by EPA Safer Choice',
    note: 'Plant-derived non-ionic glucoside surfactant with low skin/eye irritation and rapid biodegradability.',
    url: 'https://www.epa.gov/saferchoice/safer-ingredients'
  },
  'decyl glucoside': {
    authority: 'EPA',
    registry: 'EPA Safer Choice Chemical Ingredient List (Green Circle)',
    status: 'Verified low concern by EPA Safer Choice',
    note: 'Mild sugar-derived cleanser suitable for sensitive skin and children.',
    url: 'https://www.epa.gov/saferchoice/safer-ingredients'
  },
  'cocamidopropyl betaine': {
    authority: 'EPA',
    registry: 'EPA Safer Choice & FDA CIR Assessment',
    status: 'Safe amphoteric surfactant in rinse-off formulations',
    note: 'Coconut-derived foam booster; significantly milder than lauryl sulfates, though cosmetic grade free of amidoamine impurities is preferred.',
    url: 'https://www.epa.gov/saferchoice/safer-ingredients'
  },
  'hydrolyzed wheat protein': {
    authority: 'FDA',
    registry: 'FDA Cosmetic Ingredient Review (Molecular Weight <3,500 Da Guidance)',
    status: 'Safe hair conditioning protein (Allergen note for Celiac/Wheat allergy)',
    note: 'Strengthens hair shaft elasticity; flag for individuals with severe IgE wheat allergy.',
    url: 'https://www.fda.gov/cosmetics/cosmetics-ingredients/allergens-cosmetics'
  },
  'cicer arietinum seed extract': {
    authority: 'FSSAI',
    registry: 'FSSAI / AYUSH Classical Botanical & INCI Conditioning Agent',
    status: 'Recognized botanical protein source (Chickpea / Bengal Gram)',
    note: 'Natural plant protein conditioning extract without synthetic surfactant toxicity.',
    url: 'https://www.fssai.gov.in/'
  },
  'chickpea extract': {
    authority: 'FSSAI',
    registry: 'FSSAI / AYUSH Classical Botanical',
    status: 'Recognized food-grade botanical protein source',
    note: 'Provides gentle amino acid conditioning.',
    url: 'https://www.fssai.gov.in/'
  },
  'Phyllanthus emblica fruit extract': {
    authority: 'FSSAI',
    registry: 'FSSAI Ayurveda Aahara & Indian Pharmacopoeia (Amla)',
    status: 'Approved traditional botanical antioxidant',
    note: 'Rich in Vitamin C and polyphenols; low toxicological risk.',
    url: 'https://www.fssai.gov.in/'
  },
  amla: {
    authority: 'FSSAI',
    registry: 'FSSAI Ayurveda Aahara Botanical Schedule',
    status: 'Approved botanical fruit extract (Emblica officinalis)',
    note: 'Traditional hair and nutritional antioxidant.',
    url: 'https://www.fssai.gov.in/'
  },
  bhringraj: {
    authority: 'FSSAI',
    registry: 'FSSAI / AYUSH Classical Botanical (Eclipta alba)',
    status: 'Approved traditional scalp care herb',
    note: 'Used in Ayurvedic hair care; low irritation profile.',
    url: 'https://www.fssai.gov.in/'
  },
  'tocopherol': {
    authority: 'FDA',
    registry: '21 CFR 182.3890 (GRAS Vitamin E)',
    status: 'Generally Recognized As Safe antioxidant',
    note: 'Natural Vitamin E lipid antioxidant that prevents rancidity without BHA/BHT risks.',
    url: 'https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/'
  },
  'panthenol': {
    authority: 'FDA',
    registry: '21 CFR 184.1212 (GRAS Provitamin B5)',
    status: 'Generally Recognized As Safe humectant and nutrient',
    note: 'Provitamin B5 that supports skin barrier and hair moisture retention.',
    url: 'https://www.fda.gov/food/food-additives-petitions/food-additive-status-list'
  }
};

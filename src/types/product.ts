export type ProductCategory = 'food' | 'supplement' | 'personal_care';

export type InputMode = 'photo' | 'link_barcode' | 'hybrid';

export type RiskTier = 'Low' | 'Moderate' | 'High' | 'No authoritative data found';

export type AllowedAuthorityId =
  | 'FDA'
  | 'USDA'
  | 'EPA'
  | 'CDC'
  | 'NIH'
  | 'EFSA'
  | 'WHO/IARC'
  | 'Codex Alimentarius'
  | 'FSSAI'
  | 'None';

export interface AllowedBody {
  id: AllowedAuthorityId;
  name: string;
  fullName: string;
  jurisdiction: string;
  conflictRank: number;
  scope: string;
  url: string;
}

export interface OfficialRegistry {
  id: string;
  name: string;
  authority: AllowedAuthorityId;
  url: string;
  whatItCovers: string;
  howToRead: string[];
  checkRecordFields: string[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases: string[];
  category: 'core_label' | 'questioned_claim' | 'environment_body' | 'personal_care';
  legalDefinition: string;
  certifyingBody: string;
  authorityCited: AllowedAuthorityId;
  citationUrl: string;
  redFlags: string[];
  verificationRule: 'Verified if Certified' | 'Regulated Threshold' | 'Unregulated / Marketing Term';
}

export interface FlaggedAdditive {
  id: string;
  name: string;
  synonyms: string[];
  category: 'food_additive' | 'personal_care_preservative' | 'plastic_endocrine' | 'colorant_sweetener';
  isPlasticRelated: boolean;
  riskTier: 'Low' | 'Moderate' | 'High';
  primaryAuthority: AllowedAuthorityId;
  registryName: string;
  regulatoryStatusAndLimit: string;
  conflictNote?: string;
  sideEffectsSummary: string;
  vulnerableGroups: ('children' | 'pregnancy' | 'allergies')[];
  citationUrl: string;
  contextJournalismNote?: string;
}

export interface NutritionPanelData {
  servingSize: string;
  calories?: number;
  addedSugarsGrams?: number;
  sodiumMg?: number;
  fiberGrams?: number;
  proteinGrams?: number;
  saturatedFatGrams?: number;
}

export interface ProductInput {
  slot: 'A' | 'B';
  name: string;
  brand: string;
  category: ProductCategory;
  inputMode: InputMode;
  frontPhotoBase64?: string;
  frontPhotoName?: string;
  backPhotoBase64?: string;
  backPhotoName?: string;
  weblinkOrBarcode: string;
  price: string;
  quantity: string;
  quantityUnit: 'oz' | 'fl oz' | 'ml' | 'g' | 'lb' | 'servings' | 'count';
  claimsRaw: string;
  ingredientsRaw: string;
  nutrition: NutritionPanelData;
  unreadableFlags: string[];
}

export interface IngredientEvaluation {
  ingredientName: string;
  normalizedMatch?: string;
  positionIndex: number;
  riskTier: RiskTier;
  primaryAuthority: AllowedAuthorityId;
  registryChecked: string;
  regulatoryStatusAndLimit: string;
  isPlasticOrEndocrineConcern: boolean;
  sideEffectsSummary: string;
  citationUrl: string;
  conflictResolutionNote?: string;
  contextJournalismNote?: string;
  vulnerableFlags: ('children' | 'pregnancy' | 'allergies')[];
}

export interface ClaimEvaluation {
  claimText: string;
  status: 'Verified Standard' | 'Requires Certifier Proof' | 'Misleading / Unregulated';
  matchedTerm?: string;
  authorityCited: AllowedAuthorityId;
  certifyingBody: string;
  legalDefinition: string;
  redFlagWarning: string;
  citationUrl: string;
}

export type TrafficLightColor = 'Green' | 'Yellow' | 'Red' | 'N/A';

export type TrafficLightLabel =
  | 'Green — Good'
  | 'Yellow — OK'
  | 'Red — Bad'
  | 'Not Applicable';

export interface SubScoreDetail {
  score: number | 'N/A';
  weightPercent: number;
  colorRating: TrafficLightColor;
  tier: TrafficLightLabel;
  rationale: string;
}

export interface ProductScorecard {
  wellbeingIndex: number;
  wellbeingColor: 'Green' | 'Yellow' | 'Red';
  wellbeingTier: 'Green — Good (75–100)' | 'Yellow — OK (50–75)' | 'Red — Bad (<50)';
  efficacyAndSafetyAnchor: string;
  subScores: {
    ingredientSafety: SubScoreDetail;
    processingLevel: SubScoreDetail;
    additives: SubScoreDetail;
    nutritionBalance: SubScoreDetail;
    claimIntegrity: SubScoreDetail;
  };
  priceNumeric: number;
  quantityNumeric: number;
  quantityUnit: string;
  unitPrice: number;
  qualityRoi: number | null;
  qualityRoiFormulaText: string;
}

export interface EvaluatedProduct {
  input: ProductInput;
  claimsList: string[];
  ingredientsList: string[];
  ingredientEvaluations: IngredientEvaluation[];
  claimEvaluations: ClaimEvaluation[];
  scorecard: ProductScorecard;
}

export interface ComparisonVerdict {
  betterChoice: 'A' | 'B' | 'Tie';
  headlineSummary: string;
  plainLanguageExplanation: string;
  keyTradeOffs: string[];
  roiComparisonSummary: string;
  precautions: {
    children: string[];
    pregnancy: string[];
    allergies: string[];
  };
  medicalDisclaimer: string;
}

export interface ComparisonReport {
  id: string;
  generatedAt: string;
  productA: EvaluatedProduct;
  productB: EvaluatedProduct;
  verdict: ComparisonVerdict;
}

import {
  FLAGGED_ADDITIVES_DB,
  SAFE_COMMON_INGREDIENTS
} from '../data/regulatoryData';
import {
  AllowedAuthorityId,
  ClaimEvaluation,
  ComparisonReport,
  ComparisonVerdict,
  EvaluatedProduct,
  GlossaryTerm,
  IngredientEvaluation,
  ProductInput,
  ProductScorecard,
  RiskTier,
  SubScoreDetail,
  TrafficLightColor,
  TrafficLightLabel
} from '../types/product';

export interface AiIngredientAnnotation {
  ingredientName: string;
  riskTier: RiskTier;
  primaryAuthority: AllowedAuthorityId;
  registryChecked: string;
  regulatoryStatusAndLimit: string;
  isPlasticOrEndocrineConcern: boolean;
  sideEffectsSummary: string;
  citationUrl: string;
  conflictResolutionNote?: string;
  vulnerableFlags?: ('children' | 'pregnancy' | 'allergies')[];
}

export function parseCommaOrLineSeparated(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length > 0);
}

export function evaluateSingleIngredient(
  ingredientRaw: string,
  index: number,
  aiAnnotationsMap: Record<string, AiIngredientAnnotation>
): IngredientEvaluation {
  const normalized = ingredientRaw.toLowerCase().trim();

  // 1. Check Flagged Additives & Plastic Concerns DB first (deterministic authority)
  for (const additive of FLAGGED_ADDITIVES_DB) {
    const matched = additive.synonyms.some(
      (syn) =>
        normalized === syn.toLowerCase() ||
        normalized.includes(syn.toLowerCase())
    );
    if (matched) {
      return {
        ingredientName: ingredientRaw,
        normalizedMatch: additive.name,
        positionIndex: index + 1,
        riskTier: additive.riskTier,
        primaryAuthority: additive.primaryAuthority,
        registryChecked: additive.registryName,
        regulatoryStatusAndLimit: additive.regulatoryStatusAndLimit,
        isPlasticOrEndocrineConcern: additive.isPlasticRelated,
        sideEffectsSummary: additive.sideEffectsSummary,
        citationUrl: additive.citationUrl,
        conflictResolutionNote: additive.conflictNote,
        contextJournalismNote: additive.contextJournalismNote,
        vulnerableFlags: additive.vulnerableGroups
      };
    }
  }

  // 2. Check known safe baseline ingredients
  for (const [safeKey, safeVal] of Object.entries(SAFE_COMMON_INGREDIENTS)) {
    if (
      normalized === safeKey.toLowerCase() ||
      normalized.includes(safeKey.toLowerCase())
    ) {
      const isWheatOrNutAllergen =
        normalized.includes('wheat') ||
        normalized.includes('almond') ||
        normalized.includes('soy') ||
        normalized.includes('milk');
      return {
        ingredientName: ingredientRaw,
        normalizedMatch: safeKey,
        positionIndex: index + 1,
        riskTier: 'Low',
        primaryAuthority: safeVal.authority,
        registryChecked: safeVal.registry,
        regulatoryStatusAndLimit: safeVal.status,
        isPlasticOrEndocrineConcern: false,
        sideEffectsSummary: safeVal.note,
        citationUrl: safeVal.url,
        vulnerableFlags: isWheatOrNutAllergen ? ['allergies'] : []
      };
    }
  }

  // 3. Check AI-verified regulatory lookup if available and valid
  const aiMatch = aiAnnotationsMap[normalized];
  if (aiMatch && aiMatch.primaryAuthority && aiMatch.primaryAuthority !== 'None') {
    return {
      ingredientName: ingredientRaw,
      positionIndex: index + 1,
      riskTier: aiMatch.riskTier,
      primaryAuthority: aiMatch.primaryAuthority,
      registryChecked: aiMatch.registryChecked || `${aiMatch.primaryAuthority} Official Registry`,
      regulatoryStatusAndLimit: aiMatch.regulatoryStatusAndLimit,
      isPlasticOrEndocrineConcern: Boolean(aiMatch.isPlasticOrEndocrineConcern),
      sideEffectsSummary: aiMatch.sideEffectsSummary,
      citationUrl: aiMatch.citationUrl || 'https://www.fda.gov/',
      conflictResolutionNote: aiMatch.conflictResolutionNote,
      vulnerableFlags: aiMatch.vulnerableFlags || []
    };
  }

  // 4. Strict Citation Rule (T1.5): Say "No authoritative data found" when no allowed source covers it
  return {
    ingredientName: ingredientRaw,
    positionIndex: index + 1,
    riskTier: 'No authoritative data found',
    primaryAuthority: 'None',
    registryChecked: 'Checked FDA, USDA, EFSA, WHO/IARC, Codex, FSSAI',
    regulatoryStatusAndLimit: 'No authoritative data found in allowed regulatory registries.',
    isPlasticOrEndocrineConcern: false,
    sideEffectsSummary:
      'No specific toxicology monograph or numeric threshold published by the 9 allowed regulatory authorities.',
    citationUrl: '',
    vulnerableFlags: []
  };
}

export function evaluateClaims(
  claimsList: string[],
  ingredientEvaluations: IngredientEvaluation[],
  glossary: GlossaryTerm[]
): ClaimEvaluation[] {
  if (claimsList.length === 0) return [];

  const hasHighRiskSynthetic = ingredientEvaluations.some(
    (ing) => ing.riskTier === 'High'
  );
  const hasPlasticConcern = ingredientEvaluations.some(
    (ing) => ing.isPlasticOrEndocrineConcern
  );
  const hasSulfates = ingredientEvaluations.some((ing) =>
    ing.ingredientName.toLowerCase().includes('sulfate')
  );
  const hasParabens = ingredientEvaluations.some((ing) =>
    ing.ingredientName.toLowerCase().includes('paraben')
  );

  return claimsList.map((rawClaim) => {
    const lowerClaim = rawClaim.toLowerCase().trim();
    const matchedGlossary = glossary.find(
      (g) =>
        g.term.toLowerCase() === lowerClaim ||
        g.aliases.some((alias) => lowerClaim.includes(alias.toLowerCase())) ||
        lowerClaim.includes(g.term.toLowerCase().split('/')[0].trim())
    );

    if (matchedGlossary) {
      // Default to Unverified unless it meets a regulated threshold or is proven misleading by the ingredient list
      let status: ClaimEvaluation['status'] =
        matchedGlossary.verificationRule === 'Regulated Threshold'
          ? 'Verified Standard'
          : 'Unverified';

      let redFlagWarning = matchedGlossary.redFlags[0] || '';

      // Cross-check claim against actual ingredients — only mark Misleading / Unregulated when known to be misleading
      if (lowerClaim.includes('sulfate') && lowerClaim.includes('free')) {
        status = hasSulfates ? 'Misleading / Unregulated' : 'Verified Standard';
        redFlagWarning = hasSulfates
          ? 'Known Misleading Contradiction: Ingredient list contains a sulfate surfactant despite Sulfate-Free claim.'
          : 'Confirmed: No alkyl sulfates (SLS/SLES) found on the ingredient declaration.';
      } else if (lowerClaim.includes('paraben') && lowerClaim.includes('free')) {
        status = hasParabens ? 'Misleading / Unregulated' : 'Verified Standard';
        redFlagWarning = hasParabens
          ? 'Known Misleading Contradiction: Ingredient list contains parabens despite Paraben-Free claim.'
          : 'Confirmed: No paraben esters detected in the ingredient list.';
      } else if (
        (lowerClaim.includes('100% natural') ||
          lowerClaim.includes('all natural') ||
          lowerClaim.includes('all-natural') ||
          lowerClaim.includes('clean')) &&
        hasHighRiskSynthetic
      ) {
        status = 'Misleading / Unregulated';
        redFlagWarning =
          'Known Misleading Contradiction: Product claims "All-Natural / Clean" while formulating with High-Risk synthetic additives or preservatives.';
      } else if (
        (lowerClaim.includes('eco') ||
          lowerClaim.includes('biodegradable') ||
          lowerClaim.includes('plastic-free') ||
          lowerClaim.includes('plastic free')) &&
        hasPlasticConcern
      ) {
        status = 'Misleading / Unregulated';
        redFlagWarning =
          'Known Misleading Contradiction: Environmental/plastic-free claim conflicts with plastic-related polymers or phthalate/endocrine-linked carriers in the formula.';
      }

      return {
        claimText: rawClaim,
        status,
        matchedTerm: matchedGlossary.term,
        authorityCited: matchedGlossary.authorityCited,
        certifyingBody: matchedGlossary.certifyingBody,
        legalDefinition: matchedGlossary.legalDefinition,
        redFlagWarning,
        citationUrl: matchedGlossary.citationUrl
      };
    }

    return {
      claimText: rawClaim,
      status: 'Unverified',
      matchedTerm: 'Unlisted Packaging Claim',
      authorityCited: 'FDA',
      certifyingBody: 'No statutory certifying body registered in Key Terms Registry',
      legalDefinition:
        'This packaging phrase does not correspond to a verified federal or international standard in the Key Terms Registry.',
      redFlagWarning:
        'Unverified finding — no independent certification or regulatory threshold was confirmed on the label.',
      citationUrl: 'https://www.fda.gov/food/food-labeling-nutrition'
    };
  });
}

function tierFromScore(score: number): TrafficLightLabel {
  if (score >= 75) return 'Green — Good';
  if (score >= 50) return 'Yellow — OK';
  return 'Red — Bad';
}

function colorFromScore(score: number): 'Green' | 'Yellow' | 'Red' {
  if (score >= 75) return 'Green';
  if (score >= 50) return 'Yellow';
  return 'Red';
}

export function calculateScorecard(
  input: ProductInput,
  ingredientEvaluations: IngredientEvaluation[],
  claimEvaluations: ClaimEvaluation[]
): ProductScorecard {
  const isPersonalCare = input.category === 'personal_care';

  const highRiskCount = ingredientEvaluations.filter((i) => i.riskTier === 'High').length;
  const modRiskCount = ingredientEvaluations.filter((i) => i.riskTier === 'Moderate').length;
  const plasticCount = ingredientEvaluations.filter((i) => i.isPlasticOrEndocrineConcern).length;
  const unratedCount = ingredientEvaluations.filter(
    (i) => i.riskTier === 'No authoritative data found'
  ).length;

  // 1. Ingredient Safety (0-100)
  // Higher deduction if high/moderate risk ingredient appears in top 5 ingredients (higher concentration)
  let safetyDeduction = 0;
  ingredientEvaluations.forEach((ing) => {
    const topFiveMultiplier = ing.positionIndex <= 5 ? 1.35 : 1.0;
    if (ing.riskTier === 'High') safetyDeduction += 22 * topFiveMultiplier;
    else if (ing.riskTier === 'Moderate') safetyDeduction += 11 * topFiveMultiplier;
    else if (ing.riskTier === 'No authoritative data found') safetyDeduction += 3;
  });
  const ingredientSafetyScore = Math.max(0, Math.min(100, Math.round(100 - safetyDeduction)));

  // 2. Additives & Plastic/Endocrine Concerns (0-100)
  const additiveDeduction = highRiskCount * 24 + modRiskCount * 12 + plasticCount * 15;
  const additivesScore = Math.max(0, Math.min(100, Math.round(100 - additiveDeduction)));

  // 3. Claim Integrity (0-100)
  let claimScore = 88;
  if (claimEvaluations.length > 0) {
    const misleadingCount = claimEvaluations.filter(
      (c) => c.status === 'Misleading / Unregulated'
    ).length;
    const unverifiedCount = claimEvaluations.filter(
      (c) => c.status === 'Unverified'
    ).length;
    const verifiedCount = claimEvaluations.filter(
      (c) => c.status === 'Verified Standard'
    ).length;
    claimScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(90 + verifiedCount * 4 - misleadingCount * 24 - unverifiedCount * 8)
      )
    );
  }
  if (input.unreadableFlags.length > 0) {
    claimScore = Math.max(0, claimScore - 15);
  }

  // 4. Processing Level & 5. Nutrition Balance (Food/Supplement ONLY; N/A for Personal Care per T0.1)
  let processingDetail: SubScoreDetail;
  let nutritionDetail: SubScoreDetail;
  let wellbeingIndex = 0;

  if (isPersonalCare) {
    processingDetail = {
      score: 'N/A',
      weightPercent: 0,
      colorRating: 'N/A',
      tier: 'Not Applicable',
      rationale:
        'Not Applicable (T0.1 Rule): Food processing classification (NOVA) does not apply to personal care formulations.'
    };
    nutritionDetail = {
      score: 'N/A',
      weightPercent: 0,
      colorRating: 'N/A',
      tier: 'Not Applicable',
      rationale:
        'Not Applicable (T0.1 Rule): Macronutrient and micronutrient dietary balance applies only to ingested food and supplements.'
    };

    // Personal Care Weights: Ingredient Safety 45%, Additives & Plastics 35%, Claim Integrity 20%
    wellbeingIndex = Math.round(
      ingredientSafetyScore * 0.45 + additivesScore * 0.35 + claimScore * 0.2
    );
  } else {
    // Food or Supplement
    const totalIngredients = ingredientEvaluations.length;
    const ultraProcessedMarkers = highRiskCount + modRiskCount + (totalIngredients > 12 ? 2 : 0);
    const processingScore = Math.max(
      10,
      Math.min(100, Math.round(96 - ultraProcessedMarkers * 12 - Math.max(0, totalIngredients - 6) * 2))
    );

    const addedSugars = input.nutrition.addedSugarsGrams ?? 0;
    const sodium = input.nutrition.sodiumMg ?? 0;
    const fiber = input.nutrition.fiberGrams ?? 0;
    const protein = input.nutrition.proteinGrams ?? 0;
    const satFat = input.nutrition.saturatedFatGrams ?? 0;

    let nutritionScore = 82;
    nutritionScore -= Math.min(35, addedSugars * 2.2);
    nutritionScore -= Math.min(25, Math.max(0, sodium - 150) * 0.05);
    nutritionScore -= Math.min(20, satFat * 2.5);
    nutritionScore += Math.min(12, fiber * 2.5);
    nutritionScore += Math.min(10, protein * 1.2);

    // Check if "No Micronutrients" claim is present
    if (input.claimsRaw.toLowerCase().includes('no micronutrient')) {
      nutritionScore -= 20;
    }
    nutritionScore = Math.max(10, Math.min(100, Math.round(nutritionScore)));

    processingDetail = {
      score: processingScore,
      weightPercent: 15,
      colorRating: colorFromScore(processingScore),
      tier: tierFromScore(processingScore),
      rationale: `${totalIngredients} declared ingredients with ${highRiskCount + modRiskCount} industrial additive/processing markers.`
    };
    nutritionDetail = {
      score: nutritionScore,
      weightPercent: 15,
      colorRating: colorFromScore(nutritionScore),
      tier: tierFromScore(nutritionScore),
      rationale: `Evaluated per serving (${input.nutrition.servingSize || 'standard serving'}): ${addedSugars}g added sugar, ${sodium}mg sodium, ${protein}g protein, ${fiber}g fiber.`
    };

    // Food/Supplement Weights: Safety 30%, Additives 25%, Processing 15%, Nutrition 15%, Claims 15%
    wellbeingIndex = Math.round(
      ingredientSafetyScore * 0.3 +
        additivesScore * 0.25 +
        processingScore * 0.15 +
        nutritionScore * 0.15 +
        claimScore * 0.15
    );
  }

  const priceNum = parseFloat(input.price);
  const qtyNum = parseFloat(input.quantity);
  const hasValidPriceAndQty =
    !Number.isNaN(priceNum) && priceNum > 0 && !Number.isNaN(qtyNum) && qtyNum > 0;

  // T4.4 Formula: Quality ROI = Wellbeing Index / price / quantity x 100
  const qualityRoi = hasValidPriceAndQty
    ? Number(((wellbeingIndex / priceNum / qtyNum) * 100).toFixed(2))
    : null;

  const unitPrice = hasValidPriceAndQty ? Number((priceNum / qtyNum).toFixed(2)) : 0;

  const wellbeingColor = colorFromScore(wellbeingIndex);
  const wellbeingTier: ProductScorecard['wellbeingTier'] =
    wellbeingIndex >= 75
      ? 'Green — Good (75–100)'
      : wellbeingIndex >= 50
        ? 'Yellow — OK (50–75)'
        : 'Red — Bad (<50)';

  return {
    wellbeingIndex,
    wellbeingColor,
    wellbeingTier,
    efficacyAndSafetyAnchor:
      highRiskCount === 0 && modRiskCount <= 1
        ? 'Delivers intended functional performance with minimal regulatory side-effect flags.'
        : `Functional efficacy is accompanied by ${highRiskCount} High-Risk and ${modRiskCount} Moderate-Risk ingredient flags requiring trade-off consideration.`,
    subScores: {
      ingredientSafety: {
        score: ingredientSafetyScore,
        weightPercent: isPersonalCare ? 45 : 30,
        colorRating: colorFromScore(ingredientSafetyScore),
        tier: tierFromScore(ingredientSafetyScore),
        rationale: `${highRiskCount} High-Risk, ${modRiskCount} Moderate-Risk, and ${unratedCount} unrated ingredients across ${ingredientEvaluations.length} total ingredients.`
      },
      processingLevel: processingDetail,
      additives: {
        score: additivesScore,
        weightPercent: isPersonalCare ? 35 : 25,
        colorRating: colorFromScore(additivesScore),
        tier: tierFromScore(additivesScore),
        rationale: `${plasticCount} plastic/endocrine-linked ingredients and ${highRiskCount + modRiskCount} flagged additives or preservatives.`
      },
      nutritionBalance: nutritionDetail,
      claimIntegrity: {
        score: claimScore,
        weightPercent: isPersonalCare ? 20 : 15,
        colorRating: colorFromScore(claimScore),
        tier: tierFromScore(claimScore),
        rationale:
          claimEvaluations.length > 0
            ? `Audited ${claimEvaluations.length} packaging claim(s) against the Key Terms Registry.`
            : 'No front-of-pack promotional claims entered.'
      }
    },
    priceNumeric: !Number.isNaN(priceNum) && priceNum > 0 ? priceNum : 0,
    quantityNumeric: !Number.isNaN(qtyNum) && qtyNum > 0 ? qtyNum : 0,
    quantityUnit: input.quantityUnit,
    unitPrice,
    qualityRoi,
    qualityRoiFormulaText: hasValidPriceAndQty
      ? `${wellbeingTier.split(' (')[0]} ÷ $${priceNum.toFixed(2)} ÷ ${qtyNum} ${input.quantityUnit} × 100 = ${qualityRoi}`
      : 'Price or quantity omitted (optional) — Quality ROI skipped'
  };
}

export function buildComparisonReport(
  inputs: ProductInput[],
  glossary: GlossaryTerm[],
  aiAnnotationsMap: Record<string, AiIngredientAnnotation> = {}
): ComparisonReport {
  const evaluateProduct = (input: ProductInput): EvaluatedProduct => {
    const claimsList = parseCommaOrLineSeparated(input.claimsRaw);
    const ingredientsList = parseCommaOrLineSeparated(input.ingredientsRaw);
    const ingredientEvaluations = ingredientsList.map((ing, idx) =>
      evaluateSingleIngredient(ing, idx, aiAnnotationsMap)
    );
    const claimEvaluations = evaluateClaims(
      claimsList,
      ingredientEvaluations,
      glossary
    );
    const scorecard = calculateScorecard(
      input,
      ingredientEvaluations,
      claimEvaluations
    );

    return {
      input,
      claimsList,
      ingredientsList,
      ingredientEvaluations,
      claimEvaluations,
      scorecard
    };
  };

  const evaluatedProducts = inputs.map(evaluateProduct);
  const isSingleProduct = evaluatedProducts.length === 1;

  // Build precautions for Children, Pregnancy, Allergies across all evaluated products
  const gatherPrecautions = (
    group: 'children' | 'pregnancy' | 'allergies'
  ): string[] => {
    const notes: string[] = [];
    evaluatedProducts.forEach((prod) => {
      const flagged = prod.ingredientEvaluations.filter((ing) =>
        ing.vulnerableFlags.includes(group)
      );
      if (flagged.length > 0) {
        const names = flagged
          .map((f) => `${f.ingredientName} (${f.primaryAuthority})`)
          .join(', ');
        notes.push(
          `${prod.input.name || `Product ${prod.input.slot}`}: Contains ${names} — review official ${flagged[0].primaryAuthority} guidance before frequent household use.`
        );
      }
    });
    if (notes.length === 0) {
      notes.push(
        isSingleProduct
          ? `No specific ${group}-targeted regulatory flags identified in the declared ingredients of this product.`
          : `No specific ${group}-targeted regulatory flags identified in the declared ingredients of the analyzed products.`
      );
    }
    return notes;
  };

  const medicalDisclaimer =
    'Informational Label Analysis Only — Not Medical Advice: This report summarizes published regulatory registries (FDA, USDA, EPA, CDC, NIH, EFSA, WHO/IARC, Codex Alimentarius, FSSAI) in plain language for in-store shopping decisions. It does not diagnose, treat, or replace personalized guidance from a qualified physician, pediatrician, obstetrician, or allergist.';

  if (isSingleProduct) {
    const prod = evaluatedProducts[0];
    const prodTitle = `${prod.input.brand ? `${prod.input.brand} ` : ''}${prod.input.name || `Product ${prod.input.slot}`}`;
    const highRisk = prod.ingredientEvaluations.filter(
      (i) => i.riskTier === 'High'
    );
    const modRisk = prod.ingredientEvaluations.filter(
      (i) => i.riskTier === 'Moderate'
    );
    const misleadingClaims = prod.claimEvaluations.filter(
      (c) => c.status === 'Misleading / Unregulated'
    );
    const unverifiedClaims = prod.claimEvaluations.filter(
      (c) => c.status === 'Unverified'
    );

    const headlineSummary = `${prodTitle} is rated ${prod.scorecard.wellbeingTier.split(' (')[0]} overall.`;

    const plainLanguageExplanation =
      prod.scorecard.wellbeingColor === 'Green'
        ? `${prodTitle} earns a ${prod.scorecard.wellbeingTier} rating across ${prod.ingredientEvaluations.length} audited ingredients (${highRisk.length} High-Risk, ${modRisk.length} Moderate-Risk flags). Its formulation avoids high-concern synthetic additives and aligns well with regulatory standards.`
        : prod.scorecard.wellbeingColor === 'Yellow'
          ? `${prodTitle} earns a ${prod.scorecard.wellbeingTier} rating with ${highRisk.length} High-Risk and ${modRisk.length} Moderate-Risk ingredient flags across ${prod.ingredientEvaluations.length} total declared ingredients. Review the flagged additives and claim findings below to decide if it fits your household priorities.`
          : `${prodTitle} is rated ${prod.scorecard.wellbeingTier} due to ${highRisk.length} High-Risk and ${modRisk.length} Moderate-Risk ingredient flags (${highRisk.concat(modRisk).map((i) => i.ingredientName).slice(0, 4).join(', ') || 'multiple regulatory concerns'}). Consider comparing an alternative product slot if avoiding these ingredients is a priority.`;

    const keyTradeOffs: string[] = [
      `Ingredient Profile: ${prod.ingredientEvaluations.length} declared ingredients audited — ${highRisk.length} High-Risk, ${modRisk.length} Moderate-Risk, and ${prod.ingredientEvaluations.filter((i) => i.isPlasticOrEndocrineConcern).length} plastic/endocrine-linked flags.`,
      `Claim Audit: ${prod.claimEvaluations.length} packaging claim(s) checked (${prod.claimEvaluations.filter((c) => c.status === 'Verified Standard').length} Verified Standard, ${unverifiedClaims.length} Unverified, ${misleadingClaims.length} Misleading / Unregulated).`
    ];

    if (prod.scorecard.qualityRoi !== null) {
      keyTradeOffs.push(
        `Quality ROI: Priced at $${prod.scorecard.priceNumeric.toFixed(2)} for ${prod.scorecard.quantityNumeric} ${prod.input.quantityUnit} ($${prod.scorecard.unitPrice}/${prod.input.quantityUnit}), yielding a Quality ROI of ${prod.scorecard.qualityRoi}.`
      );
    }

    if (prod.input.unreadableFlags.length > 0) {
      keyTradeOffs.push(
        'Transparency Notice: Unreadable or online barcode-lookup notes were recorded during intake; ratings reflect only verified ingredients without guessing.'
      );
    }

    const roiComparisonSummary =
      prod.scorecard.qualityRoi !== null
        ? `${prodTitle} achieves a Quality ROI of ${prod.scorecard.qualityRoi} ($${prod.scorecard.unitPrice}/${prod.input.quantityUnit}). Add up to 4 more products anytime to compare Quality ROI side by side.`
        : 'Pricing omitted (optional) — evaluation is based on the Red / Yellow / Green Wellbeing Rating. Add price & quantity or add more products (up to 5) to compare.';

    return {
      id: `cmp-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      products: evaluatedProducts,
      verdict: {
        betterChoice: 'Single',
        headlineSummary,
        plainLanguageExplanation,
        keyTradeOffs,
        roiComparisonSummary,
        precautions: {
          children: gatherPrecautions('children'),
          pregnancy: gatherPrecautions('pregnancy'),
          allergies: gatherPrecautions('allergies')
        },
        medicalDisclaimer
      }
    };
  }

  // Multi-product comparison (2 to 5 products)
  const sortedByScore = [...evaluatedProducts].sort((a, b) => {
    const diff = b.scorecard.wellbeingIndex - a.scorecard.wellbeingIndex;
    if (Math.abs(diff) >= 3) return diff;
    if (
      a.scorecard.qualityRoi !== null &&
      b.scorecard.qualityRoi !== null &&
      a.scorecard.qualityRoi !== b.scorecard.qualityRoi
    ) {
      return b.scorecard.qualityRoi - a.scorecard.qualityRoi;
    }
    return diff;
  });

  const topProduct = sortedByScore[0];
  const secondProduct = sortedByScore[1];
  const scoreDiff =
    topProduct.scorecard.wellbeingIndex -
    secondProduct.scorecard.wellbeingIndex;

  let isTopTie = Math.abs(scoreDiff) < 3;
  if (
    isTopTie &&
    topProduct.scorecard.qualityRoi !== null &&
    secondProduct.scorecard.qualityRoi !== null &&
    topProduct.scorecard.qualityRoi !== secondProduct.scorecard.qualityRoi
  ) {
    isTopTie = false;
  }

  const betterChoice: ComparisonVerdict['betterChoice'] = isTopTie
    ? 'Tie'
    : topProduct.input.slot;

  const topTitle = `${topProduct.input.brand ? `${topProduct.input.brand} ` : ''}${topProduct.input.name || `Product ${topProduct.input.slot}`}`;
  const secondTitle = `${secondProduct.input.brand ? `${secondProduct.input.brand} ` : ''}${secondProduct.input.name || `Product ${secondProduct.input.slot}`}`;

  const headlineSummary = isTopTie
    ? `${topTitle} (${topProduct.scorecard.wellbeingTier.split(' (')[0]}) and ${secondTitle} (${secondProduct.scorecard.wellbeingTier.split(' (')[0]}) achieve comparable top overall ratings across ${evaluatedProducts.length} products.`
    : `${topTitle} (Slot ${topProduct.input.slot}) is the top recommended choice out of ${evaluatedProducts.length} products (${topProduct.scorecard.wellbeingTier.split(' (')[0]}).`;

  const productsWithRoi = evaluatedProducts.filter(
    (p) => p.scorecard.qualityRoi !== null
  );

  const plainLanguageExplanation = isTopTie
    ? `The top contenders perform similarly across ingredient safety and claim transparency. Compare their specific additive flags, sensitivity callouts, and unit pricing below to select the best match for your household.`
    : `${topTitle} earns a ${topProduct.scorecard.wellbeingTier} rating and leads the ${evaluatedProducts.length}-product comparison because it avoids higher-concern additives found in competing options (such as ${secondProduct.ingredientEvaluations.filter((i) => i.riskTier !== 'Low' && i.riskTier !== 'No authoritative data found').map((i) => i.ingredientName).slice(0, 3).join(', ') || 'flagged ingredients'}) while maintaining stronger alignment between its packaging claims and declared ingredient list.`;

  const keyTradeOffs: string[] = evaluatedProducts.map((p) => {
    const highCount = p.ingredientEvaluations.filter(
      (i) => i.riskTier === 'High'
    ).length;
    const modCount = p.ingredientEvaluations.filter(
      (i) => i.riskTier === 'Moderate'
    ).length;
    const priceInfo =
      p.scorecard.priceNumeric > 0 && p.scorecard.quantityNumeric > 0
        ? ` · $${p.scorecard.priceNumeric.toFixed(2)} / ${p.scorecard.quantityNumeric} ${p.input.quantityUnit} (ROI: ${p.scorecard.qualityRoi})`
        : p.scorecard.priceNumeric > 0
          ? ` · $${p.scorecard.priceNumeric.toFixed(2)}`
          : '';
    return `Slot ${p.input.slot} (${p.input.name || `Product ${p.input.slot}`}): Rated ${p.scorecard.wellbeingTier} — ${highCount} High-Risk, ${modCount} Moderate-Risk flags across ${p.ingredientEvaluations.length} ingredients${priceInfo}.`;
  });

  if (evaluatedProducts.some((p) => p.input.unreadableFlags.length > 0)) {
    keyTradeOffs.push(
      'Transparency Notice: At least one product has unreadable label or online barcode-lookup notes flagged during intake; ratings reflect only verified ingredients without guessing.'
    );
  }

  const roiComparisonSummary =
    productsWithRoi.length >= 2
      ? productsWithRoi
          .map(
            (p) =>
              `${p.input.name || `Slot ${p.input.slot}`}: ROI ${p.scorecard.qualityRoi}`
          )
          .join(' · ')
      : 'Pricing omitted on one or more products (optional) — verdict is based on the Red / Yellow / Green Wellbeing Rating. Add price and quantity anytime to compare Quality ROI.';

  const verdict: ComparisonVerdict = {
    betterChoice,
    headlineSummary,
    plainLanguageExplanation,
    keyTradeOffs,
    roiComparisonSummary,
    precautions: {
      children: gatherPrecautions('children'),
      pregnancy: gatherPrecautions('pregnancy'),
      allergies: gatherPrecautions('allergies')
    },
    medicalDisclaimer
  };

  return {
    id: `cmp-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    products: evaluatedProducts,
    verdict
  };
}

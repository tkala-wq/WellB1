import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import {
  ClaimEvaluation,
  ComparisonReport,
  EvaluatedProduct,
  IngredientEvaluation,
  SubScoreDetail
} from '../types/product';

interface ComparisonReportViewProps {
  report: ComparisonReport;
}

type IngredientFilter = 'all' | 'flagged' | 'plastic' | 'nodata';

export const ComparisonReportView: React.FC<ComparisonReportViewProps> = ({
  report
}) => {
  const [ingredientFilter, setIngredientFilter] =
    useState<IngredientFilter>('all');

  const { productA, productB, verdict } = report;

  const filterIngredients = (
    list: IngredientEvaluation[]
  ): IngredientEvaluation[] => {
    if (ingredientFilter === 'flagged') {
      return list.filter(
        (i) => i.riskTier === 'High' || i.riskTier === 'Moderate'
      );
    }
    if (ingredientFilter === 'plastic') {
      return list.filter((i) => i.isPlasticOrEndocrineConcern);
    }
    if (ingredientFilter === 'nodata') {
      return list.filter((i) => i.riskTier === 'No authoritative data found');
    }
    return list;
  };

  const renderRiskLabel = (tier: IngredientEvaluation['riskTier']) => {
    if (tier === 'High') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
          High Risk
        </span>
      );
    }
    if (tier === 'Moderate') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Moderate Risk
        </span>
      );
    }
    if (tier === 'Low') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Low Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        No authoritative data found
      </span>
    );
  };

  const renderClaimStatus = (status: ClaimEvaluation['status']) => {
    if (status === 'Verified Standard') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Verified Standard
        </span>
      );
    }
    if (status === 'Requires Certifier Proof') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Requires Certifier Proof
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
        <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
        Misleading / Unregulated
      </span>
    );
  };

  const renderTrafficLightHeading = (
    color: 'Green' | 'Yellow' | 'Red' | 'N/A',
    tierText: string,
    size: 'sm' | 'lg' = 'sm'
  ) => {
    const textSize = size === 'lg' ? 'text-lg font-bold' : 'text-sm font-semibold';
    if (color === 'Green') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${textSize} text-emerald-700`}>
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          {tierText}
        </span>
      );
    }
    if (color === 'Yellow') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${textSize} text-amber-700`}>
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          {tierText}
        </span>
      );
    }
    if (color === 'Red') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${textSize} text-red-700`}>
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          {tierText}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">
        Not Applicable (N/A)
      </span>
    );
  };

  const renderSubScoreRow = (
    label: string,
    subA: SubScoreDetail,
    subB: SubScoreDetail
  ) => {
    return (
      <tr className="border-t border-slate-200">
        <td className="py-3 px-4 align-top">
          <div className="text-sm font-medium text-slate-900">{label}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            Weight: {subA.weightPercent}% (Slot A) · {subB.weightPercent}% (Slot
            B)
          </div>
        </td>
        <td className="py-3 px-4 align-top">
          <div className="flex items-center justify-between gap-2">
            {renderTrafficLightHeading(subA.colorRating, subA.tier, 'sm')}
          </div>
          {typeof subA.score === 'number' && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full ${
                  subA.colorRating === 'Green'
                    ? 'bg-emerald-600'
                    : subA.colorRating === 'Yellow'
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                }`}
                style={{ width: `${subA.score}%` }}
              />
            </div>
          )}
          <p className="text-xs text-slate-600 mt-1.5">{subA.rationale}</p>
        </td>
        <td className="py-3 px-4 align-top">
          <div className="flex items-center justify-between gap-2">
            {renderTrafficLightHeading(subB.colorRating, subB.tier, 'sm')}
          </div>
          {typeof subB.score === 'number' && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full ${
                  subB.colorRating === 'Green'
                    ? 'bg-emerald-600'
                    : subB.colorRating === 'Yellow'
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                }`}
                style={{ width: `${subB.score}%` }}
              />
            </div>
          )}
          <p className="text-xs text-slate-600 mt-1.5">{subB.rationale}</p>
        </td>
      </tr>
    );
  };

  const renderProductSnapshotCard = (prod: EvaluatedProduct) => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs text-slate-500">
            Product {prod.input.slot} ·{' '}
            {prod.input.category === 'personal_care'
              ? 'Personal Care'
              : prod.input.category === 'supplement'
                ? 'Dietary Supplement'
                : 'Food & Beverage'}{' '}
            ·{' '}
            {prod.scorecard.priceNumeric > 0 && prod.scorecard.quantityNumeric > 0
              ? `$${prod.scorecard.priceNumeric.toFixed(2)} for ${prod.scorecard.quantityNumeric} ${prod.input.quantityUnit}`
              : prod.scorecard.priceNumeric > 0
                ? `$${prod.scorecard.priceNumeric.toFixed(2)}`
                : prod.scorecard.quantityNumeric > 0
                  ? `${prod.scorecard.quantityNumeric} ${prod.input.quantityUnit} (Price optional)`
                  : 'Price optional (not specified)'}
          </div>
          <h4 className="text-lg font-semibold text-slate-900 mt-0.5">
            {prod.input.brand ? `${prod.input.brand} — ` : ''}
            {prod.input.name || `Product ${prod.input.slot}`}
          </h4>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-500 mb-0.5">Overall Rating</div>
          {renderTrafficLightHeading(
            prod.scorecard.wellbeingColor,
            prod.scorecard.wellbeingTier.split(' (')[0],
            'lg'
          )}
        </div>
      </div>

      {prod.input.unreadableFlags.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
          <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <FileWarning className="w-3.5 h-3.5 text-amber-700" />
            Unreadable Label Disclosure (No-Guessing Rule)
          </div>
          {prod.input.unreadableFlags.map((flag, i) => (
            <p key={i} className="text-xs text-amber-800">
              • {flag}
            </p>
          ))}
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1">
          Packaging Claims Made ({prod.claimsList.length})
        </div>
        {prod.claimsList.length > 0 ? (
          <p className="text-sm text-slate-700">
            {prod.claimsList.join(' · ')}
          </p>
        ) : (
          <p className="text-xs text-slate-500 italic">
            No packaging claims declared.
          </p>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1">
          Full Ordered Ingredient List ({prod.ingredientsList.length})
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {prod.ingredientsList.join(', ')}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* SECTION 1: PRODUCT SNAPSHOT (T7.1) */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xl font-semibold text-slate-900">
            01. Product Snapshot
          </h3>
          <p className="text-sm text-slate-600">
            Side-by-side overview of product identity, declared packaging claims,
            and complete ingredient list in label order.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {renderProductSnapshotCard(productA)}
          {renderProductSnapshotCard(productB)}
        </div>
      </section>

      {/* SECTION 2: INGREDIENT RISK CHECK (T7.2) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              02. Ingredient Risk Check
            </h3>
            <p className="text-sm text-slate-600">
              Every ingredient evaluated strictly against allowed regulatory
              authorities (FDA, USDA, EPA, CDC, NIH, EFSA, WHO/IARC, Codex
              Alimentarius, FSSAI).
            </p>
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(
              [
                { id: 'all', label: 'All Ingredients' },
                { id: 'flagged', label: 'High / Mod Risk' },
                { id: 'plastic', label: 'Plastic / Endocrine' },
                { id: 'nodata', label: 'No Data Found' }
              ] as { id: IngredientFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setIngredientFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  ingredientFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {[productA, productB].map((prod) => {
            const filtered = filterIngredients(prod.ingredientEvaluations);
            return (
              <div
                key={prod.input.slot}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {prod.input.name || `Product ${prod.input.slot}`}
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    Showing {filtered.length} of{' '}
                    {prod.ingredientEvaluations.length}
                  </span>
                </div>

                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No ingredients in {prod.input.name || `Product ${prod.input.slot}`}{' '}
                    match the selected filter.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filtered.map((ing) => (
                      <div key={ing.positionIndex} className="p-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-mono text-slate-400 tabular-nums mr-1.5">
                              #{ing.positionIndex}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {ing.ingredientName}
                            </span>
                            {ing.isPlasticOrEndocrineConcern && (
                              <span className="ml-2 text-xs font-medium text-red-700">
                                · Plastic / Endocrine Concern
                              </span>
                            )}
                          </div>
                          {renderRiskLabel(ing.riskTier)}
                        </div>

                        <div className="text-xs text-slate-500">
                          Authority Cited:{' '}
                          <strong className="text-slate-800">
                            {ing.primaryAuthority}
                          </strong>{' '}
                          · Registry: {ing.registryChecked}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-medium text-slate-900">
                            Regulatory Status:
                          </span>{' '}
                          {ing.regulatoryStatusAndLimit}
                        </p>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-medium text-slate-800">
                            Side Effects & Function:
                          </span>{' '}
                          {ing.sideEffectsSummary}
                        </p>

                        {ing.conflictResolutionNote && (
                          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                            <strong>Source Conflict Resolution (T1.4):</strong>{' '}
                            {ing.conflictResolutionNote}
                          </p>
                        )}

                        {ing.contextJournalismNote && (
                          <p className="text-[11px] text-slate-500 italic">
                            Context Note (T1.3 Journalism Rule — Not used for
                            risk rating): {ing.contextJournalismNote}
                          </p>
                        )}

                        {ing.citationUrl && (
                          <div className="pt-1">
                            <a
                              href={ing.citationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline"
                            >
                              Official {ing.primaryAuthority} Citation
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: CLAIM VERIFICATION (T7.3) */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xl font-semibold text-slate-900">
            03. Claim Verification
          </h3>
          <p className="text-sm text-slate-600">
            Cross-checks every packaging claim against legal definitions,
            certifying bodies, and actual declared ingredients.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {[productA, productB].map((prod) => (
            <div
              key={prod.input.slot}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  {prod.input.name || `Product ${prod.input.slot}`} Claims Audit
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {prod.claimEvaluations.length} Claim(s)
                </span>
              </div>

              {prod.claimEvaluations.length === 0 ? (
                <div className="p-6 text-xs text-slate-500">
                  No packaging claims entered for this product.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {prod.claimEvaluations.map((claim, idx) => (
                    <div key={idx} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          “{claim.claimText}”
                        </span>
                        {renderClaimStatus(claim.status)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Authority: {claim.authorityCited} · Certifying Body:{' '}
                        {claim.certifyingBody}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-medium text-slate-900">
                          Legal Definition:
                        </span>{' '}
                        {claim.legalDefinition}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-medium text-slate-900">
                          Audit Finding:
                        </span>{' '}
                        {claim.redFlagWarning}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: WELLBEING RATING & QUALITY ROI (T7.4) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              04. Wellbeing Rating (Red / Yellow / Green) & Quality ROI
            </h3>
            <p className="text-sm text-slate-600">
              Wellbeing Anchor (T4.3): A high-wellbeing product performs its
              intended job effectively without harmful side effects.
            </p>
          </div>
          <div className="text-xs font-medium text-slate-600">
            Scale: <span className="text-red-700 font-semibold">Red (&lt;50) Bad</span> ·{' '}
            <span className="text-amber-700 font-semibold">Yellow (50–75) OK</span> ·{' '}
            <span className="text-emerald-700 font-semibold">Green (75–100) Good</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-700 w-1/4">
                    Dimension
                  </th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-900 w-3/8">
                    Slot A: {productA.input.name || 'Product A'}
                  </th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-900 w-3/8">
                    Slot B: {productB.input.name || 'Product B'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50/50">
                  <td className="py-4 px-4 align-top">
                    <div className="text-sm font-bold text-slate-900">
                      Overall Wellbeing Rating
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Red (&lt;50 Bad) · Yellow (50–75 OK) · Green (75–100 Good)
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div>
                      {renderTrafficLightHeading(
                        productA.scorecard.wellbeingColor,
                        productA.scorecard.wellbeingTier,
                        'lg'
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {productA.scorecard.efficacyAndSafetyAnchor}
                    </p>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div>
                      {renderTrafficLightHeading(
                        productB.scorecard.wellbeingColor,
                        productB.scorecard.wellbeingTier,
                        'lg'
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {productB.scorecard.efficacyAndSafetyAnchor}
                    </p>
                  </td>
                </tr>

                {renderSubScoreRow(
                  'Ingredient Safety',
                  productA.scorecard.subScores.ingredientSafety,
                  productB.scorecard.subScores.ingredientSafety
                )}
                {renderSubScoreRow(
                  'Additives & Plastic Concerns',
                  productA.scorecard.subScores.additives,
                  productB.scorecard.subScores.additives
                )}
                {renderSubScoreRow(
                  'Processing Level (Food Only — T0.1)',
                  productA.scorecard.subScores.processingLevel,
                  productB.scorecard.subScores.processingLevel
                )}
                {renderSubScoreRow(
                  'Nutrition Balance (Food Only — T0.1)',
                  productA.scorecard.subScores.nutritionBalance,
                  productB.scorecard.subScores.nutritionBalance
                )}
                {renderSubScoreRow(
                  'Packaging Claim Integrity',
                  productA.scorecard.subScores.claimIntegrity,
                  productB.scorecard.subScores.claimIntegrity
                )}

                {/* Quality ROI Row (T4.4) */}
                <tr className="border-t border-slate-200 bg-teal-50/40">
                  <td className="py-4 px-4 align-top">
                    <div className="text-sm font-bold text-slate-900">
                      Quality ROI (Task T4.4)
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                      Wellbeing Index ÷ Price ÷ Quantity × 100
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="text-xl font-bold font-mono tabular-nums text-teal-900">
                      {productA.scorecard.qualityRoi !== null
                        ? productA.scorecard.qualityRoi
                        : 'N/A'}
                    </div>
                    <div className="text-xs font-mono text-slate-600 mt-1 tabular-nums">
                      {productA.scorecard.qualityRoiFormulaText}
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="text-xl font-bold font-mono tabular-nums text-teal-900">
                      {productB.scorecard.qualityRoi !== null
                        ? productB.scorecard.qualityRoi
                        : 'N/A'}
                    </div>
                    <div className="text-xs font-mono text-slate-600 mt-1 tabular-nums">
                      {productB.scorecard.qualityRoiFormulaText}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 5: VERDICT & HOUSEHOLD PRECAUTIONS (T7.5, T7.6) */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xl font-semibold text-slate-900">
            05. Verdict & Household Precautions
          </h3>
          <p className="text-sm text-slate-600">
            Plain-language summary for in-store decision making — informs
            without alarming and provides no medical advice.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-teal-700" />
                Recommended In-Store Verdict
              </div>
              <h4 className="text-xl font-bold text-slate-900">
                {verdict.headlineSummary}
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed max-w-3xl">
                {verdict.plainLanguageExplanation}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shrink-0 font-mono tabular-nums">
              <div className="text-xs text-slate-500">Quality ROI Summary</div>
              <div className="text-xs text-slate-800 mt-1 max-w-xs font-sans">
                {verdict.roiComparisonSummary}
              </div>
            </div>
          </div>

          {/* Key Trade-offs */}
          <div>
            <h5 className="text-sm font-semibold text-slate-900 mb-2">
              Key Trade-Offs to Consider in Store
            </h5>
            <ul className="space-y-1.5">
              {verdict.keyTradeOffs.map((item, idx) => (
                <li
                  key={idx}
                  className="text-sm text-slate-700 flex items-start gap-2"
                >
                  <span className="text-slate-400 select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Who Should Be Careful: Children, Pregnancy, Allergies (T7.5) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                Children & Infants
              </div>
              {verdict.precautions.children.map((note, idx) => (
                <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                  {note}
                </p>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                Pregnancy & Lactation
              </div>
              {verdict.precautions.pregnancy.map((note, idx) => (
                <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                  {note}
                </p>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                Allergies & Sensitive Skin
              </div>
              {verdict.precautions.allergies.map((note, idx) => (
                <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                  {note}
                </p>
              ))}
            </div>
          </div>

          {/* Non-Medical Advice Tone Rule (T7.6) */}
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
            {verdict.medicalDisclaimer}
          </div>
        </div>
      </section>
    </div>
  );
};

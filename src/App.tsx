import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Scale
} from 'lucide-react';
import { ComparisonReportView } from './components/ComparisonReportView';
import { ProductInputCard } from './components/ProductInputCard';
import {
  AdditivesRegistryView,
  ClaimsGlossaryView,
  SourceRulesView
} from './components/ReferenceHubViews';
import {
  FLAGGED_ADDITIVES_DB,
  INITIAL_GLOSSARY_TERMS,
  SAFE_COMMON_INGREDIENTS
} from './data/regulatoryData';
import { ComparisonReport, GlossaryTerm, ProductInput } from './types/product';
import {
  AiIngredientAnnotation,
  buildComparisonReport,
  parseCommaOrLineSeparated
} from './utils/scoringEngine';

type ActiveNavTab = 'studio' | 'glossary' | 'additives' | 'sources';

const createEmptyProductInput = (slot: 'A' | 'B'): ProductInput => ({
  slot,
  name: '',
  brand: '',
  category: 'personal_care',
  inputMode: 'hybrid',
  weblinkOrBarcode: '',
  price: '',
  quantity: '',
  quantityUnit: 'fl oz',
  claimsRaw: '',
  ingredientsRaw: '',
  nutrition: {
    servingSize: ''
  },
  unreadableFlags: []
});

const GLOSSARY_STORAGE_KEY = 'kyp_custom_glossary_terms_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('studio');
  const [productA, setProductA] = useState<ProductInput>(() =>
    createEmptyProductInput('A')
  );
  const [productB, setProductB] = useState<ProductInput>(() =>
    createEmptyProductInput('B')
  );

  const [glossary, setGlossary] = useState<GlossaryTerm[]>(() => {
    try {
      const saved = localStorage.getItem(GLOSSARY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GlossaryTerm[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...INITIAL_GLOSSARY_TERMS, ...parsed];
        }
      }
    } catch {
      // Ignore storage errors
    }
    return INITIAL_GLOSSARY_TERMS;
  });

  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const reportSectionRef = useRef<HTMLDivElement | null>(null);

  const handleAddGlossaryTerm = (newTerm: GlossaryTerm) => {
    const updated = [...glossary, newTerm];
    setGlossary(updated);
    try {
      const customOnly = updated.filter((t) => t.id.startsWith('custom-term-'));
      localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(customOnly));
    } catch {
      // Ignore storage errors
    }
  };

  const handleResetComparison = () => {
    setProductA(createEmptyProductInput('A'));
    setProductB(createEmptyProductInput('B'));
    setReport(null);
    setValidationError(null);
    setActiveTab('studio');
  };

  const isKnownLocally = (ingRaw: string): boolean => {
    const norm = ingRaw.toLowerCase().trim();
    const inAdditives = FLAGGED_ADDITIVES_DB.some((a) =>
      a.synonyms.some(
        (syn) => norm === syn.toLowerCase() || norm.includes(syn.toLowerCase())
      )
    );
    if (inAdditives) return true;
    return Object.keys(SAFE_COMMON_INGREDIENTS).some(
      (k) => norm === k.toLowerCase() || norm.includes(k.toLowerCase())
    );
  };

  const handleRunComparison = async () => {
    setValidationError(null);

    const listA = parseCommaOrLineSeparated(productA.ingredientsRaw);
    const listB = parseCommaOrLineSeparated(productB.ingredientsRaw);

    if (!productA.name.trim() || !productB.name.trim()) {
      setValidationError(
        'Please enter a Product Name for both Product A and Product B before generating the comparison report.'
      );
      return;
    }

    if (listA.length === 0 || listB.length === 0) {
      setValidationError(
        'Both products require an ingredient list (either extracted via Gemini Label OCR or entered in the ingredient field).'
      );
      return;
    }

    const priceA = parseFloat(productA.price);
    const qtyA = parseFloat(productA.quantity);
    const priceB = parseFloat(productB.price);
    const qtyB = parseFloat(productB.quantity);

    if (
      (productA.price.trim() !== '' && (Number.isNaN(priceA) || priceA <= 0)) ||
      (productA.quantity.trim() !== '' && (Number.isNaN(qtyA) || qtyA <= 0)) ||
      (productB.price.trim() !== '' && (Number.isNaN(priceB) || priceB <= 0)) ||
      (productB.quantity.trim() !== '' && (Number.isNaN(qtyB) || qtyB <= 0))
    ) {
      setValidationError(
        'If entering Price or Quantity, please use a positive number (or leave blank to skip Quality ROI).'
      );
      return;
    }

    setIsComparing(true);

    const aiAnnotationsMap: Record<string, AiIngredientAnnotation> = {};

    try {
      // Find any ingredients not already in our deterministic database to query against the 9 allowed authorities
      const unknownIngredients = Array.from(
        new Set([...listA, ...listB].filter((i) => !isKnownLocally(i)))
      );

      if (unknownIngredients.length > 0) {
        const response = await fetch('/api/evaluate-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: unknownIngredients,
            category:
              productA.category === productB.category
                ? productA.category
                : `${productA.category} and ${productB.category}`
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.evaluations)) {
            for (const ev of data.evaluations as AiIngredientAnnotation[]) {
              if (ev.ingredientName) {
                aiAnnotationsMap[ev.ingredientName.toLowerCase().trim()] = ev;
              }
            }
          }
        }
      }
    } catch {
      // If offline or API unreachable, deterministic local registries + "No authoritative data found" rule still apply cleanly
    }

    const generated = buildComparisonReport(
      productA,
      productB,
      glossary,
      aiAnnotationsMap
    );
    setReport(generated);
    setIsComparing(false);
  };

  useEffect(() => {
    if (report && reportSectionRef.current) {
      reportSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [report]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 cursor-pointer"
          >
            Know Your Product
          </button>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'studio'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-teal-700'
                  : 'hover:text-slate-900 hover:underline underline-offset-8'
              }`}
            >
              Comparison Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('glossary')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'glossary'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-teal-700'
                  : 'hover:text-slate-900 hover:underline underline-offset-8'
              }`}
            >
              Claims Glossary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('additives')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'additives'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-teal-700'
                  : 'hover:text-slate-900 hover:underline underline-offset-8'
              }`}
            >
              Additives Registry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'sources'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-teal-700'
                  : 'hover:text-slate-900 hover:underline underline-offset-8'
              }`}
            >
              Source Rules
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleResetComparison}
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Comparison
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar (visible only on small screens) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'studio', label: 'Comparison Studio' },
            { id: 'glossary', label: 'Claims Glossary' },
            { id: 'additives', label: 'Additives Registry' },
            { id: 'sources', label: 'Source Rules' }
          ] as { id: ActiveNavTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Container (1440px desktop presence) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-10">
        {activeTab === 'studio' && (
          <>
            {/* Intro / Methodology Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="text-xs font-medium text-slate-500">
                  Evidence-Based Consumer Label Audit · 9 Allowed Regulatory
                  Bodies · Zero Journalism Ratings
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Compare Two Products Side by Side
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload front and back packaging photos, enter a product URL or
                  barcode, or type label details below. Every ingredient and
                  packaging claim is audited against FDA, USDA, EPA, CDC, NIH,
                  EFSA, WHO/IARC, Codex Alimentarius, and FSSAI registries to
                  compute the <strong>Wellbeing Index (0–100)</strong> and{' '}
                  <strong>Quality ROI</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 shrink-0 lg:w-80">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-teal-700" />
                  Scoring & Transparency Rules
                </div>
                <p className="text-xs text-slate-600">
                  • <strong>Personal Care Rule (T0.1):</strong> Processing Level
                  & Nutrition Balance are marked{' '}
                  <span className="font-mono">N/A</span>.
                </p>
                <p className="text-xs text-slate-600">
                  • <strong>No-Guessing Rule (T6.4):</strong> Blurry or cut-off
                  labels are flagged explicitly rather than guessed.
                </p>
                <p className="text-xs text-slate-600">
                  • <strong>Quality ROI (T4.4):</strong>{' '}
                  <span className="font-mono tabular-nums">
                    Wellbeing ÷ Price ÷ Qty × 100
                  </span>
                </p>
              </div>
            </div>

            {/* Dual Product Input Grid (Blank Comparison Slate) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <ProductInputCard
                product={productA}
                onChange={setProductA}
                onClearSlot={() => setProductA(createEmptyProductInput('A'))}
              />
              <ProductInputCard
                product={productB}
                onChange={setProductB}
                onClearSlot={() => setProductB(createEmptyProductInput('B'))}
              />
            </div>

            {/* Action Bar to Generate 5-Section Report */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900">
                  Ready to Run the 5-Section Regulatory Comparison?
                </div>
                <p className="text-xs text-slate-500">
                  Audits ingredient safety, plastic/endocrine concerns,
                  packaging claims, Wellbeing Index, and Quality ROI.
                </p>
              </div>

              <button
                type="button"
                disabled={isComparing}
                onClick={handleRunComparison}
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auditing Registries & Computing Scores...
                  </>
                ) : (
                  <>
                    Generate 5-Section Comparison Report
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {validationError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Five-Section Comparison Report Output */}
            {report && (
              <div ref={reportSectionRef} className="pt-4 space-y-6">
                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-teal-900">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>
                      Five-Section Comparison Report generated using official
                      regulatory citations.
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    Report ID: {report.id}
                  </span>
                </div>

                <ComparisonReportView report={report} />
              </div>
            )}
          </>
        )}

        {activeTab === 'glossary' && (
          <ClaimsGlossaryView
            glossary={glossary}
            onAddTerm={handleAddGlossaryTerm}
          />
        )}

        {activeTab === 'additives' && <AdditivesRegistryView />}

        {activeTab === 'sources' && <SourceRulesView />}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-5 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Know Your Product — Evidence-Based Label & Ingredient Comparison
          </div>
          <div>
            Allowed Sources: FDA · USDA · EPA · CDC · NIH · EFSA · WHO/IARC ·
            Codex Alimentarius · FSSAI
          </div>
        </div>
      </footer>
    </div>
  );
}

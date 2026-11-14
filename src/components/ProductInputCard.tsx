import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileWarning,
  Link2,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react';
import { InputMode, ProductCategory, ProductInput } from '../types/product';

interface ProductInputCardProps {
  product: ProductInput;
  onChange: (updated: ProductInput) => void;
  onClearSlot: () => void;
}

export const ProductInputCard: React.FC<ProductInputCardProps> = ({
  product,
  onChange,
  onClearSlot
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [customUnreadableNote, setCustomUnreadableNote] = useState('');

  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);

  const updateField = <K extends keyof ProductInput>(
    key: K,
    value: ProductInput[K]
  ) => {
    onChange({
      ...product,
      [key]: value
    });
  };

  const handlePhotoUpload = (
    side: 'front' | 'back',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      if (side === 'front') {
        onChange({
          ...product,
          frontPhotoBase64: base64,
          frontPhotoName: file.name
        });
      } else {
        onChange({
          ...product,
          backPhotoBase64: base64,
          backPhotoName: file.name
        });
      }
      setExtractError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractWithGemini = async () => {
    if (
      !product.frontPhotoBase64 &&
      !product.backPhotoBase64 &&
      !product.weblinkOrBarcode.trim()
    ) {
      setExtractError(
        'Upload at least one label photo or enter a product URL / barcode before running extraction.'
      );
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      const response = await fetch('/api/extract-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontPhotoBase64: product.frontPhotoBase64,
          backPhotoBase64: product.backPhotoBase64,
          weblinkOrBarcode: product.weblinkOrBarcode,
          categoryHint: product.category
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe product label.');
      }

      const detectedCategory: ProductCategory =
        data.detectedCategory === 'personal_care' ||
        data.detectedCategory === 'supplement' ||
        data.detectedCategory === 'food'
          ? data.detectedCategory
          : product.category;

      onChange({
        ...product,
        brand: data.brand || product.brand,
        name: data.productName || product.name,
        category: detectedCategory,
        claimsRaw:
          Array.isArray(data.claims) && data.claims.length > 0
            ? data.claims.join(', ')
            : product.claimsRaw,
        ingredientsRaw:
          Array.isArray(data.ingredients) && data.ingredients.length > 0
            ? data.ingredients.join(', ')
            : product.ingredientsRaw,
        nutrition: {
          servingSize: data.servingSize || product.nutrition.servingSize,
          calories:
            typeof data.calories === 'number'
              ? data.calories
              : product.nutrition.calories,
          addedSugarsGrams:
            typeof data.addedSugarsGrams === 'number'
              ? data.addedSugarsGrams
              : product.nutrition.addedSugarsGrams,
          sodiumMg:
            typeof data.sodiumMg === 'number'
              ? data.sodiumMg
              : product.nutrition.sodiumMg,
          fiberGrams:
            typeof data.fiberGrams === 'number'
              ? data.fiberGrams
              : product.nutrition.fiberGrams,
          proteinGrams:
            typeof data.proteinGrams === 'number'
              ? data.proteinGrams
              : product.nutrition.proteinGrams,
          saturatedFatGrams:
            typeof data.saturatedFatGrams === 'number'
              ? data.saturatedFatGrams
              : product.nutrition.saturatedFatGrams
        },
        unreadableFlags: Array.isArray(data.unreadableFlags)
          ? data.unreadableFlags
          : product.unreadableFlags
      });

      setExtractSuccess(
        Array.isArray(data.unreadableFlags) && data.unreadableFlags.length > 0
          ? 'Label extracted with unreadable section warnings — please review flagged areas below.'
          : 'Label fields extracted from input. Verify price and quantity below.'
      );
    } catch (err: unknown) {
      setExtractError(
        err instanceof Error
          ? err.message
          : 'Unable to extract label automatically. You can type or edit the fields directly below.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddUnreadableFlag = () => {
    const trimmed = customUnreadableNote.trim();
    if (!trimmed) return;
    updateField('unreadableFlags', [...product.unreadableFlags, trimmed]);
    setCustomUnreadableNote('');
  };

  const handleRemoveUnreadableFlag = (idx: number) => {
    updateField(
      'unreadableFlags',
      product.unreadableFlags.filter((_, i) => i !== idx)
    );
  };

  const showPhotoSection =
    product.inputMode === 'photo' || product.inputMode === 'hybrid';
  const showLinkSection =
    product.inputMode === 'link_barcode' || product.inputMode === 'hybrid';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between h-full">
      <div className="space-y-5">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Comparison Slot {product.slot} ·{' '}
              {product.category === 'personal_care'
                ? 'Personal Care (Processing & Nutrition = N/A)'
                : product.category === 'supplement'
                  ? 'Dietary Supplement'
                  : 'Food & Beverage'}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
              {product.name.trim()
                ? `${product.brand ? `${product.brand} — ` : ''}${product.name}`
                : `Product ${product.slot} Intake`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClearSlot}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Slot
          </button>
        </div>

        {/* Category & Input Scenario Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Product Category (T0.1 Rule)
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'personal_care', label: 'Personal Care' },
                  { id: 'food', label: 'Food' },
                  { id: 'supplement', label: 'Supplement' }
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateField('category', cat.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    product.category === cat.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Input Method (T6.3)
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'hybrid', label: 'Hybrid' },
                  { id: 'photo', label: 'Photos' },
                  { id: 'link_barcode', label: 'URL / Code' }
                ] as { id: InputMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateField('inputMode', m.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    product.inputMode === m.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Photo Upload Dropzones (Front & Back per T6.1) */}
        {showPhotoSection && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-700" />
                Front & Back Label Photos (Multimodal OCR)
              </span>
              <span className="text-xs text-slate-500">
                No-Guessing Rule Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Front Photo */}
              <div className="border border-dashed border-slate-300 bg-white rounded-lg p-3 flex flex-col justify-between">
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload('front', e)}
                />
                {product.frontPhotoBase64 ? (
                  <div className="space-y-2">
                    <img
                      src={product.frontPhotoBase64}
                      alt={`Product ${product.slot} front label`}
                      referrerPolicy="no-referrer"
                      className="w-full h-24 object-cover rounded border border-slate-200"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600 truncate">
                        {product.frontPhotoName || 'Front label loaded'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({
                            ...product,
                            frontPhotoBase64: undefined,
                            frontPhotoName: undefined
                          });
                        }}
                        className="text-xs text-red-600 hover:underline whitespace-nowrap shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => frontInputRef.current?.click()}
                    className="w-full py-4 flex flex-col items-center justify-center text-center gap-1 text-slate-600 hover:text-slate-900"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium">
                      Upload Front Label
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Brand & marketing claims
                    </span>
                  </button>
                )}
              </div>

              {/* Back Photo */}
              <div className="border border-dashed border-slate-300 bg-white rounded-lg p-3 flex flex-col justify-between">
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload('back', e)}
                />
                {product.backPhotoBase64 ? (
                  <div className="space-y-2">
                    <img
                      src={product.backPhotoBase64}
                      alt={`Product ${product.slot} back label`}
                      referrerPolicy="no-referrer"
                      className="w-full h-24 object-cover rounded border border-slate-200"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600 truncate">
                        {product.backPhotoName || 'Back label loaded'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({
                            ...product,
                            backPhotoBase64: undefined,
                            backPhotoName: undefined
                          });
                        }}
                        className="text-xs text-red-600 hover:underline whitespace-nowrap shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => backInputRef.current?.click()}
                    className="w-full py-4 flex flex-col items-center justify-center text-center gap-1 text-slate-600 hover:text-slate-900"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium">
                      Upload Back Label
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ingredients & nutrition panel
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weblink / Barcode Input (T6.3) */}
        {showLinkSection && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Product Weblink, Barcode (UPC/EAN), or Raw Label Snippet
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={product.weblinkOrBarcode}
                  onChange={(e) =>
                    updateField('weblinkOrBarcode', e.target.value)
                  }
                  placeholder="Paste product URL, UPC barcode, or store listing text..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* Gemini OCR Extraction Action Button */}
        {(showPhotoSection || showLinkSection) && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isExtracting}
              onClick={handleExtractWithGemini}
              className="w-full py-2 px-4 text-xs font-medium text-teal-900 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reading Label via Gemini Multimodal OCR...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                  Extract Fields from Photo / Link (No-Guessing OCR)
                </>
              )}
            </button>

            {extractError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{extractError}</span>
              </div>
            )}

            {extractSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{extractSuccess}</span>
              </div>
            )}
          </div>
        )}

        {/* Brand & Product Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Brand / Manufacturer
            </label>
            <input
              type="text"
              value={product.brand}
              onChange={(e) => updateField('brand', e.target.value)}
              placeholder="e.g., Whole Foods 365, Sri Sri Tattva"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={product.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Protein Shampoo, Daily Cleanser"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        {/* Price & Quantity Inputs for Quality ROI (Optional) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-800">
              Price & Net Quantity (Optional — Enables Quality ROI)
            </span>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              ROI = Index ÷ Price ÷ Qty × 100
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Price ($ USD, optional)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={product.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="Optional (e.g. 8.99)"
                className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Quantity / Size (optional)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={product.quantity}
                onChange={(e) => updateField('quantity', e.target.value)}
                placeholder="Optional (e.g. 12)"
                className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Unit
              </label>
              <select
                value={product.quantityUnit}
                onChange={(e) =>
                  updateField(
                    'quantityUnit',
                    e.target.value as ProductInput['quantityUnit']
                  )
                }
                className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              >
                <option value="fl oz">fl oz</option>
                <option value="oz">oz</option>
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="servings">servings</option>
                <option value="count">count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Packaging Claims Made (T6.2, T7.3) */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Packaging Claims Made (Comma-separated)
          </label>
          <input
            type="text"
            value={product.claimsRaw}
            onChange={(e) => updateField('claimsRaw', e.target.value)}
            placeholder="e.g., Organic, Natural, Non-GMO, Paraben-Free, Dermatologist Tested"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
          />
        </div>

        {/* Ordered Ingredients List (T6.2, T7.2) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-700">
              Full Ingredient List in Label Order (Comma-separated) *
            </label>
            <span className="text-[11px] text-slate-500">
              Top 5 carry higher weight
            </span>
          </div>
          <textarea
            rows={4}
            value={product.ingredientsRaw}
            onChange={(e) => updateField('ingredientsRaw', e.target.value)}
            placeholder="Enter ingredients in exact order from packaging (e.g., Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Fragrance, Methylparaben...)"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
          />
        </div>

        {/* Nutrition Panel (Only for Food / Supplements per T0.1) */}
        {product.category !== 'personal_care' && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
                Nutrition / Supplement Panel Per Serving (T6.2)
              </span>
              <input
                type="text"
                value={product.nutrition.servingSize}
                onChange={(e) =>
                  updateField('nutrition', {
                    ...product.nutrition,
                    servingSize: e.target.value
                  })
                }
                placeholder="Serving size (e.g., 1 cup / 30g)"
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded w-44"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">
                  Calories
                </label>
                <input
                  type="number"
                  min="0"
                  value={product.nutrition.calories ?? ''}
                  onChange={(e) =>
                    updateField('nutrition', {
                      ...product.nutrition,
                      calories: e.target.value ? Number(e.target.value) : undefined
                    })
                  }
                  placeholder="120"
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">
                  Added Sugar (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={product.nutrition.addedSugarsGrams ?? ''}
                  onChange={(e) =>
                    updateField('nutrition', {
                      ...product.nutrition,
                      addedSugarsGrams: e.target.value
                        ? Number(e.target.value)
                        : undefined
                    })
                  }
                  placeholder="0"
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">
                  Sodium (mg)
                </label>
                <input
                  type="number"
                  min="0"
                  value={product.nutrition.sodiumMg ?? ''}
                  onChange={(e) =>
                    updateField('nutrition', {
                      ...product.nutrition,
                      sodiumMg: e.target.value ? Number(e.target.value) : undefined
                    })
                  }
                  placeholder="95"
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">
                  Fiber (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={product.nutrition.fiberGrams ?? ''}
                  onChange={(e) =>
                    updateField('nutrition', {
                      ...product.nutrition,
                      fiberGrams: e.target.value ? Number(e.target.value) : undefined
                    })
                  }
                  placeholder="4"
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">
                  Protein (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={product.nutrition.proteinGrams ?? ''}
                  onChange={(e) =>
                    updateField('nutrition', {
                      ...product.nutrition,
                      proteinGrams: e.target.value
                        ? Number(e.target.value)
                        : undefined
                    })
                  }
                  placeholder="8"
                  className="w-full px-2 py-1 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Unreadable Label Rule Section (Task T6.4: Say so instead of guessing) */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-amber-700" />
              Unreadable Label Disclosure (Task T6.4 No-Guessing Rule)
            </span>
          </div>
          {product.unreadableFlags.length > 0 && (
            <ul className="space-y-1">
              {product.unreadableFlags.map((flag, idx) => (
                <li
                  key={idx}
                  className="text-xs text-amber-900 bg-white border border-amber-200 rounded px-2.5 py-1.5 flex items-center justify-between gap-2"
                >
                  <span>{flag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnreadableFlag(idx)}
                    className="text-[11px] text-slate-500 hover:text-red-600 whitespace-nowrap shrink-0"
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customUnreadableNote}
              onChange={(e) => setCustomUnreadableNote(e.target.value)}
              placeholder="If any label text is torn/blurry, record it here instead of guessing..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded focus:outline-none focus:border-amber-600"
            />
            <button
              type="button"
              onClick={handleAddUnreadableFlag}
              className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Flag Unreadable Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

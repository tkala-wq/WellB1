import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function fetchWebpageSnapshot(rawUrl: string): Promise<string> {
  try {
    const urlMatch = rawUrl.match(/https?:\/\/[^\s]+/i);
    const targetUrl = urlMatch
      ? urlMatch[0]
      : rawUrl.startsWith('www.')
        ? `https://${rawUrl}`
        : null;
    if (!targetUrl) return '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) return '';
    const html = await response.text();

    // Extract JSON-LD structured product blocks if present
    const jsonLdMatches = Array.from(
      html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    ).map((m) => m[1].trim());

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
    );

    // Strip script/style tags and condense visible text
    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);

    return [
      titleMatch ? `Page Title: ${titleMatch[1].trim()}` : '',
      metaDescMatch ? `Meta Description: ${metaDescMatch[1].trim()}` : '',
      jsonLdMatches.length > 0
        ? `JSON-LD Product Data:\n${jsonLdMatches.join('\n').slice(0, 6000)}`
        : '',
      visibleText ? `Page Content Excerpt:\n${visibleText}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');
  } catch {
    return '';
  }
}

interface BarcodeRegistryResult {
  barcode: string;
  brand: string;
  productName: string;
  detectedCategory: 'food' | 'supplement' | 'personal_care';
  quantity: number;
  quantityUnit: 'fl oz' | 'oz' | 'ml' | 'g' | 'lb' | 'servings' | 'count';
  claims: string[];
  ingredients: string[];
  servingSize: string;
  calories?: number;
  addedSugarsGrams?: number;
  sodiumMg?: number;
  fiberGrams?: number;
  proteinGrams?: number;
  saturatedFatGrams?: number;
  sourceUrl?: string;
}

function parseQuantityString(rawQty: string): {
  quantity: number;
  quantityUnit: 'fl oz' | 'oz' | 'ml' | 'g' | 'lb' | 'servings' | 'count';
} {
  if (!rawQty) return { quantity: 0, quantityUnit: 'oz' };
  const match = rawQty.match(
    /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz|ml|g|lb|servings|count|ct|caps|tablets)/i
  );
  if (!match) return { quantity: 0, quantityUnit: 'oz' };
  const val = parseFloat(match[1]) || 0;
  const unitRaw = match[2].toLowerCase().replace(/\s+/g, ' ');
  if (unitRaw.includes('fl')) return { quantity: val, quantityUnit: 'fl oz' };
  if (unitRaw === 'oz') return { quantity: val, quantityUnit: 'oz' };
  if (unitRaw === 'ml') return { quantity: val, quantityUnit: 'ml' };
  if (unitRaw === 'g') return { quantity: val, quantityUnit: 'g' };
  if (unitRaw === 'lb') return { quantity: val, quantityUnit: 'lb' };
  if (unitRaw === 'servings') return { quantity: val, quantityUnit: 'servings' };
  return { quantity: val, quantityUnit: 'count' };
}

async function fetchOpenProductFactsByBarcode(
  rawInput: string,
  categoryHint?: string
): Promise<BarcodeRegistryResult | null> {
  const digitsMatch = rawInput.match(/\b(\d{8,14})\b/);
  if (!digitsMatch) return null;
  const barcode = digitsMatch[1];

  const endpoints = [
    {
      url: `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      defaultCat: 'food' as const,
      siteUrl: `https://world.openfoodfacts.org/product/${barcode}`
    },
    {
      url: `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`,
      defaultCat: 'personal_care' as const,
      siteUrl: `https://world.openbeautyfacts.org/product/${barcode}`
    },
    {
      url: `https://world.openproductsfacts.org/api/v2/product/${barcode}.json`,
      defaultCat: (categoryHint === 'personal_care' ||
      categoryHint === 'supplement'
        ? categoryHint
        : 'food') as 'food' | 'supplement' | 'personal_care',
      siteUrl: `https://world.openproductsfacts.org/product/${barcode}`
    }
  ];

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(ep.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'KnowYourProduct/1.0' }
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        status?: number;
        product?: Record<string, unknown>;
      };
      if (data && data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = (p.nutriments || {}) as Record<string, unknown>;
        const rawIngredients = String(
          p.ingredients_text_en || p.ingredients_text || ''
        ).trim();
        const ingredients = rawIngredients
          ? rawIngredients
              .split(/,(?![^()[\]]*[)\]])/)
              .map((s) => s.replace(/^[_*]+|[_*]+$/g, '').trim())
              .filter(Boolean)
          : [];

        const rawLabels = String(p.labels || '').trim();
        const claims = rawLabels
          ? rawLabels
              .split(',')
              .map((s) => s.replace(/^[a-z]{2}:/i, '').trim())
              .filter(Boolean)
          : [];

        const categoriesLower = String(p.categories || '').toLowerCase();
        let detectedCategory: 'food' | 'supplement' | 'personal_care' =
          ep.defaultCat;
        if (
          categoriesLower.includes('shampoo') ||
          categoriesLower.includes('cosmetic') ||
          categoriesLower.includes('lotion') ||
          categoriesLower.includes('soap') ||
          categoriesLower.includes('skin') ||
          categoriesLower.includes('beauty')
        ) {
          detectedCategory = 'personal_care';
        } else if (
          categoriesLower.includes('supplement') ||
          categoriesLower.includes('vitamin')
        ) {
          detectedCategory = 'supplement';
        }

        const parsedQty = parseQuantityString(String(p.quantity || ''));
        const numOrUndef = (v: unknown): number | undefined =>
          typeof v === 'number' && !Number.isNaN(v) ? v : undefined;

        return {
          barcode,
          brand: String(p.brands || '').split(',')[0].trim(),
          productName: String(
            p.product_name_en || p.product_name || ''
          ).trim(),
          detectedCategory,
          quantity: parsedQty.quantity,
          quantityUnit: parsedQty.quantityUnit,
          claims,
          ingredients,
          servingSize: String(p.serving_size || ''),
          calories: numOrUndef(
            nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g']
          ),
          addedSugarsGrams: numOrUndef(
            nutriments.sugars_serving ?? nutriments.sugars_100g
          ),
          sodiumMg:
            typeof nutriments.sodium_serving === 'number'
              ? Math.round(Number(nutriments.sodium_serving) * 1000)
              : typeof nutriments.sodium_100g === 'number'
                ? Math.round(Number(nutriments.sodium_100g) * 1000)
                : undefined,
          fiberGrams: numOrUndef(
            nutriments.fiber_serving ?? nutriments.fiber_100g
          ),
          proteinGrams: numOrUndef(
            nutriments.proteins_serving ?? nutriments.proteins_100g
          ),
          saturatedFatGrams: numOrUndef(
            nutriments['saturated-fat_serving'] ??
              nutriments['saturated-fat_100g']
          ),
          sourceUrl: ep.siteUrl
        };
      }
    } catch {
      // try next registry
    }
  }

  // Fallback to UPCitemdb free lookup for general retail barcodes
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const upcRes = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      }
    );
    clearTimeout(timeout);
    if (upcRes.ok) {
      const upcData = (await upcRes.json()) as {
        items?: Array<{
          title?: string;
          brand?: string;
          description?: string;
          category?: string;
          size?: string;
        }>;
      };
      const item = upcData.items?.[0];
      if (item && (item.title || item.brand)) {
        const parsedQty = parseQuantityString(item.size || item.title || '');
        const catLower = `${item.category || ''} ${item.title || ''}`.toLowerCase();
        const detectedCategory: 'food' | 'supplement' | 'personal_care' =
          catLower.includes('health & beauty') ||
          catLower.includes('personal care') ||
          catLower.includes('shampoo') ||
          catLower.includes('lotion') ||
          catLower.includes('cleanser') ||
          catLower.includes('soap')
            ? 'personal_care'
            : catLower.includes('supplement') || catLower.includes('vitamin')
              ? 'supplement'
              : (categoryHint as 'food' | 'supplement' | 'personal_care') ||
                'food';

        return {
          barcode,
          brand: (item.brand || '').trim(),
          productName: (item.title || '').trim(),
          detectedCategory,
          quantity: parsedQty.quantity,
          quantityUnit: parsedQty.quantityUnit,
          claims: [],
          ingredients: [],
          servingSize: '',
          sourceUrl: `https://www.upcitemdb.com/upc/${barcode}`
        };
      }
    }
  } catch {
    // ignore UPCitemdb error
  }

  return null;
}

function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.toLowerCase().includes('quota') ||
    msg.toLowerCase().includes('rate limit')
  );
}

async function generateJsonWithModelFallback(
  ai: GoogleGenAI,
  contents: unknown,
  systemInstruction: string,
  responseSchema?: Record<string, unknown>
): Promise<{ text: string; modelUsed: string }> {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents as Parameters<
          typeof ai.models.generateContent
        >[0]['contents'],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          ...(responseSchema ? { responseSchema } : {})
        }
      });
      return {
        text: response.text ?? '{}',
        modelUsed: modelName
      };
    } catch (err: unknown) {
      lastError = err;
      if (!isQuotaOrRateLimitError(err)) {
        // Still try fallback model just in case
        continue;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed.');
}

function parseJsonFromModelText(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse structured JSON from model output.');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Endpoint 1: Multimodal Label OCR + Single Barcode Photo + Live Weblink Extraction (Tasks T6.1 - T6.4)
  app.post('/api/extract-label', async (req, res) => {
    try {
      const {
        frontPhotoBase64,
        backPhotoBase64,
        weblinkOrBarcode,
        categoryHint
      } = req.body as {
        frontPhotoBase64?: string;
        backPhotoBase64?: string;
        weblinkOrBarcode?: string;
        categoryHint?: string;
      };

      const trimmedLink = (weblinkOrBarcode || '').trim();
      let webpageSnapshot = '';
      let barcodeMatch: BarcodeRegistryResult | null = null;

      if (trimmedLink) {
        const [snapshot, barcodeInfo] = await Promise.all([
          fetchWebpageSnapshot(trimmedLink),
          fetchOpenProductFactsByBarcode(trimmedLink, categoryHint)
        ]);
        webpageSnapshot = snapshot;
        barcodeMatch = barcodeInfo;
      }

      // Fast path: If a barcode was decoded on the client (or entered directly) AND Open Product Facts already has the full ingredients & product name, and there is no back label photo that needs OCR, return immediately with zero Gemini quota used!
      if (
        barcodeMatch &&
        barcodeMatch.productName &&
        barcodeMatch.ingredients.length > 0 &&
        !backPhotoBase64
      ) {
        res.json({
          detectedBarcode: barcodeMatch.barcode,
          brand: barcodeMatch.brand,
          productName: barcodeMatch.productName,
          detectedCategory: barcodeMatch.detectedCategory,
          price: 0,
          quantity: barcodeMatch.quantity,
          quantityUnit: barcodeMatch.quantityUnit,
          claims: barcodeMatch.claims,
          ingredients: barcodeMatch.ingredients,
          servingSize: barcodeMatch.servingSize,
          calories: barcodeMatch.calories ?? 0,
          addedSugarsGrams: barcodeMatch.addedSugarsGrams ?? 0,
          sodiumMg: barcodeMatch.sodiumMg ?? 0,
          fiberGrams: barcodeMatch.fiberGrams ?? 0,
          proteinGrams: barcodeMatch.proteinGrams ?? 0,
          saturatedFatGrams: barcodeMatch.saturatedFatGrams ?? 0,
          unreadableFlags: [
            `Barcode ${barcodeMatch.barcode} matched in Open Product Facts registry — verify against your physical package in case of recent formula changes.`
          ],
          sourceUrls: barcodeMatch.sourceUrl ? [barcodeMatch.sourceUrl] : []
        });
        return;
      }

      const ai = getGenAIClient();
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      const addImagePart = (dataUrl: string, labelDesc: string) => {
        const match = dataUrl.match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );
        if (match) {
          parts.push({ text: `Attached ${labelDesc}:` });
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      };

      if (frontPhotoBase64) {
        addImagePart(
          frontPhotoBase64,
          'Packaging / Barcode Photo 1 (Front label, product title, or UPC/EAN barcode)'
        );
      }
      if (backPhotoBase64) {
        addImagePart(
          backPhotoBase64,
          'Packaging / Barcode Photo 2 (Back ingredient list, nutrition panel, or UPC/EAN barcode)'
        );
      }

      const promptText = `You are a regulatory label & barcode specification specialist for the "Know Your Product" consumer transparency application.
Extract the complete product details from the provided packaging/barcode photo(s) and/or product weblink, barcode, or product query.

SINGLE BARCODE PHOTO & REGISTRY RULES:
1. If a barcode (UPC / EAN / GTIN) is visible in the photo, transcribe its exact digits into "detectedBarcode".
2. Transcribe all visible brand names, product names, marketing claims, ordered ingredients, and nutrition facts from the photo(s), webpage snapshot, or barcode registry match below.
3. STRICT NO-GUESSING RULE (Task T6.4): Never invent or guess ingredients that are not shown in the photo, webpage snapshot, or barcode registry match. If the photo only shows a barcode or front label without an ingredient list, leave "ingredients": [] so the server can look up the detectedBarcode in official barcode registries, or flag it in "unreadableFlags".

${trimmedLink ? `USER WEBLINK / BARCODE / QUERY: "${trimmedLink}"` : ''}
${
  barcodeMatch
    ? `\nBARCODE REGISTRY MATCH:\n${JSON.stringify(barcodeMatch, null, 2)}\n`
    : ''
}
${
  webpageSnapshot
    ? `\nDIRECT WEBPAGE SNAPSHOT FROM URL:\n${webpageSnapshot}\n`
    : ''
}
Category hint: ${categoryHint || 'auto-detect'}

Return ONLY a valid JSON object matching this exact structure:
{
  "detectedBarcode": "string (digits if a barcode was read or provided, else empty string)",
  "brand": "string",
  "productName": "string",
  "detectedCategory": "food" | "supplement" | "personal_care",
  "price": number (0 if not found),
  "quantity": number (0 if not found),
  "quantityUnit": "fl oz" | "oz" | "ml" | "g" | "lb" | "servings" | "count",
  "claims": ["string"],
  "ingredients": ["string"],
  "servingSize": "string",
  "calories": number,
  "addedSugarsGrams": number,
  "sodiumMg": number,
  "fiberGrams": number,
  "proteinGrams": number,
  "saturatedFatGrams": number,
  "unreadableFlags": ["string"]
}`;

      parts.push({ text: promptText });

      let parsed: Record<string, unknown> = {};
      let hitQuotaLimit = false;

      try {
        const { text } = await generateJsonWithModelFallback(
          ai,
          { parts },
          'You transcribe product packaging labels, barcode digits, and webpage product data accurately without guessing illegible or missing text. Always output strictly valid JSON.'
        );
        parsed = parseJsonFromModelText(text);
      } catch (modelErr: unknown) {
        if (isQuotaOrRateLimitError(modelErr)) {
          hitQuotaLimit = true;
          parsed = {
            detectedBarcode: barcodeMatch?.barcode || trimmedLink.match(/\b(\d{8,14})\b/)?.[1] || '',
            brand: barcodeMatch?.brand || '',
            productName: barcodeMatch?.productName || '',
            detectedCategory: barcodeMatch?.detectedCategory || categoryHint || 'food',
            price: 0,
            quantity: barcodeMatch?.quantity || 0,
            quantityUnit: barcodeMatch?.quantityUnit || 'oz',
            claims: barcodeMatch?.claims || [],
            ingredients: barcodeMatch?.ingredients || [],
            servingSize: barcodeMatch?.servingSize || '',
            calories: barcodeMatch?.calories ?? 0,
            addedSugarsGrams: barcodeMatch?.addedSugarsGrams ?? 0,
            sodiumMg: barcodeMatch?.sodiumMg ?? 0,
            fiberGrams: barcodeMatch?.fiberGrams ?? 0,
            proteinGrams: barcodeMatch?.proteinGrams ?? 0,
            saturatedFatGrams: barcodeMatch?.saturatedFatGrams ?? 0,
            unreadableFlags: barcodeMatch?.ingredients?.length
              ? [
                  `Barcode ${barcodeMatch.barcode} loaded via Open Product Facts registry.`
                ]
              : [
                  'Gemini API free-tier rate limit (429) was reached for image OCR. If scanning a barcode, ensure the barcode bars are sharp for local device decoding or paste the 12-digit UPC code directly into the URL / Code box.'
                ]
          };
        } else {
          throw modelErr;
        }
      }

      // If Gemini read a barcode from the photo that we hadn't looked up yet, query Open Product Facts / UPCitemdb now
      const detectedBarcodeStr =
        typeof parsed.detectedBarcode === 'string' && parsed.detectedBarcode.trim()
          ? parsed.detectedBarcode.trim()
          : barcodeMatch?.barcode || '';

      if (detectedBarcodeStr && !barcodeMatch) {
        barcodeMatch = await fetchOpenProductFactsByBarcode(
          detectedBarcodeStr,
          categoryHint
        );
      }

      // Merge any missing fields from barcodeMatch
      if (barcodeMatch) {
        if (!parsed.brand && barcodeMatch.brand) {
          parsed.brand = barcodeMatch.brand;
        }
        if (!parsed.productName && barcodeMatch.productName) {
          parsed.productName = barcodeMatch.productName;
        }
        if (!parsed.quantity && barcodeMatch.quantity) {
          parsed.quantity = barcodeMatch.quantity;
          parsed.quantityUnit = barcodeMatch.quantityUnit;
        }
        if (
          (!Array.isArray(parsed.claims) || parsed.claims.length === 0) &&
          barcodeMatch.claims.length > 0
        ) {
          parsed.claims = barcodeMatch.claims;
        }
        if (
          (!Array.isArray(parsed.ingredients) ||
            parsed.ingredients.length === 0) &&
          barcodeMatch.ingredients.length > 0
        ) {
          parsed.ingredients = barcodeMatch.ingredients;
          const flags = Array.isArray(parsed.unreadableFlags)
            ? (parsed.unreadableFlags as string[])
            : [];
          flags.push(
            `Barcode ${barcodeMatch.barcode} matched in Open Product Facts registry — verify against your physical package in case of recent formula changes.`
          );
          parsed.unreadableFlags = flags;
        }
      }

      // If barcode was read, but neither the photo nor the public barcode registries had the full ingredient list, add a clear No-Guessing Rule note
      if (
        !hitQuotaLimit &&
        detectedBarcodeStr &&
        (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0)
      ) {
        const flags = Array.isArray(parsed.unreadableFlags)
          ? (parsed.unreadableFlags as string[])
          : [];
        const hasBarcodeWarning = flags.some((f) =>
          f.toLowerCase().includes('ingredient')
        );
        if (!hasBarcodeWarning) {
          flags.push(
            `Barcode ${detectedBarcodeStr}${parsed.productName ? ` (${parsed.productName})` : ''} was identified, but its full ingredient list is not yet published in public barcode registries. Please snap a quick photo of the back ingredient list (or paste the ingredients below) — we never guess missing ingredients.`
          );
          parsed.unreadableFlags = flags;
        }
      }

      res.json({
        ...parsed,
        detectedBarcode: detectedBarcodeStr,
        sourceUrls: barcodeMatch?.sourceUrl ? [barcodeMatch.sourceUrl] : []
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to extract product label or barcode.';
      res.status(500).json({ error: message });
    }
  });

  // Endpoint 2: Regulatory Authority Check for Unmapped Ingredients (Tasks T1.1 - T1.5)
  app.post('/api/evaluate-ingredients', async (req, res) => {
    try {
      const { ingredients, category } = req.body as {
        ingredients: string[];
        category: string;
      };

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        res.json({ evaluations: [] });
        return;
      }

      const ai = getGenAIClient();

      const prompt = `Evaluate the following ${category} product ingredients strictly using ONLY the 9 allowed regulatory bodies:
Allowed Bodies: FDA, USDA, EPA, CDC, NIH, EFSA, WHO/IARC, Codex Alimentarius, FSSAI.

STRICT RULES (Tasks T1.1 - T1.5):
1. NEVER cite journalism (such as NYT), blogs, or third-party apps for a risk rating.
2. When two allowed bodies disagree (e.g., EFSA vs FDA), assign the stricter precautionary Risk Tier ('Low', 'Moderate', or 'High') and document both positions inside "conflictResolutionNote".
3. Flag any plastic-related or endocrine-disrupting chemical (phthalates, BPA/BPS, synthetic polymer microplastics, parabens) with "isPlasticOrEndocrineConcern": true.
4. If none of the 9 allowed bodies have published toxicological or regulatory guidance on an ingredient, you MUST set "riskTier": "No authoritative data found" and "primaryAuthority": "None".

Ingredients to evaluate:
${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}`;

      try {
        const { text } = await generateJsonWithModelFallback(
          ai,
          prompt,
          'You are a regulatory toxicology auditor restricted exclusively to FDA, USDA, EPA, CDC, NIH, EFSA, WHO/IARC, Codex Alimentarius, and FSSAI.',
          {
            type: Type.OBJECT,
            properties: {
              evaluations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ingredientName: { type: Type.STRING },
                    riskTier: {
                      type: Type.STRING,
                      description:
                        'Must be one of: Low, Moderate, High, No authoritative data found'
                    },
                    primaryAuthority: {
                      type: Type.STRING,
                      description:
                        'Must be one of: FDA, USDA, EPA, CDC, NIH, EFSA, WHO/IARC, Codex Alimentarius, FSSAI, None'
                    },
                    registryChecked: { type: Type.STRING },
                    regulatoryStatusAndLimit: { type: Type.STRING },
                    isPlasticOrEndocrineConcern: { type: Type.BOOLEAN },
                    sideEffectsSummary: { type: Type.STRING },
                    citationUrl: { type: Type.STRING },
                    conflictResolutionNote: { type: Type.STRING },
                    vulnerableFlags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Subset of: children, pregnancy, allergies'
                    }
                  },
                  required: [
                    'ingredientName',
                    'riskTier',
                    'primaryAuthority',
                    'registryChecked',
                    'regulatoryStatusAndLimit',
                    'isPlasticOrEndocrineConcern',
                    'sideEffectsSummary',
                    'citationUrl',
                    'vulnerableFlags'
                  ]
                }
              }
            },
            required: ['evaluations']
          }
        );

        const parsed = parseJsonFromModelText(text);
        res.json(parsed);
      } catch (innerErr: unknown) {
        if (isQuotaOrRateLimitError(innerErr)) {
          // Gracefully degrade to built-in curated regulatory database so comparison never fails on 429
          res.json({ evaluations: [], quotaFallback: true });
          return;
        }
        throw innerErr;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to evaluate ingredients with Gemini API.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Know Your Product server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

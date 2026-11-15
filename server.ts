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

async function fetchOpenProductFactsByBarcode(rawInput: string): Promise<string> {
  const digitsMatch = rawInput.match(/\b(\d{8,14})\b/);
  if (!digitsMatch) return '';
  const barcode = digitsMatch[1];

  const endpoints = [
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
    `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`,
    `https://world.openproductsfacts.org/api/v2/product/${barcode}.json`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(url, {
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
        return JSON.stringify(
          {
            barcode,
            brand: p.brands || '',
            productName: p.product_name || p.product_name_en || '',
            quantity: p.quantity || '',
            categories: p.categories || '',
            labelsAndClaims: p.labels || '',
            ingredientsText:
              p.ingredients_text_en || p.ingredients_text || '',
            servingSize: p.serving_size || '',
            nutriments: {
              calories:
                nutriments['energy-kcal_serving'] ??
                nutriments['energy-kcal_100g'],
              sugarsGrams:
                nutriments.sugars_serving ?? nutriments.sugars_100g,
              sodiumMg:
                typeof nutriments.sodium_serving === 'number'
                  ? Math.round(Number(nutriments.sodium_serving) * 1000)
                  : undefined,
              fiberGrams:
                nutriments.fiber_serving ?? nutriments.fiber_100g,
              proteinGrams:
                nutriments.proteins_serving ?? nutriments.proteins_100g,
              saturatedFatGrams:
                nutriments['saturated-fat_serving'] ??
                nutriments['saturated-fat_100g']
            }
          },
          null,
          2
        );
      }
    } catch {
      // try next registry
    }
  }
  return '';
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

      const ai = getGenAIClient();
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      const addImagePart = (dataUrl: string, labelDesc: string) => {
        const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
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

      const trimmedLink = (weblinkOrBarcode || '').trim();
      let webpageSnapshot = '';
      let barcodeRegistryData = '';
      if (trimmedLink) {
        const [snapshot, barcodeInfo] = await Promise.all([
          fetchWebpageSnapshot(trimmedLink),
          fetchOpenProductFactsByBarcode(trimmedLink)
        ]);
        webpageSnapshot = snapshot;
        barcodeRegistryData = barcodeInfo;
      }

      const hasWeblinkOrQuery = trimmedLink.length > 0;
      const isSinglePhotoWithoutBack =
        (Boolean(frontPhotoBase64) && !backPhotoBase64) ||
        (!frontPhotoBase64 && Boolean(backPhotoBase64));

      const promptText = `You are a regulatory label & barcode specification specialist for the "Know Your Product" consumer transparency application.
Extract the complete product details from the provided packaging/barcode photo(s) and/or product weblink, barcode, or product query.

SINGLE BARCODE PHOTO & ONLINE LOOKUP CAPABILITY:
- If the user uploaded a photo of a barcode (UPC / EAN / GTIN) or a single product photo that does not show the full printed ingredient list:
  1. Read the exact barcode digits (UPC/EAN) and any visible brand/product text from the photo and put the digits into "detectedBarcode".
  2. Use Google Search grounding to look up that exact barcode number (or brand + product name) on official manufacturer pages, Open Food Facts, Open Beauty Facts, USDA FoodData Central, or major retail listings to retrieve the product's real brand, product name, category, packaging claims, and full declared ingredient list in order.
  3. Add a transparency note to "unreadableFlags" stating: "Ingredients retrieved online via barcode/product lookup — verify against your physical package in case of recent formula changes."
  4. STRICT NO-GUESSING RULE (Task T6.4): Never invent or guess ingredients based on generic product type. If the exact product's official ingredient list is neither visible in the photo nor published online for that barcode, leave "ingredients": [] and add a clear warning in "unreadableFlags" explaining that the barcode was read but the full ingredient list was not published online, so a photo of the back ingredient list is required.

${
  hasWeblinkOrQuery
    ? `USER WEBLINK / BARCODE / PRODUCT QUERY: "${trimmedLink}"
Use URL Context and Google Search grounding to look up this exact product URL, barcode, or product listing.`
    : ''
}
${
  barcodeRegistryData
    ? `\nOPEN PRODUCT FACTS BARCODE REGISTRY MATCH:\n${barcodeRegistryData}\n`
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

      const useSearchGrounding =
        hasWeblinkOrQuery || isSinglePhotoWithoutBack || Boolean(frontPhotoBase64) || Boolean(backPhotoBase64);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: useSearchGrounding
          ? {
              systemInstruction:
                'You extract accurate product specifications, barcode digits, full ingredient lists, packaging claims, price, and net weight/quantity from barcode photos, label photos, and product URLs. Never fabricate ingredients; if an ingredient list is not visible in the photo and cannot be verified online for that exact barcode, leave ingredients empty and explain in unreadableFlags. Always output strictly valid JSON.',
              tools: [{ urlContext: {} }, { googleSearch: {} }]
            }
          : {
              systemInstruction:
                'You transcribe product packaging labels accurately without guessing illegible text. Always populate unreadableFlags if any section cannot be read with certainty.',
              responseMimeType: 'application/json'
            }
      });

      const parsed = parseJsonFromModelText(response.text ?? '{}');

      // If Gemini read a barcode from the photo and we didn't have barcodeRegistryData earlier, check Open Product Facts as a fallback if ingredients or productName are still missing
      const detectedBarcodeStr =
        typeof parsed.detectedBarcode === 'string'
          ? parsed.detectedBarcode.trim()
          : '';
      if (
        detectedBarcodeStr &&
        !barcodeRegistryData &&
        (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0)
      ) {
        const fallbackBarcodeJson =
          await fetchOpenProductFactsByBarcode(detectedBarcodeStr);
        if (fallbackBarcodeJson) {
          try {
            const fb = JSON.parse(fallbackBarcodeJson) as {
              brand?: string;
              productName?: string;
              ingredientsText?: string;
              labelsAndClaims?: string;
            };
            if (!parsed.brand && fb.brand) parsed.brand = fb.brand;
            if (!parsed.productName && fb.productName)
              parsed.productName = fb.productName;
            if (
              (!Array.isArray(parsed.ingredients) ||
                parsed.ingredients.length === 0) &&
              fb.ingredientsText
            ) {
              parsed.ingredients = fb.ingredientsText
                .split(/,(?![^()]*\))/)
                .map((s) => s.trim())
                .filter(Boolean);
            }
            if (
              (!Array.isArray(parsed.claims) || parsed.claims.length === 0) &&
              fb.labelsAndClaims
            ) {
              parsed.claims = fb.labelsAndClaims
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } catch {
            // ignore fallback parse error
          }
        }
      }

      // Extract grounding web links if available
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sourceUrls = groundingChunks
        .map((c: { web?: { uri?: string; title?: string } }) => c.web?.uri)
        .filter(Boolean);

      res.json({
        ...parsed,
        sourceUrls
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to extract product label or weblink via Gemini API.';
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

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a regulatory toxicology auditor restricted exclusively to FDA, USDA, EPA, CDC, NIH, EFSA, WHO/IARC, Codex Alimentarius, and FSSAI.',
          responseMimeType: 'application/json',
          responseSchema: {
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
        }
      });

      const parsed = JSON.parse((response.text ?? '{"evaluations":[]}').trim());
      res.json(parsed);
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

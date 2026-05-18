import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pg;

const app = express();
const PORT = Number(process.env.PORT || 3000);
const rootDist = path.join(__dirname, 'dist', 'home');
const pricingDist = path.join(__dirname, 'apps', 'pricing-sticker', 'dist');
const productDist = path.join(__dirname, 'apps', 'product-description', 'dist');
const reviewDist = path.join(__dirname, 'apps', 'review-generator', 'dist');
const pricingCalculatorDist = path.join(__dirname, 'apps', 'pricing-calculator', 'dist');
const upload = multer({ storage: multer.memoryStorage() });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '9990019572Hh@';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'hallstatt-local-admin-session';
const ADMIN_SESSION_TOKEN = crypto
  .createHash('sha256')
  .update(`${ADMIN_PASSWORD}:${ADMIN_SESSION_SECRET}`)
  .digest('hex');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const rawOpenAIModel = process.env.PRODUCT_OPENAI_MODEL || process.env.OPENAI_MODEL || '';
const PRODUCT_OPENAI_MODEL = rawOpenAIModel
  ? rawOpenAIModel.includes('/')
    ? rawOpenAIModel
    : `openai/${rawOpenAIModel}`
  : '';
const PRODUCT_OPENROUTER_MODEL = process.env.PRODUCT_OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const PRODUCT_OPENROUTER_FALLBACK_MODELS =
  process.env.PRODUCT_OPENROUTER_FALLBACK_MODELS || process.env.OPENROUTER_FALLBACK_MODELS || '';
const PRODUCT_OPENROUTER_SITE_NAME =
  process.env.PRODUCT_OPENROUTER_SITE_NAME || process.env.OPENROUTER_SITE_NAME || 'ProductCopy AI';
const MAX_ROUTE_MODELS = 3;
let nextProductKeyIndex = 0;

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_REVIEW_OPENROUTER_MODEL = 'openrouter/free';
const DEFAULT_REVIEW_OPENROUTER_FALLBACK_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
];

async function initializePricingCalculatorDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found. Pricing calculator product lookup will return an empty list.');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        sku TEXT PRIMARY KEY,
        cogs NUMERIC NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.error('Failed to initialize pricing calculator database:', error);
  }
}

function isAdminAuthenticated(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie === `hallstatt_admin=${ADMIN_SESSION_TOKEN}`);
}

function getProductApiKeys() {
  const rawKeys = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';

  return rawKeys
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function getProductKeyRotationOrder(apiKeys) {
  if (apiKeys.length === 0) {
    return [];
  }

  const startIndex = nextProductKeyIndex % apiKeys.length;
  nextProductKeyIndex = (nextProductKeyIndex + 1) % apiKeys.length;

  return apiKeys.map((_, index) => apiKeys[(startIndex + index) % apiKeys.length]);
}

function getProductModelRoute() {
  const fallbacks = PRODUCT_OPENROUTER_FALLBACK_MODELS.split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0 && model !== PRODUCT_OPENROUTER_MODEL);

  return [PRODUCT_OPENROUTER_MODEL, ...fallbacks].slice(0, MAX_ROUTE_MODELS);
}

function getSiteUrl(req) {
  return process.env.OPENROUTER_SITE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

function extractMessageText(content) {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part === 'object' && 'text' in part) {
          return typeof part.text === 'string' ? part.text : '';
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

async function requestOpenRouter(req, apiKey, body) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': getSiteUrl(req),
      'X-Title': PRODUCT_OPENROUTER_SITE_NAME,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { response, data };
}

function getErrorMessage(response, data) {
  return (
    (data?.error && typeof data.error.message === 'string' && data.error.message) ||
    `OpenRouter request failed with status ${response.status}`
  );
}

async function generateProductDescription(req, url) {
  const apiKeys = getProductApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('Missing OPENROUTER_API_KEYS or OPENROUTER_API_KEY.');
  }

  const modelRoute = getProductModelRoute();
  const messages = [
    {
      role: 'system',
      content:
        'You are an expert ecommerce copywriter. Produce polished, factual, conversion-focused product descriptions.',
    },
    {
      role: 'user',
      content: `Generate a comprehensive, persuasive, and professional product description for the product found at ${url}.

CRITICAL CONSTRAINTS:
1. The description MUST be at least 1000 characters long.
2. The description MUST consist of EXACTLY TWO long, detailed paragraphs.
3. DO NOT use any headings, bullet points, bold text, or special formatting.
4. Just provide the raw text in two distinct paragraphs.

The content should cover the overview, key features, benefits, and technical details within these two paragraphs.`,
    },
  ];

  const keyOrder = getProductKeyRotationOrder(apiKeys);
  const recoveryModel =
    PRODUCT_OPENAI_MODEL &&
    PRODUCT_OPENAI_MODEL !== PRODUCT_OPENROUTER_MODEL &&
    !modelRoute.includes(PRODUCT_OPENAI_MODEL)
      ? PRODUCT_OPENAI_MODEL
      : '';
  let lastErrorMessage = 'OpenRouter request failed.';

  for (const apiKey of keyOrder) {
    let { response, data } = await requestOpenRouter(req, apiKey, {
      model: PRODUCT_OPENROUTER_MODEL,
      ...(modelRoute.length > 1 ? { models: modelRoute } : {}),
      temperature: 0.7,
      messages,
    });

    if (!response.ok) {
      const message = getErrorMessage(response, data);
      lastErrorMessage = message;
      const noEndpointsError =
        response.status === 404 && message.toLowerCase().includes('no endpoints found');

      if (noEndpointsError && recoveryModel) {
        ({ response, data } = await requestOpenRouter(req, apiKey, {
          model: recoveryModel,
          temperature: 0.7,
          messages,
        }));

        if (!response.ok) {
          lastErrorMessage = getErrorMessage(response, data);
          continue;
        }
      } else {
        continue;
      }
    }

    const text = extractMessageText(data?.choices?.[0]?.message?.content);

    if (!text) {
      lastErrorMessage = 'No description generated.';
      continue;
    }

    return { url, description: text };
  }

  throw new Error(lastErrorMessage);
}

function parseJsonArray(raw) {
  const cleaned = raw.trim();
  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) {
      return direct.filter((item) => typeof item === 'string');
    }
    if (direct && typeof direct === 'object' && Array.isArray(direct.reviews)) {
      return direct.reviews.filter((item) => typeof item === 'string');
    }
  } catch {
    // Continue with fallbacks.
  }

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    try {
      const fromFence = JSON.parse(fenceMatch[1]);
      if (Array.isArray(fromFence)) {
        return fromFence.filter((item) => typeof item === 'string');
      }
      if (fromFence && typeof fromFence === 'object' && Array.isArray(fromFence.reviews)) {
        return fromFence.reviews.filter((item) => typeof item === 'string');
      }
    } catch {
      // Continue with line parsing fallback.
    }
  }

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter((line) => line.length > 8);

  if (lines.length > 0) {
    return lines;
  }

  throw new Error('Model did not return a valid JSON array of strings.');
}

function getReviewProviderConfig(provider, origin) {
  if (provider === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY in environment.');
    }

    const configuredModel =
      process.env.REVIEW_OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_REVIEW_OPENROUTER_MODEL;
    const configuredFallbacks = (
      process.env.REVIEW_OPENROUTER_FALLBACK_MODELS ||
      process.env.OPENROUTER_FALLBACK_MODELS ||
      ''
    )
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    const modelCandidates = Array.from(
      new Set([configuredModel, ...configuredFallbacks, ...DEFAULT_REVIEW_OPENROUTER_FALLBACK_MODELS]),
    );

    return {
      baseUrl: OPENROUTER_API_URL,
      apiKey,
      modelCandidates,
      headers: {
        'HTTP-Referer': origin || process.env.APP_URL || 'https://apps.hallstatt.co.in',
        'X-Title': 'Review Generator App',
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment.');
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  return {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey,
    modelCandidates: [model],
    headers: {},
  };
}

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/generate', async (req, res) => {
  const { url } = req.body ?? {};

  if (typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'A valid URL is required.' });
    return;
  }

  try {
    const result = await generateProductDescription(req, url.trim());
    res.json(result);
  } catch (error) {
    console.error('Error generating description for', url, error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate description. Please ensure the URL is accessible.',
    });
  }
});

app.post('/api/generate-reviews', async (req, res) => {
  const { url, count, provider, prompt } = req.body ?? {};

  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A valid product URL is required.' });
  }

  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return res.status(400).json({ error: 'Count must be an integer between 1 and 10.' });
  }

  if (provider !== 'openai' && provider !== 'openrouter') {
    return res.status(400).json({ error: 'Provider must be openai or openrouter.' });
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const cfg = getReviewProviderConfig(provider, req.get('origin'));
    let lastError = null;

    for (const model of cfg.modelCandidates) {
      try {
        const response = await fetch(cfg.baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json',
            ...cfg.headers,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You generate product reviews exactly as instructed and always return strict JSON.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.9,
            max_tokens: Math.max(500, count * 80),
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          const error = new Error(`API error (${response.status}) using ${model}: ${errText}`);

          if (provider !== 'openrouter' || response.status === 401 || response.status === 403) {
            throw error;
          }

          lastError = error;
          continue;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          lastError = new Error(`Empty response from model ${model}.`);
          continue;
        }

        const reviews = parseJsonArray(content).slice(0, count);
        return res.json({ reviews, model });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown API error.');
      }
    }

    throw lastError || new Error('Failed to generate reviews.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return res.status(500).json({ error: message });
  }
});

app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: isAdminAuthenticated(req) });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const submittedPassword = typeof password === 'string' ? password.trim() : '';

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin credentials are not configured' });
  }

  if (submittedPassword !== ADMIN_PASSWORD.trim()) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `hallstatt_admin=${ADMIN_SESSION_TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secureCookie}`,
  );
  res.json({ authenticated: true });
});

app.post('/api/upload-cogs', upload.single('file'), async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Admin login required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured. Please set DATABASE_URL.' });
  }

  const fileContent = req.file.buffer.toString('utf8');

  Papa.parse(fileContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const parsedProducts = results.data
        .filter((row) => row && row.sku && typeof row.cogs === 'number')
        .map((row) => ({
          sku: String(row.sku),
          cogs: Number(row.cogs),
        }));

      if (parsedProducts.length === 0) {
        return res.status(400).json({ error: "No valid product data found in CSV. Ensure columns 'sku' and 'cogs' exist." });
      }

      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const product of parsedProducts) {
            await client.query(
              `INSERT INTO products (sku, cogs, updated_at)
               VALUES ($1, $2, CURRENT_TIMESTAMP)
               ON CONFLICT (sku)
               DO UPDATE SET cogs = EXCLUDED.cogs, updated_at = CURRENT_TIMESTAMP`,
              [product.sku, product.cogs],
            );
          }
          await client.query('COMMIT');
          res.json({
            message: `Successfully synced ${parsedProducts.length} products to database`,
            count: parsedProducts.length,
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Database upload error:', error);
        res.status(500).json({
          error: `Failed to save products to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    },
    error: (error) => {
      res.status(500).json({ error: `Failed to parse CSV: ${error.message}` });
    },
  });
});

app.get('/api/products', async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json([]);
  }

  try {
    const result = await pool.query('SELECT sku, cogs FROM products ORDER BY sku ASC');
    const data = result.rows.map((row) => ({
      sku: row.sku,
      cogs: parseFloat(row.cogs),
    }));
    res.json(data);
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.put('/api/products/:sku', async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Admin login required' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured. Please set DATABASE_URL.' });
  }

  const sku = req.params.sku;
  const cogs = Number(req.body?.cogs);

  if (!sku) {
    return res.status(400).json({ error: 'SKU is required.' });
  }

  if (!Number.isFinite(cogs) || cogs < 0) {
    return res.status(400).json({ error: 'A valid COGS value is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET cogs = $1, updated_at = CURRENT_TIMESTAMP
       WHERE sku = $2
       RETURNING sku, cogs`,
      [cogs, sku],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'SKU not found.' });
    }

    const row = result.rows[0];
    res.json({ product: { sku: row.sku, cogs: parseFloat(row.cogs) } });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update product COGS' });
  }
});

function serveSpa(basePath, directory) {
  app.use(basePath, express.static(directory, { extensions: ['html'] }));
  app.use(basePath, (_req, res) => {
    res.sendFile(path.join(directory, 'index.html'));
  });
}

serveSpa('/sticker', pricingDist);
serveSpa('/product-description-generator', productDist);
serveSpa('/reviews-generator', reviewDist);
serveSpa('/pricing-calculator', pricingCalculatorDist);

app.use(express.static(rootDist, { extensions: ['html'] }));
app.use((_req, res) => {
  res.sendFile(path.join(rootDist, 'index.html'));
});

await initializePricingCalculatorDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hallstatt Apps listening on http://0.0.0.0:${PORT}`);
});

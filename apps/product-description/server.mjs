import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const rawOpenAIModel = process.env.OPENAI_MODEL || '';
const OPENAI_MODEL = rawOpenAIModel
  ? rawOpenAIModel.includes('/')
    ? rawOpenAIModel
    : `openai/${rawOpenAIModel}`
  : '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_API_KEYS = getApiKeys();
const OPENROUTER_FALLBACK_MODELS = process.env.OPENROUTER_FALLBACK_MODELS || '';
const OPENROUTER_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'ProductCopy AI';
const PORT = Number(process.env.PORT || 3000);
const MAX_ROUTE_MODELS = 3;
const distDir = path.join(__dirname, 'dist');
let nextKeyIndex = 0;

function getApiKeys() {
  const rawKeys = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';

  return rawKeys
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function getKeyRotationOrder() {
  if (OPENROUTER_API_KEYS.length === 0) {
    return [];
  }

  const startIndex = nextKeyIndex % OPENROUTER_API_KEYS.length;
  nextKeyIndex = (nextKeyIndex + 1) % OPENROUTER_API_KEYS.length;

  return OPENROUTER_API_KEYS.map(
    (_, index) => OPENROUTER_API_KEYS[(startIndex + index) % OPENROUTER_API_KEYS.length],
  );
}

function getModelRoute() {
  const fallbacks = OPENROUTER_FALLBACK_MODELS.split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0 && model !== OPENROUTER_MODEL);

  return [OPENROUTER_MODEL, ...fallbacks].slice(0, MAX_ROUTE_MODELS);
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
      'X-Title': OPENROUTER_SITE_NAME,
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
  if (OPENROUTER_API_KEYS.length === 0) {
    throw new Error('Missing OPENROUTER_API_KEYS or OPENROUTER_API_KEY. Add one of them in the Railway service variables.');
  }

  const modelRoute = getModelRoute();
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

  const keyOrder = getKeyRotationOrder();
  const recoveryModel =
    OPENAI_MODEL && OPENAI_MODEL !== OPENROUTER_MODEL && !modelRoute.includes(OPENAI_MODEL)
      ? OPENAI_MODEL
      : '';
  let lastErrorMessage = 'OpenRouter request failed.';

  for (const apiKey of keyOrder) {
    let { response, data } = await requestOpenRouter(req, apiKey, {
      model: OPENROUTER_MODEL,
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

const app = express();

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

app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

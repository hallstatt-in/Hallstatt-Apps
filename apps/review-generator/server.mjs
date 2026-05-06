import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
const DEFAULT_OPENROUTER_FALLBACK_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free'
];

const app = express();
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

const parseJsonArray = (raw) => {
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
};

const getProviderConfig = (provider, origin) => {
  if (provider === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY in environment.');
    }

    const configuredModel = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    const configuredFallbacks = (process.env.OPENROUTER_FALLBACK_MODELS || '')
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    const modelCandidates = Array.from(
      new Set([configuredModel, ...configuredFallbacks, ...DEFAULT_OPENROUTER_FALLBACK_MODELS])
    );

    return {
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey,
      modelCandidates,
      headers: {
        'HTTP-Referer': origin || process.env.APP_URL || 'https://reviewgen.hallstatt.co.in',
        'X-Title': 'Review Generator App'
      }
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
    headers: {}
  };
};

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
    const cfg = getProviderConfig(provider, req.get('origin'));
    let lastError = null;

    for (const model of cfg.modelCandidates) {
      try {
        const response = await fetch(cfg.baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json',
            ...cfg.headers
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You generate product reviews exactly as instructed and always return strict JSON.'
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.9,
            max_tokens: Math.max(500, count * 80)
          })
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
        if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error('Unknown API error.');
        }
      }
    }

    throw lastError || new Error('Failed to generate reviews.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return res.status(500).json({ error: message });
  }
});

app.use(express.static(distDir));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on ${port}`);
});

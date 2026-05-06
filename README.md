# Hallstatt Apps

Single Node/React workspace for the Hallstatt internal tools.

## Apps

- `/` - Hallstatt Apps home with three app tiles
- `/sticker/` - Pricing Sticker Generator
- `/product-description-generator/` - Product Description Generator
- `/reviews-generator/` - Review Generator

Production domain: `https://apps.hallstatt.co.in`

## Local Development

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:3000`.

## Environment

All secrets and runtime settings are loaded from the root `.env` file by `server.mjs`.

The combined app reads these `.env` variables:

```bash
APP_URL=https://apps.hallstatt.co.in
OPENROUTER_API_KEY=
OPENROUTER_API_KEYS=
OPENROUTER_SITE_NAME=ProductCopy AI
OPENROUTER_SITE_URL=https://apps.hallstatt.co.in
PRODUCT_OPENROUTER_MODEL=openai/gpt-4o-mini
PRODUCT_OPENROUTER_FALLBACK_MODELS=
PRODUCT_OPENAI_MODEL=openai/gpt-4o-mini
PRODUCT_OPENROUTER_SITE_NAME=ProductCopy AI
REVIEW_OPENROUTER_MODEL=openrouter/free
REVIEW_OPENROUTER_FALLBACK_MODELS=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_FALLBACK_MODELS=
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
PORT=
```

`OPENAI_API_KEY` is only required if the Review Generator uses the OpenAI provider.

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

## Environment Variables

The product description app uses:

```bash
OPENROUTER_API_KEY=...
# or
OPENROUTER_API_KEYS=key1,key2
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_FALLBACK_MODELS=
```

The review generator uses:

```bash
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Set `APP_URL=https://apps.hallstatt.co.in` in production.

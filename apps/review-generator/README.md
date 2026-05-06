<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set API keys in `.env.local`:
   `OPENAI_API_KEY=your_openai_key`
   `OPENROUTER_API_KEY=your_openrouter_key`
3. Optional model overrides:
   `OPENAI_MODEL=gpt-4o-mini`
   `OPENROUTER_MODEL=openrouter/free`
4. Run the API server and Vite together:
   `npm run dev:full`
5. Choose provider in the app (`OpenAI` or `OpenRouter`).

## Railway

This repo is configured for Railway with:

- `npm run build` for the frontend build
- `npm start` for the Express server that serves `dist/` and the `/api/generate-reviews` endpoint
- `robots.txt`, a `robots` meta tag, and `X-Robots-Tag` headers set to `noindex`

Set these Railway variables:

- `OPENAI_API_KEY` or `OPENROUTER_API_KEY`
- `OPENAI_MODEL` optional
- `OPENROUTER_MODEL` optional
- `OPENROUTER_FALLBACK_MODELS` optional
- `APP_URL=https://reviewgen.hallstatt.co.in`

Then in Railway:

1. Deploy this repo as a Node service.
2. Add the custom domain `reviewgen.hallstatt.co.in`.
3. Point your DNS `CNAME` for `reviewgen` to the Railway target Railway shows you.

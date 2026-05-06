<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Product Description Generator

This app generates long-form product descriptions from product URLs using OpenRouter models.
The OpenRouter API call runs on the server so the API key is not exposed in the browser.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env` and set your OpenRouter key or key pool:
   - `OPENROUTER_API_KEYS=key1,key2,key3`
   - or `OPENROUTER_API_KEY=your_key_here`
3. (Optional) Set model + metadata:
   - `OPENROUTER_MODEL=openai/gpt-4o-mini`
   - `OPENAI_MODEL=gpt-4o-mini` (recovery model when route endpoints are unavailable)
   - `OPENROUTER_FALLBACK_MODELS=qwen/qwen-2.5-7b-instruct:free,mistralai/mistral-7b-instruct:free` (up to 2 fallback models)
   - `OPENROUTER_SITE_URL=http://localhost:3001`
   - `OPENROUTER_SITE_NAME=ProductCopy AI`
   - `PORT=3001`
4. Run the app:
   - Terminal 1: `npm run dev:server`
   - Terminal 2: `npm run dev`

## Deploy On Railway

1. Push this repo to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Set these Railway variables:
   - `OPENROUTER_API_KEYS` (preferred for key rotation)
   - or `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (optional)
   - `OPENAI_MODEL` (optional)
   - `OPENROUTER_FALLBACK_MODELS` (optional)
   - `OPENROUTER_SITE_NAME=ProductCopy AI`
   - `APP_URL=https://desc.hallstatt.co.in`
4. Railway should build with `npm run build` and start with `npm run start`.
5. Add the custom domain `desc.hallstatt.co.in` in Railway and point DNS at Railway's target.

## Key Rotation

Set `OPENROUTER_API_KEYS` in Railway as a comma-separated or newline-separated list. The server will rotate the starting key for each request and retry with the next key if a request fails.

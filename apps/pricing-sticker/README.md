<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your app

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Railway

This repo is configured for Railway with:

- `npm run build` during build
- `npm run start` in production
- an Express server that serves `dist/index.html` at `/`

Steps:

1. Create a new Railway project from this GitHub repo.
2. Add the custom domain `sticker.hallstatt.co.in` in Railway.
3. Point the DNS record for `sticker.hallstatt.co.in` to Railway using the value Railway shows you.
4. Deploy.

The app will open at `https://sticker.hallstatt.co.in/` without `/index.html` in the URL.

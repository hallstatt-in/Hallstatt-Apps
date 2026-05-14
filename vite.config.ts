import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const builtApps = [
  { base: '/sticker/', dir: 'apps/pricing-sticker/dist' },
  { base: '/product-description-generator/', dir: 'apps/product-description/dist' },
  { base: '/reviews-generator/', dir: 'apps/review-generator/dist' },
];

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function serveBuiltApps() {
  return {
    name: 'serve-built-apps',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split('?')[0] ?? '/';
        const app = builtApps.find(({ base }) => requestPath === base.slice(0, -1) || requestPath.startsWith(base));

        if (!app) {
          next();
          return;
        }

        const appDir = path.resolve(app.dir);
        const relativePath = requestPath === app.base.slice(0, -1)
          ? 'index.html'
          : requestPath.slice(app.base.length) || 'index.html';
        const requestedFile = path.resolve(appDir, relativePath);
        const filePath = requestedFile.startsWith(appDir) && fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()
          ? requestedFile
          : path.join(appDir, 'index.html');

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end(`Run npm run build before opening ${app.base} in the root dev server.`);
          return;
        }

        res.setHeader('Content-Type', contentTypes[path.extname(filePath)] ?? 'application/octet-stream');
        res.end(fs.readFileSync(filePath));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveBuiltApps()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});

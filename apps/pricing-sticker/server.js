import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;
const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');

app.disable('x-powered-by');

app.use(express.static(distDir, {extensions: ['html']}));

// Always serve the SPA entrypoint so Railway serves the app at `/`
// and users never need to hit `/index.html` directly.
app.get('*', (_req, res) => {
  res.sendFile(indexFile);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

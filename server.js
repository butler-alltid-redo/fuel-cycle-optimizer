// Minimal static file server (no deps)
// Serves ./src on http://0.0.0.0:7856

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 7856;
const ROOT = path.join(__dirname, 'src');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const rel = decoded.replace(/^\/+/, '');
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || '/';

  let filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  // Default document
  if (urlPath === '/' || urlPath.endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} on http://0.0.0.0:${PORT}`);
});

// Local production-build preview: static assets plus Laravel-rendered pages and API.
import { createServer, request as proxyRequest } from 'node:http';
import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..'), dist = resolve(root, 'frontend/dist');
const origin = new URL(process.env.PORTAL_API_TARGET || 'http://127.0.0.1:8000');
const policy = readFileSync(resolve(root, 'docker/nginx/default.conf'), 'utf8').match(/add_header Content-Security-Policy "([^"]+)"/)?.[1];
const mime = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm', '.html': 'text/html', '.json': 'application/json' };
createServer(async (request, response) => {
  if (policy) response.setHeader('Content-Security-Policy', policy);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(dist, '.' + pathname);
    if (!file.startsWith(dist + sep) && file !== dist) { response.writeHead(404).end(); return; }
    if (pathname !== '/' && pathname !== '/index.html' && (await stat(file).catch(() => null))?.isFile()) {
      response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream'); createReadStream(file).pipe(response); return;
    }
    const upstream = proxyRequest({ hostname: origin.hostname, port: origin.port, path: request.url, method: request.method, headers: { ...request.headers, host: origin.host } }, source => { response.writeHead(source.statusCode || 502, { ...source.headers, ...(policy ? { 'content-security-policy': policy } : {}) }); source.pipe(response); });
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Start the Laravel server to open this page.'); });
    request.pipe(upstream);
  } catch { response.writeHead(400).end('Invalid request.'); }
}).listen(Number(process.env.PORTAL_PREVIEW_PORT || 5176), '127.0.0.1', () => console.log(`Built portal: http://127.0.0.1:${process.env.PORTAL_PREVIEW_PORT || 5176}`));

#!/usr/bin/env node
// Dependency-free local server for previewing the ES-module-based site.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const portInput = process.argv[2] || process.env.PORT || '8000';
const PORT = Number.parseInt(portInput, 10);

if (!/^\d+$/.test(portInput) || !Number.isInteger(PORT) || PORT < 0 || PORT > 65_535) {
  console.error(`Invalid port: ${portInput}`);
  process.exit(1);
}

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function resolveRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, `http://${HOST}`).pathname);
  } catch {
    return null;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';
  const filepath = path.resolve(PROJECT_DIR, `.${pathname}`);
  const relative = path.relative(PROJECT_DIR, filepath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return filepath;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const filepath = resolveRequestPath(request.url);
  if (!filepath) {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  try {
    const info = await stat(filepath);
    if (!info.isFile()) throw new Error('Not a file');

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': info.size,
      'Content-Type': MIME_TYPES.get(path.extname(filepath).toLowerCase()) || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(filepath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.on('error', (cause) => {
  if (cause.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: npm start -- 8001`);
  } else {
    console.error(`Could not start the preview server: ${cause.message}`);
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  console.log(`Cool Code CAD is available at http://${HOST}:${address.port}/`);
  console.log('Press Ctrl+C to stop.');
});

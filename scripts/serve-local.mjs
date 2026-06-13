import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 3456);
const host = process.env.HOST || '0.0.0.0';
const displayHost = process.env.DISPLAY_HOST || '127.0.0.1';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function resolveRequestPath(url = '/') {
  const pathname = decodeURIComponent(url.split('?')[0]);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const filePath = resolve(root, normalize(relativePath));

  if (filePath !== root && !filePath.startsWith(`${root}\\`) && !filePath.startsWith(`${root}/`)) {
    return null;
  }

  return filePath;
}

const server = createServer((request, response) => {
  let filePath;

  try {
    filePath = resolveRequestPath(request.url);
    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    if (statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    const contentType = mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.on('error', error => {
  console.error(`Silentium server failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Silentium is available at http://${displayHost}:${port}`);
  if (host === '0.0.0.0') {
    console.log(`LAN access is enabled on port ${port}`);
  }
});

// 启动本地查看器：node viewer/serve.mjs（默认端口 4173，可用 PORT 环境变量修改）
// 每次打开页面都从仓库重新生成。只绑定本机地址，只读，不提供以点开头的文件。
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { ROOT } from '../scripts/build-tokens.mjs';
import { escapeHtml } from './markdown.mjs';
import { renderPage } from './build.mjs';

const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
};

function send(response, status, type, body) {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}

function resolveFile(pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  if (relative.split(sep).some((segment) => segment === '..' || segment.startsWith('.'))) return null;
  const file = join(ROOT, relative);
  return statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'text/plain; charset=utf-8', '只支持读取。');
    return;
  }
  const { pathname } = new URL(request.url, 'http://localhost');
  if (pathname === '/') {
    try {
      send(response, 200, 'text/html; charset=utf-8', request.method === 'HEAD' ? undefined : renderPage());
    } catch (error) {
      send(response, 500, 'text/html; charset=utf-8', `<!doctype html><meta charset="utf-8"><title>查看器出错</title><pre>${escapeHtml(error.stack)}</pre>`);
    }
    return;
  }
  let file;
  try {
    file = resolveFile(pathname);
  } catch {
    file = null;
  }
  if (!file) {
    send(response, 404, 'text/plain; charset=utf-8', '找不到这个文件。');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`katachi 查看器：http://localhost:${PORT}`);
});

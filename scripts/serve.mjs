// Minimal static server for dist/, mirroring GitHub Pages: directory index.html and 404.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.PORT || 4321);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml' };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = normalize(join(root, pathname));
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) { response.writeHead(301, { Location: `${pathname}/` }).end(); return; }
      file = join(file, 'index.html');
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': types['.html'] }).end(await readFile(join(root, '404.html')));
  }
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));

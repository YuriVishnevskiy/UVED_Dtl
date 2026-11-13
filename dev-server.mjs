import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import handler from './api/ai-wrap-preview.mjs';

const root = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const types = {
  html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp4: 'video/mp4', wasm: 'application/wasm'
};

createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
  };
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/ai-wrap-preview') {
      if (req.method === 'POST') {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req.iterator({destroyOnReturn: false})) {
          bytes += chunk.length;
          if (bytes > 4_000_000) return res.status(413).json({message: 'Фото слишком большое.'});
          chunks.push(chunk);
        }
        req.body = Buffer.concat(chunks).toString('utf8');
      }
      return await handler(req, res);
    }

    if (!['GET', 'HEAD'].includes(req.method) || pathname.startsWith('/api/') ||
        pathname.split('/').some(segment => segment.startsWith('.'))) return res.status(404).end();
    const path = await realpath(resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
    if (!path.startsWith(root + sep)) return res.status(404).end();
    const info = await stat(path);
    if (!info.isFile()) return res.status(404).end();
    res.setHeader('Content-Type', types[path.split('.').pop()] || 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(path);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch (error) {
    if (res.headersSent) return res.destroy();
    return res.status(error.code === 'ENOENT' ? 404 : 400).json({message: 'Не удалось открыть ресурс.'});
  }
}).listen(Number(process.env.PORT) || 8000, '127.0.0.1', () => {
  console.log('UVED: http://127.0.0.1:' + (Number(process.env.PORT) || 8000) + '/#finish-title');
});

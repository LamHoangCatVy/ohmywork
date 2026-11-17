import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateRunInput } from './mcp.mjs';

const PUBLIC = fileURLToPath(new URL('./public/', import.meta.url));
const FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);
function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw Object.assign(new Error('Use application/json'), { status: 415 });
  let bytes = 0, chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 512 * 1024) throw Object.assign(new Error('Request body exceeds 512 KiB'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON body'), { status: 400 }); }
}
function authorized(header, token) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const candidate = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
export async function createLocalServer({ harness, token = randomBytes(32).toString('base64url'), port = 4318 }) {
  if (typeof token !== 'string' || token.length < 24) throw new Error('Pairing token must have at least 24 characters');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  let origin;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (req.headers.host !== new URL(origin).host) { reply(res, 403, { error: 'Invalid Host' }); return; }
    if (req.headers.origin !== undefined && req.headers.origin !== origin) { reply(res, 403, { error: 'Invalid Origin' }); return; }
    let url;
    try { url = new URL(req.url, origin); }
    catch { reply(res, 400, { error: 'Invalid URL' }); return; }
    if (url.origin !== origin) { reply(res, 403, { error: 'Invalid URL origin' }); return; }
    try {
      if (url.pathname === '/api/health' && req.method === 'GET') { reply(res, 200, { ok: true, service: 'ohmywork-harness' }); return; }
      if (url.pathname.startsWith('/api/')) {
        if (!authorized(req.headers.authorization, token)) { reply(res, 401, { error: 'Pair using the token printed in your local terminal' }); return; }
        let data;
        if (req.method === 'GET' && url.pathname === '/api/doctor') data = await harness.doctor();
        else if (req.method === 'GET' && url.pathname === '/api/skills') data = await harness.listSkills();
        else if (req.method === 'GET' && url.pathname === '/api/runs') data = await harness.listRuns();
        else if (req.method === 'POST' && url.pathname === '/api/runs') {
          data = await harness.createRun(validateRunInput(await body(req)));
          reply(res, 202, data); return;
        } else {
          const match = /^\/api\/runs\/([A-Za-z0-9_-]{1,128})(\/cancel)?$/.exec(url.pathname);
          if (match && !match[2] && req.method === 'GET') data = await harness.getRun(match[1]);
          else if (match && match[2] && req.method === 'POST') data = await harness.cancelRun(match[1]);
          else { reply(res, 404, { error: 'Endpoint not found' }); return; }
          if (data === undefined || data === null) { reply(res, 404, { error: 'Run not found' }); return; }
        }
        reply(res, 200, data); return;
      }
      const file = FILES.get(url.pathname);
      if (req.method !== 'GET' || !file) { reply(res, 404, { error: 'Not found' }); return; }
      const content = await readFile(`${PUBLIC}${file[0]}`);
      res.writeHead(200, { 'Content-Type': file[1] }); res.end(content);
    } catch (error) {
      const status = error.status ?? (error.code === -32602 ? 400 : error.code === 'execution-disabled' ? 403 : error.code === 'run-not-found' ? 404 : 400);
      reply(res, status, { error: error.message || 'Operation failed' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, token, url: origin, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

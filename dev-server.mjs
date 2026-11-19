/* Local test server: serves the site and runs the /api functions the same way Vercel does.
   Start it with:  npm run dev   (then open http://localhost:3000)
   Settings come from .env.local (see .env.example). Data is saved in .data/db.json. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);

// load .env.local  (KEY=value, "# comments" allowed)
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || m[1] in process.env) continue;
    let v = m[2].trim();
    if (/^["']/.test(v)) v = v.slice(1, v.indexOf(v[0], 1)); else v = v.replace(/\s+#.*$/, '');
    process.env[m[1]] = v;
  }
}
const PORT = +process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
const PUBLIC = p => p === 'index.html' || p === 'admin.html' || p === 'catalog.js' || p.startsWith('assets/');

async function api(req, res, url) {
  const name = url.pathname.replace(/^\/api\//, '').replace(/[^a-z0-9/_-]/gi, '');
  const file = path.join(ROOT, 'api', name + '.js');
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 2e6) { res.statusCode = 413; return res.end(); } }
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  req.query = Object.fromEntries(url.searchParams);
  const mod = await import(pathToFileURL(file).href);
  await mod.default(req, res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let p = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if (p === 'admin') p = 'admin.html';
    const file = path.join(ROOT, p);
    if (!PUBLIC(p) || !file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.end('Server error'); }
  }
}).listen(PORT, () => {
  console.log(`Natural Blitz running at http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin)`);
});

// send due reminders every 5 minutes while testing (Vercel uses a scheduled job instead)
const { runReminders } = await import(pathToFileURL(path.join(ROOT, 'lib', 'reminders.js')).href);
setInterval(() => runReminders().then(r => r.sent && console.log(`Sent ${r.sent} reminder(s)`)).catch(e => console.error(e.message)), 5 * 60e3);

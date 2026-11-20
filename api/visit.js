/* POST /api/visit {page, first}  counts a page view for Shen's visitor numbers (no cookies, no personal data). */
import '../catalog.js';
import { countVisit } from '../lib/store.js';
import { json, body } from '../lib/http.js';

const NB = globalThis.NB;
const PAGES = ['home', 'gallery', 'services', 'process', 'pricing', 'contact', 'book', 'booked'];
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const p = body(req);
  if (!PAGES.includes(p.page) || BOT.test(req.headers['user-agent'] || '')) return json(res, 200, { ok: false });
  try { await countVisit(NB.jaToday(), p.page, !!p.first); } catch {}
  json(res, 200, { ok: true });
}

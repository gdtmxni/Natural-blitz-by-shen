/* GET /api/prices  a tiny script the site and dashboard load right after catalog.js,
   so Shen's price changes show everywhere. Cached at Vercel's edge for 30 seconds. */
import { getSetting } from '../../lib/store.js';

export default async function handler(req, res) {
  let p = {};
  try { p = (await getSetting('prices')) || {}; } catch {}
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=86400');
  res.end(`globalThis.NB&&NB.applyPrices(${JSON.stringify(p).replace(/</g, '\u003c')});`);
}

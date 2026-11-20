/* POST /api/admin/prices  (admin only)
   { prices: { key: amount|null } }  saves Shen's prices (only the ones that differ from the launch prices are kept)
   { reset: true }                   back to the launch prices */
import '../../catalog.js';
import { saveSetting } from '../../lib/store.js';
import { loadPrices, forgetPrices } from '../../lib/prices.js';
import { json, body } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';

const NB = globalThis.NB;

export default async function handler(req, res) {
  if (!(await isAdmin(req))) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const p = body(req);
    const changes = p.reset ? {} : NB.cleanPrices(p.prices || {});
    await saveSetting('prices', changes);
    forgetPrices(); await loadPrices(true);
    json(res, 200, { changes, list: NB.priceList() });
  } catch (e) {
    json(res, 400, { error: e.message });
  }
}

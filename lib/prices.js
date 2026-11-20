/* Shen's price changes (admin > Prices), applied over the prices in catalog.js. */
import '../catalog.js';
import { getSetting } from './store.js';

const NB = globalThis.NB;
let cache = null, at = 0;
export async function loadPrices(fresh) {
  if (fresh || !cache || Date.now() - at > 15e3) { cache = (await getSetting('prices').catch(() => null)) || {}; at = Date.now(); }
  NB.applyPrices(cache);
  return cache;
}
export function forgetPrices() { cache = null; }

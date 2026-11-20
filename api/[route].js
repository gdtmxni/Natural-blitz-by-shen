/* /api/<route>  public endpoints. Vercel's free plan allows 12 server functions, so every public
   endpoint runs through this one file; the real code is in server/public/. */
import availability from '../server/public/availability.js';
import bookings from '../server/public/bookings.js';
import config from '../server/public/config.js';
import gallery from '../server/public/gallery.js';
import prices from '../server/public/prices.js';
import visit from '../server/public/visit.js';
import { json } from '../lib/http.js';

const ROUTES = { availability, bookings, config, gallery, prices, visit };

export default async function handler(req, res) {
  const fn = Object.prototype.hasOwnProperty.call(ROUTES, req.query.route) ? ROUTES[req.query.route] : null;
  if (!fn) return json(res, 404, { error: 'Not found' });
  return fn(req, res);
}

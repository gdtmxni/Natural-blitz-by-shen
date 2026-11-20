/* /api/admin/<route>  dashboard endpoints (each one checks the admin login itself).
   Vercel's free plan allows 12 server functions, so they all run through this one file;
   the real code is in server/admin/. */
import backup from '../../server/admin/backup.js';
import booking from '../../server/admin/booking.js';
import data from '../../server/admin/data.js';
import gallery from '../../server/admin/gallery.js';
import login from '../../server/admin/login.js';
import media from '../../server/admin/media.js';
import password from '../../server/admin/password.js';
import prices from '../../server/admin/prices.js';
import schedule from '../../server/admin/schedule.js';
import { json } from '../../lib/http.js';

const ROUTES = { backup, booking, data, gallery, login, media, password, prices, schedule };
export const rawRoutes = ['media']; // the local dev server leaves the upload body unread for these

export default async function handler(req, res) {
  const fn = Object.prototype.hasOwnProperty.call(ROUTES, req.query.route) ? ROUTES[req.query.route] : null;
  if (!fn) return json(res, 404, { error: 'Not found' });
  return fn(req, res);
}

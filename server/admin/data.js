/* GET /api/admin/data  everything the dashboard shows (admin only) */
import '../../catalog.js';
import { listBookings, getSchedule, listMessages, listVisits, getSetting, backend } from '../../lib/store.js';
import { loadPrices } from '../../lib/prices.js';
import { json } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';
import { mediaBackend } from '../../lib/media.js';

const NB = globalThis.NB;

export default async function handler(req, res) {
  if (!(await isAdmin(req))) return json(res, 401, { error: 'Please log in' });
  try {
    const today = NB.jaToday();
    const [bookings, schedule, messages, visits, auth] = await Promise.all([listBookings(), getSchedule(NB.SCHEDULE_DEFAULT), listMessages(80),
      listVisits(NB.addDays(today, -29)).catch(() => []), getSetting('auth').catch(() => null), loadPrices(true)]);
    bookings.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
    json(res, 200, {
      today, bookings, schedule, messages, visits, prices: NB.priceList(), passwordChangedAt: (auth && auth.at) || 0, storage: backend, media: mediaBackend,
      sending: { email: !!process.env.RESEND_API_KEY, texts: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) },
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

/* GET /api/admin/data  everything the dashboard shows (admin only) */
import '../../catalog.js';
import { listBookings, getSchedule, listMessages, backend } from '../../lib/store.js';
import { json } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';

const NB = globalThis.NB;

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Please log in' });
  try {
    const [bookings, schedule, messages] = await Promise.all([listBookings(), getSchedule(NB.SCHEDULE_DEFAULT), listMessages(80)]);
    bookings.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
    json(res, 200, {
      today: NB.jaToday(), bookings, schedule, messages, storage: backend,
      sending: { email: !!process.env.RESEND_API_KEY, texts: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) },
    });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

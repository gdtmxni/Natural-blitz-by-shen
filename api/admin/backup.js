/* GET /api/admin/backup  (admin only) downloads a copy of everything: bookings, schedule, gallery and the message log.
   Supabase also saves a weekly copy by itself (nb_backups table, last 8 kept). */
import '../../catalog.js';
import { listBookings, getSchedule, getGallery, listMessages } from '../../lib/store.js';
import { isAdmin } from '../../lib/auth.js';
import { json } from '../../lib/http.js';

const NB = globalThis.NB;

export default async function handler(req, res) {
  if (!(await isAdmin(req))) return json(res, 401, { error: 'Please log in' });
  try {
    const [bookings, schedule, gallery, messages] = await Promise.all([listBookings(), getSchedule(NB.SCHEDULE_DEFAULT), getGallery(), listMessages(200)]);
    const day = NB.jaToday();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="natural-blitz-backup-${day}.json"`);
    res.end(JSON.stringify({ takenAt: new Date().toISOString(), bookings, schedule, gallery, messages }, null, 2));
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

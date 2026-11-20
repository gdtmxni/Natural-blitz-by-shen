/* GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD  (public, no customer details) */
import '../../catalog.js';
import { listBookings, getSchedule } from '../../lib/store.js';
import { json } from '../../lib/http.js';

const NB = globalThis.NB;
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

export default async function handler(req, res) {
  try {
    const today = NB.jaToday();
    let from = isDay(req.query?.from) ? req.query.from : today;
    let to = isDay(req.query?.to) ? req.query.to : NB.addDays(today, 62);
    if (from < NB.addDays(today, -40)) from = NB.addDays(today, -40);
    const last = NB.addDays(today, NB.BOOK_AHEAD_DAYS);
    if (to > last) to = last;
    if (to > NB.addDays(from, 100)) to = NB.addDays(from, 100);
    const [schedule, bookings] = await Promise.all([getSchedule(NB.SCHEDULE_DEFAULT), listBookings()]);
    const days = NB.buildDays(schedule, bookings.map(b => ({ date: b.date, time: b.time, status: b.status })), from, to);
    json(res, 200, { today, last, days });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

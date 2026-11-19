/* Sends the 24-hour and 2-hour reminders. Safe to run as often as you like:
   each reminder is only sent once per booking. */
import '../catalog.js';
import { listBookings, getBooking, saveBooking, withLock } from './store.js';
import { reminder } from './notify.js';

const NB = globalThis.NB;
const H = 3600e3;

export async function runReminders(now = Date.now()) {
  let sent = 0;
  for (const b of await listBookings()) {
    if (b.status === 'cancelled' || b.status === 'done') continue;
    const t = NB.apptTime(b.date, b.time);
    if (t <= now || t - now > 24 * H) continue;
    await withLock('b:' + b.ref, async () => {
      const cur = await getBooking(b.ref);
      if (!cur || cur.status === 'cancelled' || cur.status === 'done') return;
      cur.reminders = cur.reminders || {};
      let which = null;
      if (!cur.reminders.h2 && t - now <= 2 * H) which = 'h2';
      else if (!cur.reminders.d1 && t - now > 2 * H) which = 'd1';
      if (!which) return;
      // the "tomorrow" reminder only goes out 12 to 24 hours ahead, and not for bookings made less than a day ahead
      if (which === 'd1' && (t - now < 12 * H || (cur.createdAt || 0) > t - 24 * H)) { cur.reminders.d1 = 'skipped'; await saveBooking(cur); return; }
      await reminder(cur, which);
      cur.reminders[which] = now;
      if (which === 'h2' && !cur.reminders.d1) cur.reminders.d1 = 'skipped';
      await saveBooking(cur);
      sent++;
    });
  }
  return { sent };
}

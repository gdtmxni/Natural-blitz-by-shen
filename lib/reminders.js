/* Regular housekeeping, run every 15 minutes (Supabase scheduler -> /api/cron/reminders):
   - sends the 24-hour and 2-hour reminders (each only once per booking)
   - if Shen switched it on, releases bank-transfer bookings with no deposit after 24 hours
   Safe to run as often as you like. */
import '../catalog.js';
import { listBookings, getBooking, saveBooking, getSchedule, withLock } from './store.js';
import { reminder, released } from './notify.js';

const NB = globalThis.NB;
const H = 3600e3;
export const RELEASE_AFTER = 24 * H;

/* A booking that is waiting for a deposit Shen asked for (a price is set) and has waited too long. */
export function unpaidTooLong(b, now = Date.now()) {
  const p = b.price || NB.price(b);
  return b.status === 'pending' && b.pay === 'transfer' && !b.depositAt && p.total > 0 && now - (b.createdAt || now) >= RELEASE_AFTER;
}

export async function runReminders(now = Date.now()) {
  let sent = 0, freed = 0;
  const schedule = await getSchedule(NB.SCHEDULE_DEFAULT);
  for (const b of await listBookings()) {
    if (b.status === 'cancelled' || b.status === 'done') continue;
    const t = NB.apptTime(b.date, b.time);

    if (schedule.releaseUnpaid && unpaidTooLong(b, now) && t > now) {
      const out = await withLock('b:' + b.ref, async () => {
        const cur = await getBooking(b.ref);
        if (!cur || !unpaidTooLong(cur, now)) return null;
        Object.assign(cur, { status: 'cancelled', cancelledAt: now, cancelReason: 'unpaid' });
        await saveBooking(cur);
        return cur;
      });
      if (out) { await released(out).catch(() => {}); freed++; }
      continue;
    }

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
  return { sent, released: freed };
}

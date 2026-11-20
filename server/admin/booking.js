/* POST /api/admin/booking  (admin only)
   {ref, action}  action: deposit | done | cancel | restore
   {ref, action: 'move', date, time, notify}   reschedule (the customer is told unless notify is false)
   {action: 'create', booking, notify}        a booking Shen takes by phone or WhatsApp */
import crypto from 'node:crypto';
import '../../catalog.js';
import { getBooking, saveBooking, listBookings, withLock } from '../../lib/store.js';
import { loadPrices } from '../../lib/prices.js';
import { json, body, clip } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';
import { depositReceived, cancelled, rescheduled, newBooking } from '../../lib/notify.js';

const NB = globalThis.NB;
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');
const pick = (v, list) => (list.includes(v) ? v : '');

/* Shen's own booking: only the basics are needed (she can add the rest in the notes). */
function cleanAdmin(r) {
  const cat = pick(r.cat, NB.CATS.map(c => c.id));
  if (!cat) throw new Error('Pick a service');
  const b = { cat, date: clip(r.date, 10), time: clip(r.time, 5), name: clip(r.name, 80), phone: clip(r.phone, 12),
    email: clip(r.email, 120).toLowerCase(), notes: clip(r.notes, 1000), pay: pick(r.pay, ['transfer', 'cash']) || 'cash', source: 'admin' };
  if (cat === 'wig') {
    const M = NB.WIG_MAIN.find(m => m.id === r.main); if (!M) throw new Error('Pick a wig care service');
    Object.assign(b, { main: M.id, qty: Math.max(1, Math.min(M.bundle ? 12 : 10, Math.round(+r.qty || 1))), wigType: NB.WIG_TYPES[0],
      handoff: pick(r.handoff, ['Drop-off', 'Pickup']) || 'Drop-off', styled: M.styled ? 'yes' : 'no', repairs: [], damage: [] });
    if (M.tiers) { b.tier = pick(r.tier, NB.TIERS); if (!b.tier) throw new Error('Pick the wig length'); }
    if (M.styled) b.wstyleFinish = NB.WSTYLE_FINISH[0];
    if (b.handoff === 'Pickup') { b.area = pick(r.area, Object.keys(NB.AREAS)) || 'Kingston'; b.addr = clip(r.addr, 200); }
  } else {
    const s = NB.svc(cat, r.svc); if (!s) throw new Error('Pick a service');
    b.svc = s.id; b.location = 'studio';
    if (s.vars) { b.variant = pick(r.variant, s.vars.map(v => v.n)); if (!b.variant) throw new Error('Pick an option for ' + s.name); }
  }
  if (!isDate(b.date)) throw new Error('Pick a date');
  if (!isTime(b.time)) throw new Error('Pick a time');
  if (b.name.length < 2) throw new Error("Add the customer's name");
  if (!/^\d{3}-\d{3}-\d{4}$/.test(b.phone)) throw new Error('Enter a 10-digit phone number, like 876-555-0123');
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw new Error('Check the email address');
  return b;
}

export default async function handler(req, res) {
  if (!(await isAdmin(req))) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const p = body(req), { action, notify = true } = p;
  try {
    if (action === 'create') {
      await loadPrices();
      const b = cleanAdmin(p.booking || {});
      const paid = p.booking.paid === 'deposit';
      const rec = await withLock('day:' + b.date, async () => {
        const all = await listBookings();
        let ref;
        do ref = 'NB-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5); while (all.some(x => x.ref === ref));
        const r = { ...b, ref, createdAt: Date.now(), price: NB.price(b), reminders: {},
          status: b.pay === 'cash' || paid ? 'confirmed' : 'pending', ...(paid ? { depositAt: Date.now() } : {}) };
        await saveBooking(r);
        return r;
      });
      if (notify) await newBooking(rec, { fromShen: true }).catch(() => {});
      return json(res, 201, { booking: rec });
    }
    const ref = String(p.ref || '');
    const out = await withLock('b:' + ref, async () => {
      const b = await getBooking(ref);
      if (!b) return { error: 'Booking not found' };
      const now = Date.now();
      let old = null;
      if (action === 'deposit') { b.status = 'confirmed'; b.depositAt = now; }
      else if (action === 'done') { b.status = 'done'; b.doneAt = now; }
      else if (action === 'cancel') { b.status = 'cancelled'; b.cancelledAt = now; }
      else if (action === 'restore') { b.status = b.depositAt || b.pay === 'cash' ? 'confirmed' : 'pending'; delete b.cancelledAt; delete b.cancelReason; }
      else if (action === 'move') {
        if (!isDate(p.date) || !isTime(p.time)) return { error: 'Pick a new date and time' };
        if (p.date === b.date && p.time === b.time) return { error: 'That is the same date and time' };
        old = { date: b.date, time: b.time };
        Object.assign(b, { date: p.date, time: p.time, movedAt: now, reminders: {} }); // reminders start again for the new time
        b.history = [...(b.history || []), { at: now, from: old, to: { date: p.date, time: p.time } }].slice(-10);
      }
      else return { error: 'Unknown action' };
      await saveBooking(b);
      return { b, old };
    });
    if (out.error) return json(res, 400, out);
    if (notify && action === 'deposit') await depositReceived(out.b).catch(() => {});
    if (notify && action === 'cancel') await cancelled(out.b).catch(() => {});
    if (notify && action === 'move') await rescheduled(out.b, out.old).catch(() => {});
    json(res, 200, { booking: out.b });
  } catch (e) {
    json(res, 400, { error: e.message });
  }
}

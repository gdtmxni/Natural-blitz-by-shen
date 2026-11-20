/* POST /api/bookings  creates a booking (prices are re-calculated here, never trusted from the browser) */
import crypto from 'node:crypto';
import '../../catalog.js';
import { listBookings, getSchedule, saveBooking, withLock } from '../../lib/store.js';
import { json, body, clip } from '../../lib/http.js';
import { newBooking } from '../../lib/notify.js';
import { loadPrices } from '../../lib/prices.js';

const NB = globalThis.NB;
const MAX_UPCOMING_PER_PHONE = 3;   // a customer can hold up to 3 upcoming bookings online
const MAX_PER_DEVICE_PER_HOUR = 5;  // and one device/network can make up to 5 bookings an hour
/* who sent the request, as a one-way hash (the address itself is never stored) */
function deviceId(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET || 'nb').update(ip).digest('base64url').slice(0, 16);
}
const pick = (v, list) => (list.includes(v) ? v : '');
const ids = (v, list, max) => (Array.isArray(v) ? [...new Set(v.map(String))].filter(x => list.includes(x)).slice(0, max) : []);

function clean(r) {
  const cat = pick(r.cat, NB.CATS.map(c => c.id));
  const b = {
    cat, occasion: clip(r.occasion, 120), date: clip(r.date, 10), time: clip(r.time, 5),
    name: clip(r.name, 80), phone: clip(r.phone, 12), email: clip(r.email, 120).toLowerCase(), ig: clip(r.ig, 60),
    notes: clip(r.notes, 1000), pay: pick(r.pay, ['transfer', 'cash']), photo: !!r.photo,
    look: clip(r.look, 40), lookName: clip(r.lookName, 80),
  };
  if (cat === 'wig') {
    Object.assign(b, {
      main: pick(r.main, NB.WIG_MAIN.map(m => m.id)), tier: pick(r.tier, NB.TIERS), qty: Math.round(+r.qty || 1),
      wigType: pick(r.wigType, NB.WIG_TYPES) || NB.WIG_TYPES[0],
      repairs: ids(r.repairs, NB.WIG_REPAIRS.map(x => x.id), 5), damage: ids(r.damage, NB.DAMAGE, 10), damageNote: clip(r.damageNote, 500),
      styled: pick(r.styled, ['yes', 'no']), styleType: pick(r.styleType, NB.WIG_STYLING.map(s => s.id)),
      wstyleFinish: pick(r.wstyleFinish, NB.WSTYLE_FINISH), handoff: pick(r.handoff, ['Drop-off', 'Pickup']),
      area: pick(r.area, Object.keys(NB.AREAS)), addr: clip(r.addr, 200),
    });
    const M = NB.wigMain(b.main);
    if (M.bundle) { b.repairs = []; b.damage = []; b.styled = 'no'; }
    if (M.styled) { b.styled = 'yes'; b.styleType = ''; b.wstyleFinish = b.wstyleFinish || NB.WSTYLE_FINISH[0]; }
  } else if (cat) {
    Object.assign(b, {
      svc: clip(r.svc, 30), variant: clip(r.variant, 40), location: pick(r.location, ['studio', 'mobile']) || 'studio', addr: clip(r.addr, 200),
      addons: cat === 'style' ? ids(r.addons, NB.ADDONS.map(a => a.id), 4) : [],
    });
  }
  return b;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  await loadPrices(); // Shen's current prices
  const raw = body(req);
  if (raw.website) return json(res, 400, { error: 'Something went wrong. Please try again.' }); // spam trap was filled in
  const b = clean(raw);
  const device = deviceId(req);
  const err = NB.check(b);
  if (err) return json(res, 400, { error: err });
  try {
    const out = await withLock('day:' + b.date, async () => {
      const min = NB.minDate(b);
      if (b.date < min) return { error: b.cat === 'wig' ? `Wigs need to be dropped off ${NB.DROP_DAYS} days ahead. Pick ${NB.fmtDate(min)} or later.` : 'Please pick a later date.' };
      if (b.date > NB.addDays(NB.jaToday(), NB.BOOK_AHEAD_DAYS)) return { error: 'That date is too far ahead.' };
      const [schedule, all] = await Promise.all([getSchedule(NB.SCHEDULE_DEFAULT), listBookings()]);
      const today = NB.jaToday(), now = Date.now();
      const upcoming = all.filter(x => x.phone === b.phone && x.date >= today && ['pending', 'confirmed'].includes(x.status)).length;
      if (upcoming >= MAX_UPCOMING_PER_PHONE) return { error: `You already have ${upcoming} upcoming bookings. Please WhatsApp Shen at 876-420-1683 to book more.` };
      if (all.filter(x => x.device === device && now - (x.createdAt || 0) < 3600e3).length >= MAX_PER_DEVICE_PER_HOUR) return { error: 'Too many bookings from this device. Please try again later or WhatsApp Shen at 876-420-1683.' };
      const day = NB.buildDays(schedule, all, b.date, b.date)[b.date];
      if (!day || !day.times.includes(b.time)) return { error: 'Sorry, that time was just taken. Please pick another.', taken: true };
      let ref;
      do ref = 'NB-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5); while (all.some(x => x.ref === ref));
      const rec = { ...b, ref, device, createdAt: Date.now(), status: b.pay === 'cash' ? 'confirmed' : 'pending', price: NB.price(b), reminders: {} };
      await saveBooking(rec);
      return { rec };
    });
    if (out.error) return json(res, 409, out);
    await newBooking(out.rec).catch(() => {});
    const r = out.rec;
    json(res, 201, { ref: r.ref, status: r.status, price: r.price });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

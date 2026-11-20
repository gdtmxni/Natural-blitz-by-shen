/* POST /api/admin/schedule  (admin only)
   { week: {0..6: {open,start,end,max}} }          saves the usual weekly hours
   { date: 'YYYY-MM-DD', rule: {open,start,end,max} } changes one day
   { date: 'YYYY-MM-DD', rule: null }                 puts that day back to the weekly hours
   { settings: { releaseUnpaid: true|false } }        release bank-transfer bookings with no deposit after 24 hours */
import '../../catalog.js';
import { getSchedule, saveSchedule } from '../../lib/store.js';
import { json, body } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';

const NB = globalThis.NB;
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');

function rule(r) {
  const out = { open: !!r.open, start: isTime(r.start) ? r.start : '09:00', end: isTime(r.end) ? r.end : '17:00', max: Math.max(0, Math.min(30, Math.round(+r.max || 0))) };
  if (out.end <= out.start) throw new Error('Closing time must be after opening time');
  return out;
}

export default async function handler(req, res) {
  if (!(await isAdmin(req))) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const p = body(req);
    const s = JSON.parse(JSON.stringify(await getSchedule(NB.SCHEDULE_DEFAULT)));
    s.days = s.days || {};
    if (p.week) for (let d = 0; d < 7; d++) if (p.week[d]) s.week[d] = rule(p.week[d]);
    if (p.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error('Bad date');
      if (p.rule === null) delete s.days[p.date];
      else s.days[p.date] = rule(p.rule || {});
    }
    if (p.settings && 'releaseUnpaid' in p.settings) s.releaseUnpaid = !!p.settings.releaseUnpaid;
    // forget old one-day changes
    const cutoff = NB.addDays(NB.jaToday(), -7);
    for (const d of Object.keys(s.days)) if (d < cutoff) delete s.days[d];
    await saveSchedule(s);
    json(res, 200, { schedule: s });
  } catch (e) {
    json(res, 400, { error: e.message });
  }
}

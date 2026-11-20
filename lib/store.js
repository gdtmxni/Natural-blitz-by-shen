/* Storage. Uses the Supabase database when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set,
   otherwise a local JSON file in .data/ (for testing on your own computer).
   Tables (see supabase/migrations): nb_bookings, nb_kv (schedule, gallery), nb_outbox, nb_locks. */
import fs from 'node:fs/promises';
import path from 'node:path';

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
export const backend = SB_URL && SB_KEY ? 'supabase' : 'file';

/* Supabase REST (PostgREST) with the server-only key */
async function sb(route, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  const j = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error('Database error: ' + ((j && (j.message || j.error)) || r.status));
  return j;
}
const enc = encodeURIComponent;
async function kvGet(key) { const rows = await sb(`nb_kv?key=eq.${enc(key)}&select=value`); return rows.length ? rows[0].value : null; }
async function kvSet(key, value) {
  await sb('nb_kv?on_conflict=key', { method: 'POST', body: { key, value, updated_at: new Date().toISOString() }, prefer: 'resolution=merge-duplicates,return=minimal' });
}

/* ---- local file store (one process, so a simple queue prevents overlapping writes) ---- */
const FILE = path.join(process.cwd(), '.data', 'db.json');
let queue = Promise.resolve();
async function readFile() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); }
  catch { return { bookings: {}, schedule: null, outbox: [] }; }
}
function withFile(fn) {
  if (process.env.VERCEL) throw new Error('No database connected. Add the Supabase settings to the Vercel project.');
  const run = queue.then(async () => {
    const db = await readFile();
    const out = await fn(db);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 2));
    return out;
  });
  queue = run.catch(() => {});
  return run;
}

export async function listBookings() {
  if (backend === 'supabase') {
    const out = [];
    for (let from = 0; ; from += 1000) { // PostgREST returns up to 1000 rows per request
      const rows = await sb(`nb_bookings?select=data&order=date.asc&offset=${from}&limit=1000`);
      out.push(...rows.map(r => r.data));
      if (rows.length < 1000) return out;
    }
  }
  return withFile(db => Object.values(db.bookings));
}
export async function getBooking(ref) {
  if (backend === 'supabase') { const rows = await sb(`nb_bookings?ref=eq.${enc(ref)}&select=data`); return rows.length ? rows[0].data : null; }
  return withFile(db => db.bookings[ref] || null);
}
export async function saveBooking(b) {
  if (backend === 'supabase') {
    return sb('nb_bookings?on_conflict=ref', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: { ref: b.ref, date: b.date, status: b.status, data: b, created_at: new Date(b.createdAt || Date.now()).toISOString(), updated_at: new Date().toISOString() } });
  }
  return withFile(db => { db.bookings[b.ref] = b; });
}
export async function getSchedule(dflt) {
  if (backend === 'supabase') return (await kvGet('schedule')) || dflt;
  return withFile(db => db.schedule || dflt);
}
export async function saveSchedule(s) {
  if (backend === 'supabase') return kvSet('schedule', s);
  return withFile(db => { db.schedule = s; });
}
/* Shen's gallery: { photos: [...], videos: [...] }, or null until she changes it */
export async function getGallery() {
  if (backend === 'supabase') return kvGet('gallery');
  return withFile(db => db.gallery || null);
}
export async function saveGallery(g) {
  if (backend === 'supabase') return kvSet('gallery', g);
  return withFile(db => { db.gallery = g; });
}
/* Small settings documents: 'prices', 'auth' */
export async function getSetting(key) {
  if (backend === 'supabase') return kvGet(key);
  return withFile(db => (db.settings || {})[key] ?? null);
}
export async function saveSetting(key, value) {
  if (backend === 'supabase') return kvSet(key, value);
  return withFile(db => { db.settings = db.settings || {}; db.settings[key] = value; });
}
/* Visitor counts: one row per day and page (no personal data) */
export async function countVisit(day, page, isNew) {
  if (backend === 'supabase') return sb('rpc/nb_count_visit', { method: 'POST', body: { d: day, p: page, is_new: !!isNew } });
  return withFile(db => {
    db.visits = db.visits || {}; const k = day + '|' + page; const v = db.visits[k] || { day, page, views: 0, visits: 0 };
    v.views++; if (isNew) v.visits++; db.visits[k] = v;
  });
}
export async function listVisits(fromDay) {
  if (backend === 'supabase') return sb(`nb_visits?day=gte.${enc(fromDay)}&select=day,page,views,visits&order=day.asc&limit=5000`);
  return withFile(db => Object.values(db.visits || {}).filter(v => v.day >= fromDay));
}
export async function logMessage(m) {
  const entry = Object.assign({ at: Date.now() }, m);
  if (backend === 'supabase') { await sb('rpc/nb_log_message', { method: 'POST', body: { m: entry } }); return; }
  return withFile(db => { db.outbox.unshift(entry); db.outbox = db.outbox.slice(0, 200); });
}
export async function listMessages(n = 60) {
  if (backend === 'supabase') return (await sb(`nb_outbox?select=data&order=id.desc&limit=${+n || 60}`)).map(r => r.data);
  return withFile(db => db.outbox.slice(0, n));
}
/* Short-lived lock so two customers can't grab the last spot at the same moment. */
const localLocks = new Map();
export async function withLock(key, fn) {
  if (backend !== 'supabase') { // one process locally: an in-memory queue is enough
    const prev = localLocks.get(key) || Promise.resolve();
    let release; const mine = new Promise(r => (release = r));
    localLocks.set(key, prev.then(() => mine));
    await prev;
    try { return await fn(); } finally { release(); }
  }
  for (let i = 0; i < 25; i++) {
    if (await sb('rpc/nb_try_lock', { method: 'POST', body: { k: key, ms: 8000 } })) {
      try { return await fn(); } finally { await sb(`nb_locks?key=eq.${enc(key)}`, { method: 'DELETE' }).catch(() => {}); }
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Busy, please try again');
}

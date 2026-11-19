/* Storage. Uses Upstash Redis (Vercel Marketplace) when its env vars are set,
   otherwise a local JSON file in .data/ (for testing on your own computer). */
import fs from 'node:fs/promises';
import path from 'node:path';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const backend = URL_ && TOKEN ? 'redis' : 'file';

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error('Database error: ' + j.error);
  return j.result;
}

/* ---- local file store (one process, so a simple queue prevents overlapping writes) ---- */
const FILE = path.join(process.cwd(), '.data', 'db.json');
let queue = Promise.resolve();
async function readFile() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); }
  catch { return { bookings: {}, schedule: null, outbox: [] }; }
}
function withFile(fn) {
  if (process.env.VERCEL) throw new Error('No database connected. Add Upstash Redis to the Vercel project.');
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
  if (backend === 'redis') {
    const flat = (await redis('HGETALL', 'nb:bookings')) || [];
    const out = []; for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]));
    return out;
  }
  return withFile(db => Object.values(db.bookings));
}
export async function getBooking(ref) {
  if (backend === 'redis') { const v = await redis('HGET', 'nb:bookings', ref); return v ? JSON.parse(v) : null; }
  return withFile(db => db.bookings[ref] || null);
}
export async function saveBooking(b) {
  if (backend === 'redis') return redis('HSET', 'nb:bookings', b.ref, JSON.stringify(b));
  return withFile(db => { db.bookings[b.ref] = b; });
}
export async function getSchedule(dflt) {
  if (backend === 'redis') { const v = await redis('GET', 'nb:schedule'); return v ? JSON.parse(v) : dflt; }
  return withFile(db => db.schedule || dflt);
}
export async function saveSchedule(s) {
  if (backend === 'redis') return redis('SET', 'nb:schedule', JSON.stringify(s));
  return withFile(db => { db.schedule = s; });
}
export async function logMessage(m) {
  const entry = Object.assign({ at: Date.now() }, m);
  if (backend === 'redis') { await redis('LPUSH', 'nb:outbox', JSON.stringify(entry)); await redis('LTRIM', 'nb:outbox', 0, 199); return; }
  return withFile(db => { db.outbox.unshift(entry); db.outbox = db.outbox.slice(0, 200); });
}
export async function listMessages(n = 60) {
  if (backend === 'redis') return ((await redis('LRANGE', 'nb:outbox', 0, n - 1)) || []).map(s => JSON.parse(s));
  return withFile(db => db.outbox.slice(0, n));
}
/* Short-lived lock so two customers can't grab the last spot at the same moment. */
const localLocks = new Map();
export async function withLock(key, fn) {
  if (backend !== 'redis') { // one process locally: an in-memory queue is enough
    const prev = localLocks.get(key) || Promise.resolve();
    let release; const mine = new Promise(r => (release = r));
    localLocks.set(key, prev.then(() => mine));
    await prev;
    try { return await fn(); } finally { release(); }
  }
  const k = 'nb:lock:' + key;
  for (let i = 0; i < 25; i++) {
    if (await redis('SET', k, '1', 'NX', 'PX', 8000)) {
      try { return await fn(); } finally { await redis('DEL', k); }
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Busy, please try again');
}

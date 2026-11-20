/* PUT /api/admin/media?path=...  (admin only, local testing)
   Receives an uploaded photo or video when no Supabase storage is connected.
   With Supabase connected, the browser uploads straight to Supabase instead. */
import { isAdmin } from '../../lib/auth.js';
import { json } from '../../lib/http.js';
import { mediaBackend, saveLocal, validPath, LIMIT } from '../../lib/media.js';

export const raw = true; // the local dev server leaves the request body unread for this one

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'PUT') return json(res, 405, { error: 'Method not allowed' });
  if (mediaBackend !== 'file' || process.env.VERCEL) return json(res, 400, { error: 'Uploads go to Supabase storage' });
  const p = String(req.query.path || '');
  if (!validPath(p)) return json(res, 400, { error: 'Bad file name' });
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > LIMIT.video) return json(res, 413, { error: 'File too big' }); chunks.push(c); }
  try { await saveLocal(p, Buffer.concat(chunks)); json(res, 200, { ok: true }); }
  catch (e) { json(res, 400, { error: e.message }); }
}

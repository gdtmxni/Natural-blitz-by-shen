/* POST /api/admin/login {password}   GET: am I logged in?   DELETE: log out */
import { json, body } from '../../lib/http.js';
import { configured, checkPassword, isAdmin, setCookie, clearCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { admin: await isAdmin(req), configured: configured() });
  if (req.method === 'DELETE') { clearCookie(res, req); return json(res, 200, { ok: true }); }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!configured()) return json(res, 503, { error: 'Admin login is not set up yet (ADMIN_PASSWORD and ADMIN_SECRET).' });
  if (!(await checkPassword(body(req).password))) {
    await new Promise(r => setTimeout(r, 700)); // slows down password guessing
    return json(res, 401, { error: 'Wrong password' });
  }
  await setCookie(res, req);
  json(res, 200, { ok: true });
}

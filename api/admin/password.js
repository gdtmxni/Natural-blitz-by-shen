/* POST /api/admin/password {current, next}  (admin only) changes the dashboard password.
   Every other device is logged out; this one stays logged in. */
import { json, body } from '../../lib/http.js';
import { isAdmin, checkPassword, changePassword, setCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (!(await isAdmin(req))) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { current, next } = body(req);
  if (!(await checkPassword(current))) { await new Promise(r => setTimeout(r, 700)); return json(res, 400, { error: 'Your current password is not right' }); }
  const pw = String(next || '');
  if (pw.length < 8) return json(res, 400, { error: 'Use at least 8 characters' });
  if (pw.length > 200) return json(res, 400, { error: 'That password is too long' });
  try { await changePassword(pw); await setCookie(res, req); json(res, 200, { ok: true }); }
  catch (e) { json(res, 500, { error: e.message }); }
}

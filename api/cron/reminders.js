/* GET /api/cron/reminders  sends due 24h / 2h reminders.
   Called by a scheduler with "Authorization: Bearer CRON_SECRET", or by a logged-in admin. */
import { json } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';
import { runReminders } from '../../lib/reminders.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const ok = (secret && req.headers.authorization === `Bearer ${secret}`) || (await isAdmin(req));
  if (!ok) return json(res, 401, { error: 'Not allowed' });
  try { json(res, 200, await runReminders()); }
  catch (e) { json(res, 500, { error: e.message }); }
}

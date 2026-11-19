/* POST /api/admin/booking {ref, action}  action: deposit | done | cancel | restore  (admin only) */
import { getBooking, saveBooking, withLock } from '../../lib/store.js';
import { json, body } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';
import { depositReceived, cancelled } from '../../lib/notify.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { ref, action, notify = true } = body(req);
  try {
    const out = await withLock('b:' + ref, async () => {
      const b = await getBooking(String(ref || ''));
      if (!b) return { error: 'Booking not found' };
      const now = Date.now();
      if (action === 'deposit') { b.status = 'confirmed'; b.depositAt = now; }
      else if (action === 'done') { b.status = 'done'; b.doneAt = now; }
      else if (action === 'cancel') { b.status = 'cancelled'; b.cancelledAt = now; }
      else if (action === 'restore') { b.status = b.depositAt || b.pay === 'cash' ? 'confirmed' : 'pending'; delete b.cancelledAt; }
      else return { error: 'Unknown action' };
      await saveBooking(b);
      return { b };
    });
    if (out.error) return json(res, 400, out);
    if (notify && action === 'deposit') await depositReceived(out.b).catch(() => {});
    if (notify && action === 'cancel') await cancelled(out.b).catch(() => {});
    json(res, 200, { booking: out.b });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

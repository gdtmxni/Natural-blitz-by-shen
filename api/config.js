/* GET /api/config  public settings the booking page needs (bank transfer details shown after booking) */
import { json } from '../lib/http.js';
import { bankInfo } from '../lib/bank.js';

export default function handler(req, res) {
  const b = bankInfo();
  json(res, 200, { bank: b.accountNumber ? b : { bank: b.bank } });
}

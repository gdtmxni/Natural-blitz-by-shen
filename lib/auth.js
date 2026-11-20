/* Admin login: one password and a signed, http-only cookie (ADMIN_SECRET).
   The password starts as ADMIN_PASSWORD. Once Shen changes it in the dashboard, a salted hash is stored
   (setting 'auth') and replaces it; changing it also logs out every other device. */
import crypto from 'node:crypto';
import { getSetting, saveSetting } from './store.js';

const COOKIE = 'nb_admin';
const DAYS = 30;
export const configured = () => !!(process.env.ADMIN_PASSWORD && (process.env.ADMIN_SECRET || '').length >= 16);

let cache = null, at = 0;
async function state() { // { hash, salt, ver } once the password was changed in the dashboard
  if (!cache || Date.now() - at > 10e3) { cache = (await getSetting('auth').catch(() => null)) || {}; at = Date.now(); }
  return cache;
}
const sha = v => crypto.createHash('sha256').update(String(v || '')).digest();
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(String(pw || ''), salt, 32, (e, k) => (e ? no(e) : ok(k))));

export async function checkPassword(pw) {
  if (!configured()) return false;
  const s = await state();
  if (s.hash) { const k = await scrypt(pw, s.salt); return crypto.timingSafeEqual(k, Buffer.from(s.hash, 'base64')); }
  return crypto.timingSafeEqual(sha(pw), sha(process.env.ADMIN_PASSWORD));
}
export async function changePassword(next) {
  const salt = crypto.randomBytes(16).toString('base64');
  const s = { hash: (await scrypt(next, salt)).toString('base64'), salt, ver: crypto.randomBytes(6).toString('base64url'), at: Date.now() };
  await saveSetting('auth', s);
  cache = s; at = Date.now();
}

const sign = v => crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(v).digest('base64url');
async function makeToken() { const v = (await state()).ver || '0'; const exp = String(Date.now() + DAYS * 864e5); return `${exp}.${v}.${sign(exp + '.' + v)}`; }
async function verify(token) {
  if (!configured() || !token) return false;
  const [exp, ver, sig] = token.split('.');
  if (!exp || !ver || !sig || +exp < Date.now()) return false;
  const good = sign(exp + '.' + ver);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return ver === ((await state()).ver || '0'); // a password change logs out old sessions
}
export async function isAdmin(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)nb_admin=([^;]+)/);
  return verify(m ? decodeURIComponent(m[1]) : '');
}
const secure = req => (process.env.VERCEL || String(req.headers['x-forwarded-proto'] || '').includes('https')) ? '; Secure' : '';
export async function setCookie(res, req) {
  res.setHeader('Set-Cookie', `${COOKIE}=${await makeToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DAYS * 86400}${secure(req)}`);
}
export function clearCookie(res, req) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure(req)}`);
}

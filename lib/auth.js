/* Admin login: one password (ADMIN_PASSWORD) and a signed, http-only cookie (ADMIN_SECRET). */
import crypto from 'node:crypto';

const COOKIE = 'nb_admin';
const DAYS = 30;
export const configured = () => !!(process.env.ADMIN_PASSWORD && (process.env.ADMIN_SECRET || '').length >= 16);

const sha = v => crypto.createHash('sha256').update(String(v || '')).digest();
export function checkPassword(pw) {
  return configured() && crypto.timingSafeEqual(sha(pw), sha(process.env.ADMIN_PASSWORD));
}
const sign = v => crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(v).digest('base64url');
export function makeToken() { const exp = String(Date.now() + DAYS * 864e5); return `${exp}.${sign(exp)}`; }
function verify(token) {
  if (!configured() || !token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
export function isAdmin(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)nb_admin=([^;]+)/);
  return verify(m ? decodeURIComponent(m[1]) : '');
}
const secure = req => (process.env.VERCEL || String(req.headers['x-forwarded-proto'] || '').includes('https')) ? '; Secure' : '';
export function setCookie(res, req) {
  res.setHeader('Set-Cookie', `${COOKIE}=${makeToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DAYS * 86400}${secure(req)}`);
}
export function clearCookie(res, req) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure(req)}`);
}

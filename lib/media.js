/* Photo and video storage for the gallery.
   Uses Supabase Storage (a public "gallery" bucket) when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set,
   otherwise saves files in .data/media/ (for testing on your own computer).
   The browser sends files straight to storage, so big videos never pass through a Vercel function. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
export const BUCKET = process.env.SUPABASE_BUCKET || 'gallery';
export const mediaBackend = SB_URL && SB_KEY ? 'supabase' : 'file';

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
export const TYPE_OF = Object.fromEntries(Object.entries(EXT).map(([t, e]) => [e, t]));
export const LIMIT = { image: 8 * 1024 * 1024, video: 50 * 1024 * 1024 }; // 50 MB is Supabase's free-plan file limit
const LOCAL_DIR = path.join(process.cwd(), '.data', 'media');
const PATH_RE = /^\d{4}-\d{2}\/[A-Za-z0-9_-]{8,40}\.(webp|jpg|png|mp4|mov|webm)$/;
export const validPath = p => PATH_RE.test(p || '');

export const publicUrl = p => (mediaBackend === 'supabase' ? `${SB_URL}/storage/v1/object/public/${BUCKET}/${p}` : `/media/${p}`);
/* The storage path of a file we uploaded, or '' for anything else (built-in assets, other sites). */
export function pathOf(url) {
  const pre = publicUrl('');
  if (!String(url || '').startsWith(pre)) return '';
  const p = url.slice(pre.length);
  return validPath(p) ? p : '';
}

async function sb(route, opt = {}) {
  const r = await fetch(`${SB_URL}/storage/v1${route}`, {
    ...opt,
    headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY, 'Content-Type': 'application/json', ...(opt.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || j.error || `Storage error (${r.status})`); e.status = r.status; throw e; }
  return j;
}
let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  try {
    await sb('/bucket', { method: 'POST', body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: LIMIT.video, allowed_mime_types: Object.keys(EXT) }) });
  } catch (e) {
    if (!/exist|duplicate/i.test(e.message)) throw e; // already made: fine
  }
  bucketReady = true;
}

/* Step 1 of an upload: pick a file name and say where the browser should send the file. */
export async function prepareUpload(type, size) {
  const ext = EXT[type];
  if (!ext) throw new Error('Please use a JPG, PNG or WebP photo, or an MP4 or MOV video');
  const kind = type.startsWith('video/') ? 'video' : 'image';
  if (!(size > 0)) throw new Error('That file is empty');
  if (size > LIMIT[kind]) throw new Error(kind === 'video' ? 'Videos can be up to 50 MB. Try a shorter clip.' : 'Photos can be up to 8 MB');
  const p = `${new Date().toISOString().slice(0, 7)}/${crypto.randomBytes(12).toString('base64url')}.${ext}`;
  if (mediaBackend === 'supabase') {
    await ensureBucket();
    const j = await sb(`/object/upload/sign/${BUCKET}/${p}`, { method: 'POST', body: '{}' });
    return { path: p, url: publicUrl(p), upload: { method: 'PUT', url: `${SB_URL}/storage/v1${j.url}`, form: true } };
  }
  return { path: p, url: publicUrl(p), upload: { method: 'PUT', url: `/api/admin/media?path=${encodeURIComponent(p)}`, form: false } };
}

/* Local testing only: the browser PUTs the file here. */
export async function saveLocal(p, buf) {
  if (!validPath(p)) throw new Error('Bad file name');
  const file = path.join(LOCAL_DIR, p);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
}

export async function removeMedia(p) {
  if (!validPath(p)) return;
  if (mediaBackend === 'supabase') await sb(`/object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [p] }) });
  else await fs.unlink(path.join(LOCAL_DIR, p)).catch(() => {});
}
export const localFile = p => (validPath(p) ? path.join(LOCAL_DIR, p) : '');

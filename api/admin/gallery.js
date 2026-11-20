/* POST /api/admin/gallery  (admin only)
   { photos: [...], videos: [...] }   saves the whole gallery (order = order on the site)
   { upload: { type, size } }         step 1 of adding a file: returns where the browser should send it
   { reset: true }                    puts the launch gallery back */
import '../../gallery.js';
import { getGallery, saveGallery } from '../../lib/store.js';
import { prepareUpload, pathOf, removeMedia } from '../../lib/media.js';
import { json, body, clip } from '../../lib/http.js';
import { isAdmin } from '../../lib/auth.js';

const G = globalThis.NB_GALLERY;
const BUILT_IN = new Set([...G.PHOTOS.flatMap(p => [p.src]), ...G.VIDEOS.flatMap(v => [v.src, v.poster])]);
const okSrc = s => BUILT_IN.has(s) || !!pathOf(s);
const okId = id => /^[A-Za-z0-9_-]{1,40}$/.test(id || '');
const okCat = c => G.CATS.some(x => x.id === c);

function cleanPhoto(p, i) {
  const where = `Photo ${i + 1}`;
  if (!okId(p.id)) throw new Error(`${where}: bad id`);
  if (!okSrc(p.src)) throw new Error(`${where}: unknown image`);
  if (!okCat(p.cat)) throw new Error(`${where}: pick a section`);
  const name = clip(p.name, 60); if (!name) throw new Error(`${where}: add a name`);
  return { id: p.id, name, cat: p.cat, desc: clip(p.desc, 160), src: p.src };
}
function cleanVideo(v, i) {
  const where = `Video ${i + 1}`;
  if (!okId(v.id)) throw new Error(`${where}: bad id`);
  if (!okSrc(v.src) || !okSrc(v.poster)) throw new Error(`${where}: unknown file`);
  if (!okCat(v.cat)) throw new Error(`${where}: pick a section`);
  const name = clip(v.name, 60); if (!name) throw new Error(`${where}: add a name`);
  return { id: v.id, name, sub: clip(v.sub, 90), cat: v.cat, book: okId(v.book) ? v.book : '', src: v.src, poster: v.poster };
}
const files = g => new Set([...(g.photos || []).map(p => p.src), ...(g.videos || []).flatMap(v => [v.src, v.poster])]);

export default async function handler(req, res) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Please log in' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const p = body(req);
    if (p.upload) return json(res, 200, await prepareUpload(String(p.upload.type || ''), +p.upload.size || 0));

    const before = (await getGallery()) || { photos: G.PHOTOS, videos: G.VIDEOS };
    let next;
    if (p.reset) next = { photos: G.PHOTOS, videos: G.VIDEOS };
    else {
      if (!Array.isArray(p.photos) || !Array.isArray(p.videos)) throw new Error('Nothing to save');
      if (p.photos.length > G.MAX.photos) throw new Error(`The gallery holds up to ${G.MAX.photos} photos`);
      if (p.videos.length > G.MAX.videos) throw new Error(`The gallery holds up to ${G.MAX.videos} videos`);
      next = { photos: p.photos.map(cleanPhoto), videos: p.videos.map(cleanVideo) };
      const ids = [...next.photos, ...next.videos].map(x => x.id);
      if (new Set(ids).size !== ids.length) throw new Error('Two items have the same id');
    }
    next.updatedAt = Date.now();
    await saveGallery(next);
    // delete uploaded files that are no longer used
    const keep = files(next);
    await Promise.all([...files(before)].filter(s => !keep.has(s)).map(s => pathOf(s)).filter(Boolean).map(f => removeMedia(f).catch(() => {})));
    json(res, 200, next);
  } catch (e) {
    json(res, 400, { error: e.message });
  }
}

/* GET /api/gallery  the photos and videos on the Gallery page (Shen's choices, or the launch set) */
import '../gallery.js';
import { getGallery } from '../lib/store.js';
import { json } from '../lib/http.js';

const G = globalThis.NB_GALLERY;

export default async function handler(req, res) {
  try {
    const g = await getGallery();
    json(res, 200, { photos: g ? g.photos : G.PHOTOS, videos: g ? g.videos : G.VIDEOS, custom: !!g });
  } catch (e) {
    json(res, 200, { photos: G.PHOTOS, videos: G.VIDEOS, custom: false });
  }
}

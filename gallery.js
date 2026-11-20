/* Natural Blitz by Shen: the gallery that ships with the site.
   Shen changes the live gallery from the dashboard (Gallery tab); this list is what shows
   until she does, and it sets the most photos and videos the gallery can hold.
   Used by the website and admin (<script src="gallery.js">) and the server (import '../gallery.js'). */
globalThis.NB_GALLERY = (() => {
  // the sections (filter buttons) on the Gallery page. "All" is automatic.
  const CATS = [
    { id: 'curls', name: 'Curls' },
    { id: 'waves', name: 'Waves' },
    { id: 'straight', name: 'Sleek & Bobs' },
    { id: 'updo', name: 'Ponytails & Updos' },
    { id: 'colour', name: 'Colour' },
    { id: 'locs', name: 'Locs' },
    { id: 'kids', name: 'Kids' },
    { id: 'wigs', name: 'Wig care' },
  ];
  const look = (id, name, cat, desc) => ({ id, name, cat, desc, src: `assets/looks/${id}.webp` });
  const PHOTOS = [
    look('n_bridal', 'Bridal Half-Up Curls', 'updo', 'Soft bridal curls, a sleek swoop and a sparkling tiara for the big day.'),
    look('n_halfup', 'Braided Half-Up Curls', 'curls', 'Feed-in braids into a high half-up with long, juicy curls and laid edges.'),
    look('n_pony', 'Ginger Curly Ponytail', 'updo', 'Snatched sleek ponytail with a ginger curly extension and a baby-hair swirl.'),
    look('n_waves', 'Finger Waves & Curls', 'waves', 'Glossy sculpted waves and swirled edges into soft, defined curls.'),
    look('n_updo', 'Curly Updo & Swoop', 'updo', 'Pinned curly updo with sweeping side bangs and soft face-framing curls.'),
    look('n_locs2', 'Barrel Twist Locs', 'locs', 'Fresh retwist with neat parts and full, glossy barrel twists.'),
    look('n_locs1', 'Loc Retwist & Style', 'locs', 'Clean diamond parts and a defined, polished loc style.'),
    look('r3c6', 'Deep Wave Half-Up', 'curls', 'Juicy deep-wave curls with a sleek half-up top and laid edges.'),
    look('r1c1', 'Curly Crown Ponytail', 'updo', 'Defined curls pulled up with sculpted, swirled edges.'),
    look('r2c1', 'Side-Part Body Wave', 'waves', 'Glossy, voluminous waves swept over one shoulder.'),
    look('r3c3', 'Copper Curls', 'colour', 'Bold copper-orange curls with a soft, glowing finish.'),
    look('r4c2', 'Bone Straight', 'straight', 'Silky, swingy and straight from root to tip.'),
    look('r3c5', 'Genie Ponytail', 'updo', 'High, sleek ponytail with a sharp sweep and baby hairs.'),
    look('r1c3', 'Honey Blonde Waves', 'colour', 'Soft honey-blonde waves with a dark, natural root.'),
    look('r2c4', 'Natural Curly Frontal', 'curls', 'Bouncy natural curls with a melted, middle-part frontal.'),
    look('r4c6', 'Silver Bob', 'colour', 'Sleek, blunt silver bob with a crisp swoop.'),
    look('r2c6', 'Swoop Bob', 'straight', 'Shoulder bob with a centre part and finger-wave edges.'),
    look('r1c4', 'Sleek Ponytail', 'updo', 'Snatched, glossy pony with a clean, flat finish.'),
    look('r4c3', 'Sleek Sweep Waves', 'waves', 'Slicked-back sweep falling into long, loose waves.'),
    look('r2c3', 'Burgundy Frontal', 'colour', 'Rich burgundy unit styled up with a smooth finish.'),
    look('r4c4', 'Glam Loose Waves', 'waves', 'Bouncy, red-carpet waves with sculpted edges.'),
    look('r2c5', 'Honey Straight', 'colour', 'Straight honey-blonde unit with a soft side part.'),
    look('r2c2', 'Space Buns', 'updo', 'Two playful buns with swirled, detailed edges.'),
    look('r3c4', 'Laid Frontal Install', 'straight', 'Smooth frontal install with a natural, melted hairline.'),
    look('r4c1', 'Curly Middle Part', 'curls', 'Full curls with a clean middle part and soft edges.'),
    look('r3c2', 'Braids & Curls', 'curls', 'Side braids flowing into wet-look curls.'),
  ];
  const clip = (id, name, sub, cat, book) => ({ id, name, sub, cat, book, src: `assets/video/${id}.mp4`, poster: `assets/video/${id}.jpg` });
  const VIDEOS = [
    clip('v1', 'Braids & Curls', 'Side braids into wet-look curls', 'curls', 'r3c2'),
    clip('v2', 'Burgundy Ponytail', 'Sleek burgundy pony with sculpted edges', 'colour', 'r2c3'),
    clip('v3', 'Braided Curly Frontal', 'Cornrow side detail with bouncy curls', 'curls', 'r2c4'),
    clip('v4', 'Sleek Frontal Waves', 'Slicked frontal, 3 weeks in and still laid', 'waves', 'r4c1'),
  ];
  // the gallery can hold as many photos and videos as it had at launch
  const MAX = { photos: PHOTOS.length, videos: VIDEOS.length };
  const catName = id => (CATS.find(c => c.id === id) || {}).name || '';
  // which booking a "Book it" button opens for a gallery section
  const bookCat = cat => (cat === 'locs' ? 'locs' : cat === 'kids' ? 'kids' : cat === 'wigs' ? 'wig' : 'style');
  return { CATS, PHOTOS, VIDEOS, MAX, catName, bookCat };
})();

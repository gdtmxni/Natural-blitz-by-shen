/* Natural Blitz by Shen: services, prices and booking rules.
   One source of truth, used by the website (<script src="catalog.js">)
   and by the server (import '../catalog.js'). Change prices here only. */
globalThis.NB = (() => {
  const jmd = n => 'J$' + Math.round(n).toLocaleString('en-US');

  const CATS = [
    { id: 'wig', name: 'Wig care', desc: 'Wash, restore & restyle your wig',
      icon: '<circle cx="8" cy="9" r="3"/><circle cx="15.5" cy="7.5" r="2"/><circle cx="14" cy="15" r="4"/><circle cx="7" cy="17" r="1.6"/>' },
    { id: 'style', name: 'Hairstyling', desc: 'Installs, natural hair & ponytails',
      icon: '<path d="M12 3c-4 0-7 3-7 7v9h3v-5h8v5h3v-9c0-4-3-7-7-7z"/>' },
    { id: 'kids', name: 'Kiddies hair', desc: 'Cornrows, plaits & braids',
      icon: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>' },
    { id: 'locs', name: 'Locs', desc: 'Retwists & loc styles',
      icon: '<path d="M8 3c0 6 2 6 2 12s-2 6-2 6M12 3c0 6 2 6 2 12s-2 6-2 6M16 3c0 6 2 6 2 12s-2 6-2 6"/>' },
  ];

  /* ---------- wig care (Wig Laundry Mat price list) ---------- */
  const TIERS = ['10–18"', '20–24"', '24"+'];
  const WIG_MAIN = [
    { id: 'sig', name: 'Blitz Signature Wash', desc: 'Detangle, glue removal, shampoo, deep condition, air dry',
      tiers: { '10–18"': 800, '20–24"': 1000, '24"+': 1500 },
      icon: '<circle cx="8" cy="9" r="3"/><circle cx="15.5" cy="7.5" r="2"/><circle cx="14" cy="15" r="4"/><circle cx="7" cy="17" r="1.6"/>' },
    { id: 'blow', name: 'Wash & Blow Dry', desc: 'Detangle, glue removal, deep cleanse, condition, blow-dry finish',
      tiers: { '10–18"': 1800, '20–24"': 2500, '24"+': 2500 },
      icon: '<path d="M3 7h11a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H8l-2 7H4l1-7H3z"/><path d="M19 8h2M19 12h2M18.5 4.5l1.5-1"/>' },
    { id: 'wstyle', name: 'Wash & Style', desc: 'Wash, condition, blow dry, then curl or straighten', flat: 2000, styled: true,
      icon: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>' },
    { id: 'bundle', name: 'Bundle & weave laundry', desc: '', bundle: true,
      icon: '<rect x="4" y="5" width="16" height="4" rx="1.5"/><rect x="4" y="10" width="16" height="4" rx="1.5"/><rect x="4" y="15" width="16" height="4" rx="1.5"/>' },
  ];
  const BUNDLE = { one: 600, three: 1500 }; // one bundle, or the 3-bundle package
  const WIG_TYPES = ['Lace front / closure', 'Full lace', '360 lace', 'Headband', 'Glueless'];
  const WIG_REPAIRS = [{ id: 'stitch', name: 'Lace stitching', p: 1000 }, { id: 'clip', name: 'Clip up (trashy ends)', p: 500 }];
  const DAMAGE = ['Lace tears or holes', 'Shedding', 'Matting or tangles', 'Glue or product build-up', 'Thin or bald spots', 'Dry or burnt ends'];
  const WIG_STYLING = [
    { id: 'curl', name: 'Curl refresh', p: 800, d: 'Revive and redefine the curls' },
    { id: 'flat', name: 'Flat iron finish', p: 800, d: 'Sleek, straight finish' },
    { id: 'custom', name: 'Custom styling', p: 2000, from: true, d: 'Pick a look or send a photo' },
  ];
  const WSTYLE_FINISH = ['Curled', 'Straightened'];
  const AREAS = { 'Kingston': 500, 'Portmore': 1000, 'Spanish Town': 1500, 'Other area': null };
  const DROP_DAYS = 2; // every wig must be dropped off this many days before pick-up / delivery

  /* ---------- hairstyling, kiddies, locs (Price list) ---------- */
  const SVCS = {
    style: [
      { id: 'melt', grp: 'Signature wig services', name: 'The Signature Melt (Frontal Install)', p: 4000, dur: '3h', d: 'Includes braid-down, install & styling' },
      { id: 'softglam', grp: 'Signature wig services', name: 'The Soft Glam Install (Closure Wig)', p: 2800, dur: '45 min', d: 'Natural finish, beginner-friendly install' },
      { id: 'reinstall', grp: 'Signature wig services', name: 'Reinstall / Refresh', p: 4000, to: 7000, dur: '3h', d: 'Clean-up, reapply, restyle' },
      { id: 'customize', grp: 'Signature wig services', name: 'Wig Customization Only', p: 6000, to: 9000, d: 'Plucking, bleaching knots, styling, adjusting wig size' },
      { id: 'silk', grp: 'Natural hair luxury', name: 'Silk Press Deluxe', p: 6500, dur: '2h', d: 'Includes wash, treatment & trim' },
      { id: 'blowout', grp: 'Natural hair luxury', name: 'Blowout + Style', p: 3000, dur: '1h 30 min' },
      { id: 'curldef', grp: 'Natural hair luxury', name: 'Defined Curl Styling', p: 4000, from: true, dur: '1h 30 min' },
      { id: 'pony', grp: 'Ponytails & quick slay', name: 'Sleek Ponytail (Extension)', vars: [{ n: 'Processed hair', p: 3000, dur: '1h' }, { n: 'Natural hair', p: 4500, dur: '2h' }] },
      { id: 'halfup', grp: 'Ponytails & quick slay', name: 'Half-Up Half-Down Glam', p: 4000, dur: '2h' },
      { id: 'quickweave', grp: 'Ponytails & quick slay', name: 'Quick Weave Slay', p: 2500, dur: '2h' },
      { id: 'glamcurls', grp: 'Ponytails & quick slay', name: 'Soft Glam Curls (Styling only)', p: 2500, dur: '1h' },
    ],
    kids: [
      { id: 'cornrows', name: 'Luxury Cornrows', vars: [{ n: 'Small', p: 2500 }, { n: 'Medium', p: 1800 }, { n: 'Large', p: 1500 }], d: 'Starts with a hair treatment' },
      { id: 'plaits', name: 'Signature Plaits', vars: [{ n: 'Small', p: 2500 }, { n: 'Medium', p: 1800 }], d: 'Starts with a hair treatment' },
      { id: 'kidsother', name: 'Twists, braids & twist outs', quote: true, d: 'Twists, braids, mini braids or twist outs. Price to be confirmed.' },
    ],
    locs: [
      { id: 'retwist', name: 'Loc retwist', quote: true, d: 'Priced by loc length and density' },
      { id: 'barrel', name: 'Barrel twists', quote: true, d: 'Priced by loc length and density' },
      { id: 'locstyle', name: 'Loc style', quote: true, d: 'Priced by length, density and style' },
    ],
  };
  const ADDONS = [{ id: 'tint', name: 'Lace Tinting', p: 2000 }, { id: 'hwash', name: 'Hair Wash Add-On', p: 2500 }];

  /* ---------- schedule defaults (Shen changes these in the admin dashboard) ---------- */
  const SCHEDULE_DEFAULT = {
    step: 60, // minutes between start times
    week: { // 0 = Sunday
      0: { open: false, start: '09:00', end: '17:00', max: 4 },
      1: { open: true, start: '09:00', end: '17:00', max: 4 },
      2: { open: true, start: '09:00', end: '17:00', max: 4 },
      3: { open: true, start: '09:00', end: '17:00', max: 4 },
      4: { open: true, start: '09:00', end: '17:00', max: 4 },
      5: { open: true, start: '09:00', end: '17:00', max: 4 },
      6: { open: true, start: '09:00', end: '17:00', max: 4 },
    },
    days: {}, // 'YYYY-MM-DD': { open, start, end, max } overrides one date
  };
  const BOOK_AHEAD_DAYS = 90;

  /* ---------- helpers ---------- */
  const wigMain = id => WIG_MAIN.find(m => m.id === id) || WIG_MAIN[0];
  const svc = (cat, id) => (SVCS[cat] || []).find(s => s.id === id) || null;
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
  const weekday = s => new Date(s + 'T12:00:00Z').getUTCDay();
  const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
  const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const fmtTime = t => { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${pad(m)} ${ap}`; };
  const fmtDate = (s, long) => s ? new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', long ? { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' } : { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
  // Jamaica is UTC-5 all year (no daylight saving)
  const jaToday = (now = Date.now()) => ymd(new Date(now - 5 * 3600e3));
  const apptTime = (date, time) => Date.parse(`${date}T${time || '09:00'}:00-05:00`);

  function dayRule(schedule, date) {
    const s = schedule || SCHEDULE_DEFAULT;
    const base = (s.week || SCHEDULE_DEFAULT.week)[weekday(date)] || { open: false };
    const o = (s.days || {})[date];
    return Object.assign({}, base, o || {}, { custom: !!o });
  }
  function dayTimes(rule, step) {
    const out = []; const st = step || 60;
    for (let m = toMin(rule.start); m + st <= toMin(rule.end); m += st) out.push(fromMin(m));
    return out;
  }
  /* Availability for each date between from..to. bookings: [{date,time,status}] */
  function buildDays(schedule, bookings, from, to, now = Date.now()) {
    const today = jaToday(now), step = (schedule && schedule.step) || 60, days = {};
    const active = (bookings || []).filter(b => b.status !== 'cancelled');
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const r = dayRule(schedule, d);
      const mine = active.filter(b => b.date === d);
      let times = r.open ? dayTimes(r, step) : [];
      const taken = mine.map(b => b.time);
      if (d === today) times = times.filter(t => apptTime(d, t) > now + 60 * 60e3);
      const free = times.filter(t => !taken.includes(t));
      const left = Math.max(0, (r.max || 0) - mine.length);
      let state = 'open';
      if (d < today) state = 'past';
      else if (d === today && r.open && !times.length) state = 'closed'; // today, after hours
      else if (!r.open) state = 'off';
      else if (!left || !free.length) state = 'full';
      else if (left === 1) state = 'few';
      days[d] = { state, open: !!r.open, max: r.max || 0, count: mine.length, left, times: state === 'open' || state === 'few' ? free : [] };
    }
    return days;
  }
  // earliest date a customer may choose for this booking
  const minDate = (b, now = Date.now()) => addDays(jaToday(now), b && b.cat === 'wig' ? DROP_DAYS : 0);

  function wigLabel(b) { const M = wigMain(b.main); return M.tiers ? `${M.name} (${b.tier})` : M.name; }
  function svcLabel(b) {
    if (b.cat === 'wig') return wigLabel(b);
    const s = svc(b.cat, b.svc); if (!s) return '';
    const v = s.vars ? (s.vars.find(x => x.n === b.variant) || s.vars[0]) : null;
    return s.name + (v ? ` · ${v.n}` : '');
  }
  function styledLabel(b, lookName) {
    const M = wigMain(b.main);
    if (M.bundle) return 'Washed & air-dried';
    if (M.styled) return b.wstyleFinish || 'Curled';
    if (b.styled === 'no') return 'Not styled';
    if (b.styled !== 'yes') return '';
    const s = WIG_STYLING.find(x => x.id === b.styleType); if (!s) return 'Styled';
    if (s.id === 'custom') return 'Custom styling' + (b.photo ? ': my photo' : lookName ? ': ' + lookName : '');
    return s.name;
  }

  function price(b) {
    const lines = []; let quote = false;
    const line = (n, amt, sub) => lines.push({ n, amt, sub: sub || '' });
    if (b.cat === 'wig') {
      const M = wigMain(b.main), q = Math.max(1, Math.min(M.bundle ? 12 : 10, +b.qty || 1));
      if (M.bundle) {
        const packs = Math.floor(q / 3), singles = q % 3;
        if (packs) line('3 Bundle Wash Package', packs * BUNDLE.three, packs > 1 ? `${packs} × ${jmd(BUNDLE.three)}` : '');
        if (singles) line('Bundle wash', singles * BUNDLE.one, `${singles} × ${jmd(BUNDLE.one)}`);
      } else {
        const unit = M.tiers ? M.tiers[b.tier] || M.tiers[TIERS[0]] : M.flat;
        line(wigLabel(b), unit * q, q > 1 ? `${q} × ${jmd(unit)}` : '');
        (b.repairs || []).forEach(id => { const r = WIG_REPAIRS.find(x => x.id === id); if (r) line(r.name, r.p * q, q > 1 ? `${q} × ${jmd(r.p)}` : ''); });
        if (!M.styled && b.styled === 'yes') {
          const s = WIG_STYLING.find(x => x.id === b.styleType);
          if (s) { line(s.name + (s.from ? ' (from)' : ''), s.p * q, q > 1 ? `${q} × ${jmd(s.p)}` : ''); if (s.from) quote = true; }
        }
      }
      if (b.handoff === 'Pickup') {
        const fee = AREAS[b.area];
        if (fee == null) { quote = true; line(`Pick-up & delivery · ${b.area || 'Other area'}`, 0, 'Price to be confirmed'); }
        else line(`Pick-up & delivery · ${b.area}`, fee);
      }
    } else {
      const s = svc(b.cat, b.svc);
      if (s) {
        if (s.quote) { quote = true; line(s.name, 0, 'Price to be confirmed'); }
        else {
          const v = s.vars ? (s.vars.find(x => x.n === b.variant) || s.vars[0]) : null;
          if (s.from || s.to) quote = true;
          line(svcLabel(b), v ? v.p : s.p, s.to ? `${jmd(s.p)} to ${jmd(s.to)}` : s.from ? 'Starting price' : '');
        }
        if (b.cat === 'style') (b.addons || []).forEach(id => { const a = ADDONS.find(x => x.id === id); if (a) line(a.name, a.p); });
      }
      if (b.location === 'mobile') { quote = true; line('Shen comes to you', 0, 'Travel fee to be confirmed'); }
    }
    const total = lines.reduce((t, l) => t + l.amt, 0);
    return { lines, total, deposit: Math.ceil(total / 2), quote };
  }

  /* ---------- prices Shen can change from the dashboard ----------
     Every editable price has a key. Shen's changes are saved as { key: amount } and applied over
     the prices above with applyPrices() (on the server for every booking, and in the browser via /api/prices).
     For services, an empty amount (null) means "Price to be confirmed". */
  const PRICE = [];
  const P = (key, group, name, get, set, opts = {}) => PRICE.push({ key, group, name, get, set, ...opts });
  WIG_MAIN.forEach(m => {
    if (m.tiers) TIERS.forEach(t => P(`wig.${m.id}.${t}`, 'Wig care', `${m.name} · ${t}`, () => m.tiers[t], v => { m.tiers[t] = v; }));
    if (m.flat) P(`wig.${m.id}`, 'Wig care', m.name, () => m.flat, v => { m.flat = v; });
  });
  P('bundle.one', 'Wig care', 'Bundle wash · 1 bundle', () => BUNDLE.one, v => { BUNDLE.one = v; });
  P('bundle.three', 'Wig care', '3 Bundle Wash Package', () => BUNDLE.three, v => { BUNDLE.three = v; });
  WIG_REPAIRS.forEach(r => P(`repair.${r.id}`, 'Wig repairs & styling', r.name, () => r.p, v => { r.p = v; }));
  WIG_STYLING.forEach(x => P(`wstyling.${x.id}`, 'Wig repairs & styling', x.name + (x.from ? ' (from)' : ''), () => x.p, v => { x.p = v; }));
  Object.keys(AREAS).filter(a => AREAS[a] != null).forEach(a => P(`area.${a}`, 'Pick-up & delivery', a, () => AREAS[a], v => { AREAS[a] = v; }));
  const GROUP = { style: 'Hairstyling', kids: 'Kiddies hair', locs: 'Locs' };
  Object.entries(SVCS).forEach(([cat, list]) => list.forEach(x => {
    if (x.vars) x.vars.forEach(v => P(`svc.${cat}.${x.id}.${v.n}`, GROUP[cat], `${x.name} · ${v.n}`, () => v.p, n => { v.p = n; }));
    else {
      P(`svc.${cat}.${x.id}`, GROUP[cat], x.name + (x.from ? ' (from)' : ''), () => (x.quote ? null : x.p),
        n => { if (n == null) { x.quote = true; delete x.p; } else { x.quote = false; x.p = n; } }, { optional: true });
      if (x.to) P(`svc.${cat}.${x.id}.to`, GROUP[cat], `${x.name} · up to`, () => x.to ?? null, n => { if (n == null) delete x.to; else x.to = n; }, { optional: true });
    }
  }));
  ADDONS.forEach(a => P(`addon.${a.id}`, 'Hairstyling add-ons', a.name, () => a.p, v => { a.p = v; }));
  const PRICE_DEFAULTS = Object.fromEntries(PRICE.map(x => [x.key, x.get()]));
  const okAmount = v => Number.isFinite(v) && v >= 0 && v <= 1e6;
  function syncText() { wigMain('bundle').desc = `${jmd(BUNDLE.one)} per bundle, or 3 bundles for ${jmd(BUNDLE.three)}`; }
  /* Puts the launch prices back, then applies Shen's changes. */
  function applyPrices(changes) {
    const c = changes || {};
    for (const x of PRICE) {
      let v = Object.prototype.hasOwnProperty.call(c, x.key) ? c[x.key] : PRICE_DEFAULTS[x.key];
      if (v !== null) v = Math.round(+v);
      if (v === null ? !x.optional : !okAmount(v)) v = PRICE_DEFAULTS[x.key];
      x.set(v);
    }
    syncText();
  }
  /* Cleans a { key: amount } object from the dashboard: unknown keys dropped, launch prices left out. */
  function cleanPrices(changes) {
    const out = {};
    for (const x of PRICE) {
      if (!changes || !Object.prototype.hasOwnProperty.call(changes, x.key)) continue;
      let v = changes[x.key];
      if (v === '' || v == null) { if (!x.optional) throw new Error(`${x.name} needs a price`); v = null; }
      else { v = Math.round(+v); if (!okAmount(v)) throw new Error(`Check the price for ${x.name}`); }
      if (v !== PRICE_DEFAULTS[x.key]) out[x.key] = v;
    }
    return out;
  }
  const priceList = () => PRICE.map(x => ({ key: x.key, group: x.group, name: x.name, value: x.get(), original: PRICE_DEFAULTS[x.key], optional: !!x.optional }));
  syncText();

  /* Rows describing a booking. full=true adds contact details and notes (admin, emails). */
  function describe(b, opts = {}) {
    const rows = [], add = (k, v) => { if (v) rows.push([k, v]); };
    add('Service', svcLabel(b));
    if (b.cat === 'wig') {
      const M = wigMain(b.main);
      add(M.bundle ? 'Bundles' : 'Wigs', M.bundle ? String(b.qty || 1) : `${b.qty || 1} · ${b.wigType || WIG_TYPES[0]}`);
      if (!M.bundle && (b.repairs || []).length) add('Repairs', b.repairs.map(id => (WIG_REPAIRS.find(x => x.id === id) || {}).name).filter(Boolean).join(', '));
      if (!M.bundle) add('Damage', (b.damage || []).length ? b.damage.join(', ') : b.damageNote ? '' : 'None noted');
      add('Damage notes', b.damageNote);
      add('Styling', styledLabel(b, opts.lookName));
      add(b.handoff === 'Pickup' ? 'Delivery' : 'Pick-up', b.date ? `${fmtDate(b.date)}${b.time ? ', ' + fmtTime(b.time) : ''}` : '');
      add(b.handoff === 'Pickup' ? 'Collected by' : 'Drop off by', b.date ? fmtDate(addDays(b.date, -DROP_DAYS)) : '');
      add('Method', b.handoff === 'Pickup' ? `Pick-up & delivery · ${b.area}` : 'Drop-off & collect');
      if (b.handoff === 'Pickup') add('Address', b.addr);
    } else {
      const s = svc(b.cat, b.svc);
      const dur = s && (s.vars ? (s.vars.find(x => x.n === b.variant) || s.vars[0]).dur : s.dur); add('Time needed', dur);
      if (b.cat === 'style' && (b.addons || []).length) add('Add-ons', b.addons.map(id => (ADDONS.find(x => x.id === id) || {}).name).filter(Boolean).join(', '));
      add('Look', b.photo ? 'Inspo photo (sending on WhatsApp)' : opts.lookName || '');
      add('When', b.date ? `${fmtDate(b.date)}${b.time ? ', ' + fmtTime(b.time) : ''}` : '');
      add('Where', b.location === 'mobile' ? 'Shen comes to you' : "At Shen's");
      if (b.location === 'mobile') add('Address', b.addr);
    }
    if (b.occasion && b.occasion !== 'No, just fresh') add('Occasion', b.occasion);
    add('Notes', b.notes);
    if (opts.full) {
      add('Name', b.name); add('Phone', b.phone); add('Email', b.email); add('Instagram', b.ig);
      add('Payment', b.pay === 'cash' ? 'Cash' : 'Bank transfer (50% deposit)');
    } else add('Name', b.name);
    return rows;
  }

  /* Field checks shared by the website and the server. Returns an error message or ''. */
  function check(b) {
    if (!CATS.some(c => c.id === b.cat)) return 'Pick a service';
    if (b.cat === 'wig') {
      const M = WIG_MAIN.find(m => m.id === b.main); if (!M) return 'Pick a wig care service';
      if (M.tiers && !TIERS.includes(b.tier)) return 'Pick the wig length';
      if (!(+b.qty >= 1 && +b.qty <= (M.bundle ? 12 : 10))) return 'Check the number of wigs';
      if (!M.bundle && !M.styled && !['yes', 'no'].includes(b.styled)) return 'Tell us if the wig should be styled';
      if (!M.bundle && !M.styled && b.styled === 'yes' && !WIG_STYLING.some(s => s.id === b.styleType)) return 'Pick a styling option';
      if (!['Drop-off', 'Pickup'].includes(b.handoff)) return 'Pick drop-off or pick-up & delivery';
      if (b.handoff === 'Pickup' && !(b.area in AREAS)) return 'Pick your area';
      if (b.handoff === 'Pickup' && String(b.addr || '').trim().length < 3) return 'Add the pick-up address';
    } else {
      const s = svc(b.cat, b.svc); if (!s) return 'Pick a service';
      if (s.vars && !s.vars.some(v => v.n === b.variant)) return 'Pick an option for ' + s.name;
      if (b.location === 'mobile' && String(b.addr || '').trim().length < 3) return 'Add the address for Shen';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return 'Pick a date';
    if (!/^\d{2}:\d{2}$/.test(b.time || '')) return 'Pick a time';
    if (String(b.name || '').trim().length < 2) return 'Add your name';
    if (!/^\d{3}-\d{3}-\d{4}$/.test(b.phone || '')) return 'Enter a 10-digit phone number';
    if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return 'Check your email address';
    if (!['transfer', 'cash'].includes(b.pay)) return 'Pick a payment method';
    return '';
  }

  // a total of 0 means every price is still to be confirmed
  const money = n => (n ? jmd(n) : 'To be confirmed');
  return { jmd, money, CATS, TIERS, BUNDLE, applyPrices, cleanPrices, priceList, WIG_MAIN, WIG_TYPES, WIG_REPAIRS, DAMAGE, WIG_STYLING, WSTYLE_FINISH, AREAS, DROP_DAYS,
    SVCS, ADDONS, SCHEDULE_DEFAULT, BOOK_AHEAD_DAYS, wigMain, svc, addDays, fmtTime, fmtDate, jaToday, apptTime,
    dayRule, buildDays, minDate, svcLabel, styledLabel, price, describe, check };
})();

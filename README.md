# Natural Blitz by Shen — Wig Laundry Mat

Front-end demo website for **Natural Blitz by Shen**, a wig laundry service in Kingston & surrounding areas, Jamaica.

## Pages
- **Home** — skippable opening animation, hero, explore cards
- **Gallery** — video previews, 3D lookbook ring, filterable photo wall
- **Services** — wash, condition, detangle, dry & style
- **How it works** — book, Blitz, slay
- **Contact** — phone/WhatsApp, Instagram, TikTok, service area
- **Book** — 5-step booking: care → style (or inspo photo) + special occasion → live calendar with 4-hour time slots → details → pay 50% deposit or cash on delivery

## Running it
It's a static site: open `index.html`, or serve the folder (e.g. `python3 -m http.server`) and visit `http://localhost:8000`.
Works on GitHub Pages as-is (Settings → Pages → deploy from `main`, root folder).

## Demo notes
- Prices are example values (JMD); the checkout is a demo and takes no payment.
- Live shared availability uses the claude.ai artifact `db` capability, which only exists when the page is hosted on claude.ai. Elsewhere (e.g. GitHub Pages) the calendar shows all days open and bookings are remembered in the visitor's own browser only.
- A production version needs a real backend (bookings database) and a payment provider.
- Booking preview images in `assets/finish/` are placeholders taken from Pinterest (@luxehairgallery) and should be replaced with Shen's own photos before launch.

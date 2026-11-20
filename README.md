# Natural Blitz by Shen: Hairstylist & Wig Care

Website and booking system for **Natural Blitz by Shen**, a hairstylist, kids' hair and wig care business in Kingston & surrounding areas, Jamaica.

## Pages
- **Home**: skippable opening animation, hero, explore cards
- **Gallery**: video previews, 3D lookbook ring, filterable photo wall
- **Services**: hairstyling, kiddies hair, wig care (each with a Book button)
- **About us**: How it works (booking steps + policies), Pricing, Contact
- **Book**: every service can be booked online (5 steps: service, look, date, details, pay)
- **Admin** (`/admin`): Shen's dashboard
  - **Bookings**: visitor numbers, add a booking taken by phone/WhatsApp, move (reschedule), deposit received, cancel/restore
  - **Schedule**: weekly hours, single-day changes, release-unpaid-bookings switch
  - **Gallery**: photos and videos on the Gallery page
  - **Prices**: every price on the site (saved changes apply to the site, booking summary and emails within a minute; existing bookings keep their price)
  - **Messages**: every email/text the site sends
  - **Settings**: change password (logs out other devices), download a backup

## Running it on your computer
Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm run dev
```

Then open http://localhost:3000 (site) and http://localhost:3000/admin (dashboard).

Settings live in `.env.local` (never committed). Copy `.env.example` to `.env.local` and fill in at least `ADMIN_PASSWORD` and `ADMIN_SECRET`.
Locally, bookings are saved in `.data/db.json`, gallery uploads in `.data/media/`, and emails and texts are only written to the dashboard's Messages tab until real keys are added.

## How it fits together
| File | What it does |
|---|---|
| `gallery.js` | The launch gallery (photos, videos, sections). Shen changes the live gallery from the dashboard; it holds at most this many photos and videos. |
| `catalog.js` | Every service, launch price and booking rule. Shen's price changes (admin > Prices) are stored separately and applied on top (`/api/prices`). |
| `index.html` | The website and booking flow |
| `admin.html` | Shen's dashboard |
| `api/` | The 3 Vercel server functions (the free plan allows 12): `[route].js` sends `/api/<name>` to `server/public/`, `admin/[route].js` sends `/api/admin/<name>` to `server/admin/`, plus `cron/reminders.js` |
| `server/` | The endpoint code: `public/` (availability, bookings, gallery, prices, visit, config) and `admin/` (dashboard) |
| `lib/` | Storage, login, notifications and reminder helpers |
| `dev-server.mjs` | Runs the site + `api/` locally |

## Booking rules
- Wig care: customers pick the wig length, any damage, styled or not, and the pick-up or delivery date. Every wig must be dropped off at least 2 days before. No same-day service.
- Shen sets her usual weekly hours and the number of bookings per day, and can open, close or change any single day from the dashboard.
- Bank transfer bookings show as "Deposit due" until Shen taps **Deposit received**. Cash bookings are confirmed straight away.
- Customers get a confirmation, a reminder 24 hours before and a reminder 2 hours before (text + email). Shen gets every new booking by email and WhatsApp.
- Optional (Schedule tab switch, off by default): bank-transfer bookings with no deposit 24 hours after booking are released automatically; the customer and Shen are told, and Shen can Restore it.
- Spam protection: a hidden trap field, at most 3 upcoming bookings per phone number, and at most 5 bookings an hour from one device (stored only as a one-way hash).

## Scheduled jobs (in Supabase)
- Every 15 minutes Supabase calls `/api/cron/reminders` (reminders + releasing unpaid bookings). It reads the site address and `CRON_SECRET` from Supabase Vault (`nb_site_url`, `nb_cron_secret`); update them with the `nb_set_secret` function if the domain or secret changes.
- Every Sunday at 3 AM (Jamaica) a copy of all bookings and settings is saved in the `nb_backups` table (last 8 kept). Shen can also download a backup any time from the Bookings tab.

## Gallery
Shen's **Gallery** tab lets her add, remove, rename and reorder photos and videos, and choose the section each photo shows under (Curls, Waves, Sleek & Bobs, Ponytails & Updos, Colour, Locs, Kids, Wig care). "All" shows everything; a section only appears on the site once it has a photo. The gallery holds up to 26 photos and 4 videos (what it launched with). The first 14 photos also spin in the 3D lookbook. Photos are shrunk in the browser before upload; videos can be up to 50 MB.

## Before launch
- Connect email (Resend) and texts/WhatsApp (Twilio), then switch `ADMIN_EMAIL` from the test address to Shen's email.
- When the domain changes, update `nb_site_url` in Supabase Vault so the 15-minute job calls the new address.
- Supabase holds the database and gallery files (project `natural-blitz-by-shen`). Its tables are in `supabase/migrations/`. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel and `.env.local`.
- Add Shen's Scotiabank details (the `BANK_*` settings; they show on the confirmation screen and in emails).
- Replace the placeholder booking preview images in `assets/finish/` (taken from Pinterest, @luxehairgallery) with Shen's own photos.

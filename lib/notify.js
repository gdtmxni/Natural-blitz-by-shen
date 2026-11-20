/* Notifications. Every message is written to the message log (admin > Messages).
   Email is sent through Resend when RESEND_API_KEY is set; texts and WhatsApp through
   Twilio when TWILIO_* is set. Without keys, messages are logged as "simulated". */
import '../catalog.js';
import { logMessage } from './store.js';
import { bankText } from './bank.js';

const NB = globalThis.NB;
const env = k => process.env[k] || '';
const site = () => env('SITE_URL') || 'https://natural-blitz-by-shen.vercel.app';
const intl = phone => '+1' + String(phone || '').replace(/\D/g, '').slice(-10);
const first = name => String(name || '').trim().split(/\s+/)[0] || 'there';
const whenText = b => `${NB.fmtDate(b.date, true)} at ${NB.fmtTime(b.time)}`;
const bank = () => bankText();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function email(to, subject, text, html, who) {
  if (!to) return;
  const entry = { channel: 'email', who, to, subject, text };
  if (!env('RESEND_API_KEY')) return logMessage({ ...entry, status: 'simulated' });
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('EMAIL_FROM') || 'Natural Blitz by Shen <onboarding@resend.dev>', to: [to], subject, text, html }),
    });
    const j = await r.json().catch(() => ({}));
    await logMessage({ ...entry, status: r.ok ? 'sent' : 'failed', error: r.ok ? undefined : j.message || String(r.status) });
  } catch (e) { await logMessage({ ...entry, status: 'failed', error: String(e.message || e) }); }
}

async function text(channel, to, body, who) {
  const entry = { channel, who, to, text: body };
  const sid = env('TWILIO_ACCOUNT_SID'), tok = env('TWILIO_AUTH_TOKEN');
  let from = channel === 'whatsapp' ? env('TWILIO_WHATSAPP_FROM') : env('TWILIO_SMS_FROM');
  if (!to || !sid || !tok || !from) return logMessage({ ...entry, to: to || '(number not set)', status: 'simulated' });
  try {
    const dest = channel === 'whatsapp' ? 'whatsapp:' + to : to;
    if (channel === 'whatsapp' && !from.startsWith('whatsapp:')) from = 'whatsapp:' + from;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: from, To: dest, Body: body }),
    });
    const j = await r.json().catch(() => ({}));
    await logMessage({ ...entry, status: r.ok ? 'sent' : 'failed', error: r.ok ? undefined : j.message || String(r.status) });
  } catch (e) { await logMessage({ ...entry, status: 'failed', error: String(e.message || e) }); }
}

/* ---------- message bodies ---------- */
function rows(b) { return NB.describe(b, { full: true, lookName: b.lookName }); }
function priceRows(b) {
  const p = b.price || NB.price(b), out = p.lines.map(l => [l.n, l.amt ? NB.jmd(l.amt) : l.sub || '']);
  out.push(['Total' + (p.quote && p.total ? ' (estimate)' : ''), NB.money(p.total)]);
  if (b.pay !== 'cash' && p.deposit) out.push(['50% deposit', NB.jmd(p.deposit)]);
  return out;
}
function summaryText(b) {
  return [`Booking ${b.ref}`, ...rows(b).map(([k, v]) => `${k}: ${v}`), '', ...priceRows(b).map(([k, v]) => `${k}: ${v}`)].join('\n');
}
function html(title, intro, b, outro) {
  const tr = r => r.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6470;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#1b1a1d;white-space:pre-line">${esc(v)}</td></tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1b1a1d">
<h2 style="font-family:Georgia,serif;color:#d6337f;margin:0 0 6px">${esc(title)}</h2>
<p style="margin:0 0 16px">${esc(intro)}</p>
<table style="border-collapse:collapse;font-size:14px;width:100%">${tr([['Booking', b.ref], ...rows(b)])}</table>
<table style="border-collapse:collapse;font-size:14px;width:100%;margin-top:14px;border-top:1px solid #e5e0e7">${tr(priceRows(b))}</table>
${outro ? `<p style="margin:18px 0 0;white-space:pre-line">${esc(outro)}</p>` : ''}
<p style="margin:22px 0 0;font-size:12px;color:#8a838d">Natural Blitz by Shen · 876-420-1683 · Kingston &amp; surrounding areas</p></div>`;
}
function payLine(b) {
  const p = b.price || NB.price(b);
  if (!p.total) return 'Shen will confirm your price and deposit on WhatsApp.';
  if (b.pay === 'cash') return `Payment: ${NB.jmd(p.total)} cash${b.cat === 'wig' ? ' when your wig is returned' : ' on the day'}.`;
  return `Please send your 50% deposit (${NB.jmd(p.deposit)}) by bank transfer within 24 hours, using ${b.ref} as the reference, then send your payment confirmation (a screenshot of the receipt) on WhatsApp to 876-420-1683.

${bank()}`;
}
function wigLine(b) {
  if (b.cat !== 'wig') return '';
  const by = NB.fmtDate(NB.addDays(b.date, -NB.DROP_DAYS), true);
  return b.handoff === 'Pickup' ? `We'll collect your wig by ${by} and deliver it on ${whenText(b)}.` : `Please drop off your wig by ${by}. It will be ready for pick-up on ${whenText(b)}.`;
}
const all = ps => Promise.allSettled(ps);
const customerChannel = () => (env('CUSTOMER_CHANNEL') === 'whatsapp' ? 'whatsapp' : 'sms');

export async function newBooking(b) {
  const svc = NB.svcLabel(b);
  await all([
    email(env('ADMIN_EMAIL'), `New booking ${b.ref}: ${svc}, ${NB.fmtDate(b.date)}`, summaryText(b), html('New booking', `${b.name} just booked ${svc}.`, b), 'Shen'),
    text('whatsapp', env('ADMIN_WHATSAPP') ? intl(env('ADMIN_WHATSAPP')) : '', `New booking 💗\n${summaryText(b)}`, 'Shen'),
    text(customerChannel(), intl(b.phone), `Hi ${first(b.name)}! Natural Blitz by Shen received your booking ${b.ref}: ${svc}, ${whenText(b)}. ${b.pay === 'cash' ? "You're booked." : !(b.price || NB.price(b)).total ? 'Shen will confirm your price and deposit.' : 'Please send your 50% deposit within 24 hours to secure it.'}${b.email ? ' Full details are in your email.' : ' Questions? WhatsApp 876-420-1683.'}`, 'Customer'),
    email(b.email, `Your booking ${b.ref} with Natural Blitz by Shen`, `${summaryText(b)}\n\n${wigLine(b)}\n${payLine(b)}`,
      html(`Thanks, ${first(b.name)}!`, `We've received your booking. Here are your details.`, b, [wigLine(b), payLine(b)].filter(Boolean).join('\n\n')), 'Customer'),
  ]);
}
export async function depositReceived(b) {
  await all([
    text(customerChannel(), intl(b.phone), `Hi ${first(b.name)}! Your deposit for booking ${b.ref} is received. You're confirmed for ${whenText(b)}. See you soon 💗`, 'Customer'),
    email(b.email, `You're confirmed: booking ${b.ref}`, `Deposit received. ${summaryText(b)}`, html("You're confirmed!", 'Your deposit is received and your booking is locked in.', b, wigLine(b)), 'Customer'),
  ]);
}
export async function cancelled(b) {
  await all([
    text(customerChannel(), intl(b.phone), `Hi ${first(b.name)}, your Natural Blitz booking ${b.ref} for ${whenText(b)} has been cancelled. Questions? WhatsApp 876-420-1683.`, 'Customer'),
    email(b.email, `Booking ${b.ref} cancelled`, `Your booking ${b.ref} has been cancelled.\n\n${summaryText(b)}`, html('Booking cancelled', 'Your booking below has been cancelled. Questions? WhatsApp 876-420-1683.', b), 'Customer'),
  ]);
}
export async function reminder(b, which) {
  const lead = which === 'h2' ? 'in 2 hours' : 'tomorrow';
  const what = b.cat === 'wig' ? (b.handoff === 'Pickup' ? 'your wig delivery' : 'your wig pick-up') : NB.svcLabel(b);
  await all([
    text(customerChannel(), intl(b.phone), `Reminder 💗 ${what} with Natural Blitz by Shen is ${lead} (${NB.fmtTime(b.time)}). Booking ${b.ref}. Need to change it? WhatsApp 876-420-1683.`, 'Customer'),
    email(b.email, `Reminder: ${what} ${lead}`, `Reminder for booking ${b.ref}.\n\n${summaryText(b)}`,
      html(`See you ${lead}!`, `A reminder about your booking with Natural Blitz by Shen.`, b, 'Running late? There is a 15-minute grace period. After that, a J$1,000 late fee applies.'), 'Customer'),
  ]);
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const ebay = require('./ebay');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL   = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `You are an expert collectibles appraiser with deep knowledge of coins, sports cards, art, watches, jewellery, sneakers, wine, vintage cars, comics, and stamps. You may be given one or more photos of the same item from different angles — use ALL of them together to produce a single, more accurate identification.

STEP 1 — READ ALL VISIBLE TEXT FIRST:
Before doing anything else, carefully read every piece of text visible in the image(s):
- Coins: country name, denomination, date, mint mark, inscriptions
- Sports Cards: player name, team, season/year printed on the card, set name, card number (e.g. "#57"), series, parallel/edition text, grading company and grade if slabbed
- Watches: brand name, model name, reference number on dial or case back, serial number, "Swiss Made" markings
- Art: artist signature, title text, edition number (e.g. "12/50"), year, gallery stamp
- Wine: producer name, appellation, vintage year, region, label text
- Vintage Cars: make, model badges, year on plate or documentation visible, VIN if shown
- Comics: title, issue number, date/month printed on cover, publisher, price
- Stamps: country name, denomination, year, series name, Scott or Stanley Gibbons catalogue number if visible
- Jewellery/Sneakers: brand marks, hallmarks, size labels, colourway names

STEP 2 — USE THAT TEXT AS PRIMARY EVIDENCE:
The text you read is ground truth. Do not guess or estimate details that are clearly printed on the item. For example, if a sports card shows "1986-87 Fleer #57", use 1986 as the year and "#57" in the name — do not infer the year from the player's appearance.

Return ONLY a JSON object — no markdown, no code blocks, no extra text — with exactly these fields:
{
  "name": "Full descriptive item name",
  "category": "Coins",
  "country": "Country of origin or manufacture",
  "year": 1921,
  "minValue": 100,
  "maxValue": 200,
  "rarity": "uncommon",
  "grade": "VF-30",
  "coinColor": "#C0C0C0",
  "symbolChar": "$",
  "metal": "Silver"
}

Rules for ALL collectibles:
- name: specific, descriptive (e.g. "1986 Fleer Michael Jordan Rookie #57", "Rolex Submariner Ref. 116610LN", "1909-S VDB Lincoln Cent")
- category: must be exactly one of: Coins, Sports Cards, Art, Watches, Jewellery, Sneakers, Wine, Vintage Cars, Comics, Stamps, Other. Use "Other" only when the item clearly does not fit any of the named categories.
- country: country of origin, manufacture, or issue
- year: a number — the issue/production year or vintage of the ITEM (e.g. 1986 for a card, 1959 for a watch). Read it from the date printed on the item. NEVER output today's date or the current year. If no year is printed and you cannot reasonably infer the item's age from its design, set year to 0 rather than guessing. If photos show different sides, use the one that actually displays the date.
- minValue and maxValue: USD fair-market value estimates as numbers; set both to 0 if unknown
- rarity must be exactly one of: common, uncommon, rare, legendary
- grade: use the grading standard appropriate for the category:
    Coins → numismatic notation (G-4, VF-20, MS-63, PF-65)
    Sports Cards → PSA/BGS scale (Raw, PSA 7, PSA 10, BGS 9.5)
    Art → condition note (Good, Fine, Excellent, Museum Quality)
    Watches → condition note (Poor, Fair, Good, Excellent, Mint)
    Jewellery → condition note (Fair, Good, Very Good, Excellent)
    Sneakers → sneaker condition (DS, VNDS, Good, Worn)
    Wine → critic score if known (e.g. RP 100, WS 97) or Excellent/Good/Fair
    Vintage Cars → condition class (Project, Driver, Good, Show, Concours)
    Comics → CGC scale (Raw, CGC 5.0, CGC 9.8)
    Stamps → philatelic grade (Fine, Very Fine, Superb, Mint)
- coinColor: a hex colour that visually represents the item:
    Coins → metal colour (silver≈#C0C0C0, gold≈#D4AA3C, copper≈#B87333)
    Sports Cards → dominant card colour or team colour
    Art → dominant artwork colour
    Watches → case/dial colour (silver≈#C0C0C0, gold≈#D4AA3C, black≈#1F2937)
    Jewellery → primary gemstone or metal colour
    Sneakers → dominant colourway
    Wine → wine colour (red≈#7C2D3E, white≈#D4B483, rosé≈#F4A5B0)
    Vintage Cars → body colour
    Comics → dominant cover colour
    Stamps → dominant stamp colour
- symbolChar: a single representative character or symbol for the item:
    Coins → currency symbol of issuing country ($, £, €, ¥)
    Sports Cards → sport emoji or letter (🏀, ⚽, 🏈, or B/F/S)
    Art → ★
    Watches → ◉
    Jewellery → ♦
    Sneakers → ▲
    Wine → ♦
    Vintage Cars → ●
    Comics → ◆
    Stamps → ■
- metal: must be exactly one of: Gold, Silver, Copper, Bronze — use the closest match for non-coin items:
    Watches/Jewellery with gold → Gold; silver/steel → Silver
    Sports Cards/Comics/Stamps → Silver
    Sneakers/Wine/Art/Vintage Cars → Silver
- If you cannot identify the item confidently, set name to "Unknown Collectible", category to the best guess, and both values to 0`;

// Extra instructions for grounded calls. Search Grounding cannot be combined
// with responseMimeType JSON, so the grounded call relies on the prompt alone
// to keep the output parseable.
const SEARCH_ADDENDUM = `

You have access to Google Search. After identifying the item, SEARCH for its current market value — recent sold listings and price guides — and base minValue and maxValue on what you find, not on memory. Never leave both values at 0 when search results give any price signal. Your final answer must still be ONLY the JSON object: no citations, no source names, no text before or after it.`;

app.get('/health', (_req, res) => res.json({ ok: true }));

// Pulls the JSON object out of a Gemini response. Grounded responses can come
// back in several text parts and occasionally wrapped in markdown fences.
function extractJsonText(data) {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map(p => p.text ?? '').join('');
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

async function callGemini(images, { grounded }) {
  const geminiRes = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          // All images first so Gemini reads text from every angle before the prompt.
          ...images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img } })),
          { text: grounded ? PROMPT + SEARCH_ADDENDUM : PROMPT },
        ],
      }],
      ...(grounded ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: {
        temperature: 0.1,
        // JSON output mode is incompatible with Search Grounding.
        ...(grounded ? {} : { responseMimeType: 'application/json' }),
      },
    }),
  });

  const data = await geminiRes.json();
  if (!geminiRes.ok) {
    const err = new Error(data.error?.message ?? `Gemini API error ${geminiRes.status}`);
    err.status = geminiRes.status;
    throw err;
  }

  const text = extractJsonText(data);
  JSON.parse(text); // throws if unparseable -> caller falls back
  return text;
}

app.post('/api/identify', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' });
  }

  // Accept either a single image (legacy) or an array for multi-angle scanning.
  const { base64Image, base64Images } = req.body;
  const images = base64Images ?? (base64Image ? [base64Image] : null);
  if (!images || images.length === 0) {
    return res.status(400).json({ error: 'base64Image or base64Images is required.' });
  }

  try {
    let text;
    try {
      // Grounded first: real market prices via Google Search.
      text = await callGemini(images, { grounded: true });
    } catch (err) {
      // Grounding unavailable (tier limits) or unparseable output — plain call.
      console.warn(`Grounded identify failed (${err.message}); retrying without search.`);
      text = await callGemini(images, { grounded: false });
    }

    // Same response shape the app already expects.
    res.json({ candidates: [{ content: { parts: [{ text }] } }] });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// Permanently delete the calling user's account + their data.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (set on Railway).
// The service-role key is admin-level — it must ONLY ever live here on the server.
app.post('/api/delete-account', async (req, res) => {
  const SUPA_URL     = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Account deletion is not configured on the server yet.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  try {
    // 1) Resolve the user from their own access token.
    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_ROLE },
    });
    const user = await userRes.json();
    if (!userRes.ok || !user?.id) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    // 2) Best-effort delete of their collection rows (privacy / GDPR).
    await fetch(`${SUPA_URL}/rest/v1/assets?user_id=eq.${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    }).catch(() => {});

    // 3) Delete the auth user (admin).
    const delRes = await fetch(`${SUPA_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    });
    if (!delRes.ok) {
      const e = await delRes.json().catch(() => ({}));
      return res.status(delRes.status).json({ error: e.msg || 'Failed to delete account.' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Waitlist confirmation email, fired via Resend right after a NEW signup
// (never on duplicates). Fire-and-forget: a mail failure must never break
// the signup response. Silently skipped until RESEND_API_KEY is set.
function sendWaitlistConfirmation(email) {
  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) return;
  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f2f5fb;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#4fb8fe,#2557e8);padding:40px 32px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;border:4px solid #ffffff;color:#ffffff;font-size:34px;font-weight:800;text-align:center;">T</div>
          <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:4px;margin-top:14px;">TROVAULT</div>
        </td></tr>
        <tr><td style="padding:36px 32px 8px;">
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#101733;">You&rsquo;re on the list. &#128142;</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3c4563;">
            Thanks for signing up &mdash; you&rsquo;ll be one of the first to know the moment
            <strong>Trovault</strong> hits the App Store. It&rsquo;s days away.
          </p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3c4563;">
            While you wait, pick your five most mysterious items &mdash; the watch in the drawer,
            the coins in the jar, the sneakers in the box. When the app lands, you&rsquo;ll
            point your iPhone at each one and find out what it&rsquo;s actually worth.
            <strong>Your first 5 scans every month are free.</strong>
          </p>
          <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#3c4563;">
            One more email from us &mdash; the download link on launch day. That&rsquo;s it.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 36px;">
          <a href="https://trovault.io" style="display:inline-block;background:#2f6bff;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;">Visit trovault.io</a>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f7f9fd;border-top:1px solid #e8edf7;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8a94b3;text-align:center;">
            You&rsquo;re receiving this because you joined the launch list at trovault.io.<br>
            Not you? Just ignore this email &mdash; we won&rsquo;t write again except on launch day.<br>
            Trovault &middot; <a href="https://trovault.io" style="color:#8a94b3;">trovault.io</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.WAITLIST_FROM || 'Trovault <hello@trovault.io>',
      reply_to: 'joshuadroza777@gmail.com',
      to: email,
      subject: 'You’re on the list \u{1F48E}',
      html,
    }),
  }).catch(() => {});
}

// One-time backfill: sends the confirmation email to EVERY address already
// in the waitlist (rows that signed up before the email existed). Guarded by
// ADMIN_TOKEN so only the owner can trigger it; throttled for Resend's rate
// limit. Safe to remove after launch.
app.post('/api/admin/backfill-waitlist', async (req, res) => {
  const TOKEN = process.env.ADMIN_TOKEN;
  if (!TOKEN || req.get('x-admin-token') !== TOKEN) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const SUPA_URL     = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA_URL || !SERVICE_ROLE) return res.status(500).json({ error: 'Supabase not configured.' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set.' });

  try {
    const rows = await fetch(`${SUPA_URL}/rest/v1/waitlist?select=email&order=created_at`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    }).then(r => r.json());
    if (!Array.isArray(rows)) return res.status(502).json({ error: 'Could not read waitlist.' });

    let sent = 0;
    const failed = [];
    for (const { email } of rows) {
      const r = await sendWaitlistConfirmation(email);
      if (r && r.ok) sent++; else failed.push(email);
      await new Promise(t => setTimeout(t, 600));
    }
    res.json({ total: rows.length, sent, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Landing-page waitlist signup. Stores the email in the Supabase `waitlist`
// table via the service role (same env vars as delete-account). Duplicate
// emails are treated as success so the form never scolds a returning visitor.
app.post('/api/subscribe', async (req, res) => {
  const SUPA_URL     = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Waitlist is not configured on the server yet.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    const ins = await fetch(`${SUPA_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, source: String(req.body?.source || 'landing').slice(0, 40) }),
    });
    // 409 = duplicate email (unique constraint) — that visitor is already on the list.
    if (!ins.ok && ins.status !== 409) {
      const e = await ins.json().catch(() => ({}));
      return res.status(502).json({ error: e.message || 'Could not save your email.' });
    }
    if (ins.ok) sendWaitlistConfirmation(email);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live ticker for the landing page: real eBay median prices for a fixed set
// of marquee collectibles, with % change vs the previous daily snapshot
// (stored in the Supabase `price_history` table). Cached in memory for 12h so
// a page load never hits eBay directly; change is null until history exists.
const TICKER_ITEMS = [
  { label: 'Air Jordan 1 Chicago',       q: 'Air Jordan 1 Retro Chicago' },
  { label: 'Rolex Submariner',           q: 'Rolex Submariner watch' },
  { label: '1921 Morgan Dollar',         q: '1921 Morgan Silver Dollar' },
  { label: 'Charizard Base Set',         q: 'Charizard Base Set holo PSA' },
  { label: 'Omega Speedmaster',          q: 'Omega Speedmaster Professional' },
  { label: 'Amazing Spider-Man #300',    q: 'Amazing Spider-Man 300 comic' },
  { label: '1986 Fleer Jordan',          q: '1986 Fleer Michael Jordan rookie PSA' },
  { label: 'Hermès Birkin 30',           q: 'Hermes Birkin 30 bag' },
  { label: 'Penny Black Stamp',          q: 'Penny Black 1840 stamp' },
  { label: 'LEGO UCS Millennium Falcon', q: 'LEGO 75192 Millennium Falcon sealed' },
];
let tickerCache = { at: 0, data: null };

app.get('/api/ticker', async (req, res) => {
  if (tickerCache.data && Date.now() - tickerCache.at < 12 * 3600 * 1000) {
    return res.json(tickerCache.data);
  }
  if (!ebay.isConfigured()) return res.status(503).json({ error: 'Pricing not configured.' });

  const SUPA_URL     = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaHeaders  = {
    Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE,
    'Content-Type': 'application/json',
  };
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Most recent snapshot per label from a PREVIOUS day, for % change.
    let prior = {};
    if (SUPA_URL && SERVICE_ROLE) {
      const hist = await fetch(
        `${SUPA_URL}/rest/v1/price_history?day=lt.${today}&order=day.desc&limit=${TICKER_ITEMS.length * 3}`,
        { headers: supaHeaders },
      ).then(r => (r.ok ? r.json() : [])).catch(() => []);
      for (const row of hist) if (!(row.label in prior)) prior[row.label] = Number(row.price);
    }

    const items = [];
    for (const t of TICKER_ITEMS) {
      try {
        const comps = await ebay.getComps(t.q, 'EBAY_US');
        if (!comps.median) continue;
        const prev = prior[t.label];
        items.push({
          label: t.label,
          price: comps.median,
          change: prev ? Number((((comps.median - prev) / prev) * 100).toFixed(1)) : null,
          // TODO post-launch: swap to eBay Partner Network affiliate links.
          url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(t.q)}`,
        });
      } catch (_) { /* skip items eBay chokes on — ticker degrades gracefully */ }
    }
    if (!items.length) return res.status(502).json({ error: 'No prices available.' });

    // Upsert today's snapshot so tomorrow has something to diff against.
    if (SUPA_URL && SERVICE_ROLE) {
      fetch(`${SUPA_URL}/rest/v1/price_history?on_conflict=day,label`, {
        method: 'POST',
        headers: { ...supaHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(items.map(i => ({ day: today, label: i.label, price: i.price }))),
      }).catch(() => {});
    }

    tickerCache = { at: Date.now(), data: { items, asOf: new Date().toISOString() } };
    res.json(tickerCache.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real marketplace pricing for an identified item (active eBay listings).
// Requires EBAY_CLIENT_ID + EBAY_CLIENT_SECRET (Production keyset) env vars.
app.get('/api/price', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q (item name) is required.' });
  if (!ebay.isConfigured()) {
    return res.status(503).json({ error: 'eBay pricing is not configured on the server yet.' });
  }
  try {
    const comps = await ebay.getComps(q, req.query.marketplace || 'EBAY_US');
    res.json({ comps });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// eBay Marketplace Account Deletion/Closure compliance endpoint.
// Required to enable a Production keyset. We use only application tokens and store
// NO eBay user data, so the POST handler simply acknowledges. The GET handler answers
// eBay's verification challenge: SHA256(challengeCode + verificationToken + endpoint).
const EBAY_VERIFICATION_TOKEN =
  process.env.EBAY_VERIFICATION_TOKEN || 'trovault_ebay_marketplace_deletion_verification_2026';
const EBAY_DELETION_ENDPOINT =
  process.env.EBAY_DELETION_ENDPOINT ||
  'https://asset-portfolio-production.up.railway.app/api/ebay/deletion';

app.get('/api/ebay/deletion', (req, res) => {
  const challengeCode = req.query.challenge_code;
  if (!challengeCode) return res.status(400).json({ error: 'challenge_code is required.' });
  const hash = crypto.createHash('sha256');
  hash.update(challengeCode);
  hash.update(EBAY_VERIFICATION_TOKEN);
  hash.update(EBAY_DELETION_ENDPOINT);
  res.json({ challengeResponse: hash.digest('hex') });
});

app.post('/api/ebay/deletion', (_req, res) => {
  // No eBay user data is stored — acknowledge the notification.
  res.sendStatus(200);
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gemini proxy listening on http://0.0.0.0:${PORT}`);
  if (!API_KEY) console.warn('WARNING: GEMINI_API_KEY is not set — requests will fail.');
});

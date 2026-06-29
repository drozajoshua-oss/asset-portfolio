require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

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
- category: must be exactly one of: Coins, Sports Cards, Art, Watches, Jewellery, Sneakers, Wine, Vintage Cars, Comics, Stamps
- country: country of origin, manufacture, or issue
- year: a number — the issue year, production year, or vintage (e.g. 1986 for a card, 1959 for a watch)
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
    const geminiRes = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            // All images first so Gemini reads text from every angle before the prompt.
            ...images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img } })),
            { text: PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const msg = data.error?.message ?? `Gemini API error ${geminiRes.status}`;
      return res.status(geminiRes.status).json({ error: msg });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gemini proxy listening on http://0.0.0.0:${PORT}`);
  if (!API_KEY) console.warn('WARNING: GEMINI_API_KEY is not set — requests will fail.');
});

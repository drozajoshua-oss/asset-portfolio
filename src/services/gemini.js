const PROXY_BASE = 'https://asset-portfolio-production.up.railway.app';

const VALID_RARITIES = new Set(['common', 'uncommon', 'rare', 'legendary']);
const VALID_METALS   = new Set(['Gold', 'Silver', 'Copper', 'Bronze']);

// Accepts one or more base64 images; all are sent to Gemini in a single request
// so it can cross-reference details across angles for a more accurate identification.
export async function identifyAsset(base64Images) {
  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const url = `${PROXY_BASE}/api/identify`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Images: images }),
  });

  if (!response.ok) {
    let message = `Proxy error (${response.status})`;
    try {
      const err = await response.json();
      if (err.error) message = err.error;
    } catch (_) {}
    throw new Error(message);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini.');

  const data = JSON.parse(text);

  // Sanitise fields so the UI never crashes on unexpected Gemini output
  if (!VALID_RARITIES.has(data.rarity)) data.rarity = 'common';
  if (typeof data.year !== 'number') data.year = parseInt(data.year, 10) || 0;
  if (typeof data.minValue !== 'number') data.minValue = Number(data.minValue) || 0;
  if (typeof data.maxValue !== 'number') data.maxValue = Number(data.maxValue) || 0;
  if (!data.coinColor?.startsWith('#')) data.coinColor = '#C0C0C0';
  if (!data.symbolChar) data.symbolChar = '?';
  if (!VALID_METALS.has(data.metal)) data.metal = 'Silver';

  return data;
}

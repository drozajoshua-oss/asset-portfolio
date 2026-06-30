// eBay Browse API helper — fetches real marketplace pricing for an identified item.
//
// Uses the OAuth client-credentials grant. Requires PRODUCTION keyset env vars on the
// server (Railway): EBAY_CLIENT_ID (App ID) and EBAY_CLIENT_SECRET (Cert ID).
// Returns price stats from ACTIVE listings. (Sold-comp data needs eBay's Marketplace
// Insights API — a separate, gated access request we can add later.)

const TOKEN_URL  = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE      = 'https://api.ebay.com/oauth/api_scope';

let cachedToken = null;
let tokenExpiry = 0;

function isConfigured() {
  return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) return cachedToken;

  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`,
  });
  if (!res.ok) throw new Error(`eBay token error ${res.status}`);

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 7200) * 1000;
  return cachedToken;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Returns { low, median, high, count, currency } for active eBay listings
 * matching `query`, or null if eBay isn't configured / no query.
 */
async function getComps(query, marketplace = 'EBAY_US') {
  if (!isConfigured() || !query) return null;

  const token = await getToken();
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&limit=50&filter=${encodeURIComponent('buyingOptions:{FIXED_PRICE}')}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplace,
    },
  });
  if (!res.ok) throw new Error(`eBay search error ${res.status}`);

  const data = await res.json();
  const items = data.itemSummaries || [];
  const prices = items
    .map(i => i.price && parseFloat(i.price.value))
    .filter(v => v && v > 0)
    .sort((a, b) => a - b);

  const currency = (items.find(i => i.price)?.price?.currency) || 'USD';
  if (prices.length < 3) return { low: 0, median: 0, high: 0, count: prices.length, currency };

  // Trim the top/bottom 10% to cut outliers (parts lots, mispriced listings).
  const trim = Math.floor(prices.length * 0.1);
  const core = prices.slice(trim, prices.length - trim);
  return {
    low: Math.round(core[0]),
    median: Math.round(median(core)),
    high: Math.round(core[core.length - 1]),
    count: prices.length,
    currency,
  };
}

module.exports = { isConfigured, getComps };

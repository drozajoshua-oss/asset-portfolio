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

// Linear-interpolated percentile of a pre-sorted ascending array (p in 0..1).
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
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

  // Use the interquartile range (25th–75th percentile) so reprints, parts lots,
  // and mispriced listings on the extremes don't distort the "typical" range.
  return {
    low: Math.round(percentile(prices, 0.25)),
    median: Math.round(percentile(prices, 0.50)),
    high: Math.round(percentile(prices, 0.75)),
    count: prices.length,
    currency,
  };
}

module.exports = { isConfigured, getComps };

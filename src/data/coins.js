export const COINS = [
  {
    id: '1',
    name: 'Morgan Silver Dollar',
    country: 'USA',
    year: 1921,
    value: 485,
    rarity: 'uncommon',
    metal: 'Silver',
    coinColor: '#C0C0C0',
    symbolChar: '$',
  },
  {
    id: '2',
    name: 'Walking Liberty Half',
    country: 'USA',
    year: 1945,
    value: 92,
    rarity: 'common',
    metal: 'Silver',
    coinColor: '#A8A8A8',
    symbolChar: '$',
  },
  {
    id: '3',
    name: 'American Gold Eagle',
    country: 'USA',
    year: 1986,
    value: 2150,
    rarity: 'rare',
    metal: 'Gold',
    coinColor: '#D4AA3C',
    symbolChar: '$',
  },
  {
    id: '4',
    name: 'Victorian Gold Sovereign',
    country: 'UK',
    year: 1893,
    value: 785,
    rarity: 'rare',
    metal: 'Gold',
    coinColor: '#D4AA3C',
    symbolChar: '£',
  },
  {
    id: '5',
    name: 'French 20 Franc Rooster',
    country: 'France',
    year: 1908,
    value: 435,
    rarity: 'uncommon',
    metal: 'Gold',
    coinColor: '#C8A84A',
    symbolChar: '₣',
  },
  {
    id: '6',
    name: 'Mexican Centenario',
    country: 'Mexico',
    year: 1921,
    value: 975,
    rarity: 'rare',
    metal: 'Gold',
    coinColor: '#D4AA3C',
    symbolChar: '$',
  },
  {
    id: '7',
    name: 'Canadian Maple Leaf',
    country: 'Canada',
    year: 1979,
    value: 325,
    rarity: 'uncommon',
    metal: 'Gold',
    coinColor: '#B8960C',
    symbolChar: '$',
  },
  {
    id: '8',
    name: 'Australian Florin',
    country: 'Australia',
    year: 1954,
    value: 195,
    rarity: 'common',
    metal: 'Silver',
    coinColor: '#B0B8C0',
    symbolChar: '✦',
  },
];

export const SCAN_RESULT = {
  name: 'Morgan Silver Dollar',
  country: 'United States',
  year: 1921,
  minValue: 420,
  maxValue: 550,
  rarity: 'uncommon',
  grade: 'VF-35',
  mint: 'Philadelphia',
  coinColor: '#C0C0C0',
  symbolChar: '$',
};

export const TOTAL_VALUE = COINS.reduce((s, c) => s + c.value, 0);

export const TOP_COINS = [...COINS].sort((a, b) => b.value - a.value).slice(0, 5);

export const CHART_DATA = (() => {
  const groups = {};
  COINS.forEach(c => { groups[c.country] = (groups[c.country] || 0) + c.value; });
  return Object.entries(groups)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
})();

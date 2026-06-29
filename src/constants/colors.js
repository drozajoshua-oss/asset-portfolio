// Light SaaS palette — inspired by the FlowMail dashboard reference
export const C = {
  // ── Backgrounds ──────────────────────────────────
  bg:          '#F4F6FC',   // page / screen background (very light blue-gray)
  surface:     '#FFFFFF',   // card / panel background
  surfaceTint: '#F0F3FE',   // light accent-tinted surface

  // ── Borders & dividers ────────────────────────────
  border:      '#E4E8F4',
  borderLight: '#EEF1F8',

  // ── Primary accent — indigo/blue ─────────────────
  accent:      '#5C6EF0',   // main CTA, active tabs, chart primary
  accentDark:  '#4355C8',   // pressed state
  accentLight: '#EEF0FE',   // badge bg, chip bg, icon halos
  accentGlow:  'rgba(92,110,240,0.10)',

  // ── Text ─────────────────────────────────────────
  text:        '#1A1F3D',   // primary — near-black navy
  textSub:     '#64748B',   // secondary — slate
  textMuted:   '#94A3B8',   // placeholder / caption
  textOnAccent:'#FFFFFF',   // text on filled accent buttons

  // ── Semantic ─────────────────────────────────────
  success:     '#10B981',   // +trend, uncommon rarity, green bars
  successLight:'#D1FAE5',
  warning:     '#F59E0B',
  warningLight:'#FEF3C7',
  danger:      '#EF4444',
  dangerLight: '#FEE2E2',

  // ── Rarity ───────────────────────────────────────
  common:    '#64748B',
  uncommon:  '#10B981',
  rare:      '#8B5CF6',
  legendary: '#F97316',

  // ── Shadow helper ────────────────────────────────
  shadow:    'rgba(92,110,240,0.10)',
  shadowSm:  'rgba(0,0,0,0.06)',

  // ── Chart palette ────────────────────────────────
  chart: ['#5C6EF0','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316'],
};

export const RARITY = {
  common:    { color: '#64748B', bg: '#F1F5F9', label: 'COMMON' },
  uncommon:  { color: '#10B981', bg: '#D1FAE5', label: 'UNCOMMON' },
  rare:      { color: '#8B5CF6', bg: '#EDE9FE', label: 'RARE' },
  legendary: { color: '#F97316', bg: '#FFEDD5', label: 'LEGENDARY' },
};

// Card shadow — shared across all screens
export const CARD_SHADOW = {
  shadowColor:   'rgba(92,110,240,0.12)',
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius:  12,
  elevation:     3,
};

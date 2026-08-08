// Trovault design tokens.
//
// Quiet, spacious, premium. The brand blue is preserved but slightly
// desaturated, colour is used sparingly, and rarity reads as a muted metal
// scale rather than a rainbow. Greys are neutral (not blue-tinted) so the
// blue is the only thing that feels coloured.
export const C = {
  // ── Backgrounds ──────────────────────────────────
  bg:          '#F7F8FB',   // page background — near-white, barely cool
  surface:     '#FFFFFF',   // card / panel
  surfaceTint: '#F2F3F8',   // subtle inset

  // ── Borders & dividers ────────────────────────────
  // Used EITHER as a hairline OR with a shadow — never both on one element.
  border:      '#E8EAF0',
  borderLight: '#F1F2F6',

  // ── Primary accent — desaturated indigo ──────────
  accent:      '#5866CD',   // main CTA, active tab, chart primary
  accentDark:  '#3F4CA0',   // pressed
  accentLight: '#EEF0F9',   // chip / halo background
  accentGlow:  'rgba(88,102,205,0.10)',

  // ── Text ─────────────────────────────────────────
  text:        '#15182B',   // primary
  textSub:     '#6B7280',   // secondary — neutral slate
  textMuted:   '#9CA3AF',   // captions, labels
  textOnAccent:'#FFFFFF',

  // ── Semantic — used sparingly ────────────────────
  success:     '#0E9F6E',
  successLight:'#E7F5EF',
  warning:     '#C88A04',
  warningLight:'#FBF3E0',
  danger:      '#C96A6A',
  dangerLight: '#F9EBEB',

  // ── Rarity — a muted metal scale ─────────────────
  common:    '#8A8F9C',   // neutral grey
  uncommon:  '#0E9F6E',   // emerald
  rare:      '#5866CD',   // brand blue
  epic:      '#7C6BB0',   // muted purple
  legendary: '#A98029',   // muted gold

  // ── Elevation ────────────────────────────────────
  shadow:    'rgba(20,24,45,0.05)',
  shadowSm:  'rgba(20,24,45,0.04)',

  // ── Chart palette — supports data, never dominates
  chart: ['#5866CD','#0E9F6E','#A98029','#7C6BB0','#8A8F9C','#C88A04'],
};

export const RARITY = {
  common:    { color: '#8A8F9C', bg: '#F2F3F6', label: 'COMMON' },
  uncommon:  { color: '#0E9F6E', bg: '#E7F5EF', label: 'UNCOMMON' },
  rare:      { color: '#5866CD', bg: '#EEF0F9', label: 'RARE' },
  epic:      { color: '#7C6BB0', bg: '#F0EDF7', label: 'EPIC' },
  legendary: { color: '#A98029', bg: '#F7F0DF', label: 'LEGENDARY' },
};

// ── Radius scale — hierarchy, not one value everywhere ──
export const R = {
  panel:  20,   // hero, sheets, large panels
  card:   16,   // cards
  image:  14,   // thumbnails inside cards
  button: 12,   // buttons, inputs
  pill:   999,  // tags, chips
};

// ── Spacing — 8pt system ──
export const S = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40,
};

// Card shadow — soft and neutral. Pair with a white surface and NO border.
export const CARD_SHADOW = {
  shadowColor:   'rgba(20,24,45,0.10)',
  shadowOffset:  { width: 0, height: 4 },
  shadowRadius:  16,
  shadowOpacity: 1,
  elevation:     2,
};

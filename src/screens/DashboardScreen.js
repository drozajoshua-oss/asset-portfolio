import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RARITY, CARD_SHADOW } from '../constants/colors';
import { useCollection } from '../context/CollectionContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../data/items';
import DonutChart from '../components/DonutChart';

// Small metric card used in the stats row
function StatCard({ icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <View style={[ds.statCard, CARD_SHADOW]}>
      <View style={[ds.statIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={ds.statValue}>{value}</Text>
      <Text style={ds.statLabel}>{label}</Text>
      {sub && (
        <Text style={[ds.statSub, { color: subColor || C.textMuted }]}>{sub}</Text>
      )}
    </View>
  );
}

// Row in the Top-5 list
function TopRow({ coin, rank, maxValue }) {
  const r     = RARITY[coin.rarity];
  const barPct = maxValue > 0 ? coin.value / maxValue : 0;
  return (
    <View style={ds.topRow}>
      {/* rank badge */}
      <View style={[ds.rankBadge, rank === 1 && ds.rankBadge1]}>
        <Text style={[ds.rankText, rank === 1 && ds.rankText1]}>#{rank}</Text>
      </View>

      <View style={ds.topMid}>
        <View style={ds.topTitleRow}>
          <Text style={ds.topName} numberOfLines={1}>{coin.name}</Text>
          <View style={[ds.topRarityPill, { backgroundColor: r.bg }]}>
            <Text style={[ds.topRarityPillText, { color: r.color }]}>{r.label}</Text>
          </View>
        </View>
        {/* mini progress bar */}
        <View style={ds.barTrack}>
          <View style={[ds.barFill, { width: `${barPct * 100}%`, backgroundColor: r.color }]} />
        </View>
        <Text style={ds.topMeta}>{coin.country} · {coin.year} · {coin.metal}</Text>
      </View>

      <Text style={ds.topVal}>${coin.value.toLocaleString()}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { coins } = useCollection();
  const { signOut } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState(null);
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const filtered  = categoryFilter ? coins.filter(c => (c.category ?? 'Coins') === categoryFilter) : coins;
  const totalValue = filtered.reduce((s, c) => s + c.value, 0);
  const countries  = [...new Set(filtered.map(c => c.country))].length;
  const goldTotal  = filtered.filter(c => c.metal === 'Gold').reduce((s, c) => s + c.value, 0);
  const avgValue   = filtered.length > 0 ? Math.round(totalValue / filtered.length) : 0;
  const topCoins   = [...filtered].sort((a, b) => b.value - a.value).slice(0, 5);
  const chartData  = (() => {
    const groups = {};
    filtered.forEach(c => {
      const key = c.category ?? c.country ?? 'Other';
      groups[key] = (groups[key] || 0) + c.value;
    });
    return Object.entries(groups)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  })();

  return (
    <View style={ds.root}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={ds.safeArea}>
        <View style={ds.header}>
          <View>
            <Text style={ds.headerEyebrow}>OVERVIEW</Text>
            <Text style={ds.headerTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity style={ds.notifBtn} onPress={signOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={C.textSub} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={ds.scroll} contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Hero card ── */}
        <View style={[ds.heroCard, CARD_SHADOW]}>
          {/* decorative circle */}
          <View style={ds.heroDeco} />
          <View style={ds.heroDeco2} />

          <Text style={ds.heroEyebrow}>TOTAL COLLECTION VALUE</Text>
          <Text style={ds.heroValue}>${totalValue.toLocaleString()}</Text>

          <View style={ds.heroRow}>
            <View style={ds.heroBadge}>
              <Ionicons name="trending-up" size={12} color={C.success} />
              <Text style={ds.heroBadgeText}>+12.4% this month</Text>
            </View>
            <Text style={ds.heroDate}>{month}</Text>
          </View>

          {/* mini sub-stats */}
          <View style={ds.heroStats}>
            <View style={ds.heroStat}>
              <Text style={ds.heroStatNum}>{coins.length}</Text>
              <Text style={ds.heroStatLbl}>Coins</Text>
            </View>
            <View style={ds.heroStatDiv} />
            <View style={ds.heroStat}>
              <Text style={ds.heroStatNum}>{countries}</Text>
              <Text style={ds.heroStatLbl}>Countries</Text>
            </View>
            <View style={ds.heroStatDiv} />
            <View style={ds.heroStat}>
              <Text style={ds.heroStatNum}>${avgValue.toLocaleString()}</Text>
              <Text style={ds.heroStatLbl}>Avg. Value</Text>
            </View>
          </View>
        </View>

        {/* ── Category filter chips ── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={ds.filterBar} contentContainerStyle={ds.filterContent}
        >
          {['All', ...CATEGORIES].map(cat => {
            const isActive = cat === 'All' ? categoryFilter === null : categoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[ds.chip, isActive && ds.chipActive]}
                onPress={() => setCategoryFilter(cat === 'All' ? null : cat)}
                activeOpacity={0.8}
              >
                <Text style={[ds.chipText, isActive && ds.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Stat cards row ── */}
        <View style={ds.statsRow}>
          <StatCard
            icon="star-outline" iconBg="#FEF3C7" iconColor="#D97706"
            label="GOLD VALUE"
            value={`$${goldTotal.toLocaleString()}`}
            sub={`${coins.filter(c => c.metal === 'Gold').length} coins`}
          />
          <StatCard
            icon="diamond-outline" iconBg={C.accentLight} iconColor={C.accent}
            label="RARE COINS"
            value={coins.filter(c => c.rarity === 'rare' || c.rarity === 'legendary').length}
            sub="Rare or above" subColor={RARITY.rare.color}
          />
          <StatCard
            icon="globe-outline" iconBg={C.successLight} iconColor={C.success}
            label="COUNTRIES"
            value={countries}
            sub="Origins"
          />
        </View>

        {/* ── Donut chart ── */}
        <View style={ds.section}>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Breakdown by Category</Text>
            <TouchableOpacity>
              <Text style={ds.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={[ds.card, CARD_SHADOW]}>
            <DonutChart data={chartData} total={totalValue} />
          </View>
        </View>

        {/* ── Top 5 ── */}
        <View style={ds.section}>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Top 5 Most Valuable</Text>
            <TouchableOpacity>
              <Text style={ds.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={[ds.card, CARD_SHADOW]}>
            {topCoins.length === 0
              ? <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>No coins yet — scan one to get started.</Text>
              : topCoins.map((coin, i) => (
                <View key={coin.id}>
                  <TopRow coin={coin} rank={i + 1} maxValue={topCoins[0].value} />
                  {i < topCoins.length - 1 && <View style={ds.topDivider} />}
                </View>
              ))
            }
          </View>
        </View>

        {/* ── Summary table ── */}
        <View style={ds.section}>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Quick Summary</Text>
          </View>
          <View style={[ds.card, CARD_SHADOW, { padding: 0, overflow: 'hidden' }]}>
            {[
              { label: 'Gold coins',    value: coins.filter(c => c.metal === 'Gold').length,   color: '#D97706' },
              { label: 'Silver coins',  value: coins.filter(c => c.metal === 'Silver').length, color: C.textSub },
              { label: 'Common',        value: coins.filter(c => c.rarity === 'common').length,   color: RARITY.common.color },
              { label: 'Uncommon',      value: coins.filter(c => c.rarity === 'uncommon').length, color: RARITY.uncommon.color },
              { label: 'Rare or above', value: coins.filter(c => c.rarity === 'rare' || c.rarity === 'legendary').length, color: RARITY.rare.color },
            ].map((row, i, arr) => (
              <View key={row.label} style={[ds.summaryRow, i < arr.length - 1 && ds.summaryBorder]}>
                <Text style={ds.summaryLabel}>{row.label}</Text>
                <Text style={[ds.summaryValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const ds = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  safeArea:{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  scroll:  { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 36 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
  },
  headerEyebrow: { fontSize: 10, color: C.textMuted, letterSpacing: 2.5, fontWeight: '700' },
  headerTitle:   { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  // Hero card
  heroCard: {
    backgroundColor: C.accent,
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroDeco: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDeco2: {
    position: 'absolute', bottom: -30, right: 40,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroEyebrow: {
    fontSize: 9, color: 'rgba(255,255,255,0.70)', letterSpacing: 2.5, fontWeight: '700', marginBottom: 8,
  },
  heroValue: {
    fontSize: 40, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5, marginBottom: 12,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  heroBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  heroDate:      { fontSize: 11, color: 'rgba(255,255,255,0.60)' },

  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 14,
  },
  heroStat:    { flex: 1, alignItems: 'center' },
  heroStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.20)', marginVertical: 2 },
  heroStatNum: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 3, letterSpacing: 0.3 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 13,
    alignItems: 'flex-start',
    borderWidth: 1, borderColor: C.border,
  },
  statIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  statLabel: { fontSize: 9,  color: C.textMuted, letterSpacing: 1.5, fontWeight: '700', marginTop: 4 },
  statSub:   { fontSize: 10, color: C.textMuted, marginTop: 2 },

  // Section
  section:       { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  sectionLink:  { fontSize: 12, color: C.accent, fontWeight: '600' },

  // Generic card shell
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1, borderColor: C.border,
  },

  // Top 5
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  rankBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadge1: { backgroundColor: C.accentLight, borderColor: C.accent + '60' },
  rankText:   { fontSize: 12, fontWeight: '700', color: C.textSub },
  rankText1:  { color: C.accent },

  topMid: { flex: 1 },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  topName: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text },
  topRarityPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  topRarityPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },

  barTrack: { height: 3, backgroundColor: C.border, borderRadius: 2, marginBottom: 5 },
  barFill:  { height: 3, borderRadius: 2 },

  topMeta:    { fontSize: 11, color: C.textSub },
  topVal:     { fontSize: 14, fontWeight: '800', color: C.text },
  topDivider: { height: 1, backgroundColor: C.borderLight },

  // Category filter chips
  filterBar:     { maxHeight: 48, marginBottom: 16 },
  filterContent: { paddingBottom: 4, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
  },
  chipActive:     { backgroundColor: C.accentLight, borderColor: C.accent + '60' },
  chipText:       { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  chipTextActive: { color: C.accent },

  // Summary table
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 18,
  },
  summaryBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  summaryLabel:  { fontSize: 13, color: C.textSub },
  summaryValue:  { fontSize: 14, fontWeight: '700' },
});

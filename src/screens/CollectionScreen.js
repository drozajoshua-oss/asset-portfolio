import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RARITY, CARD_SHADOW } from '../constants/colors';
import { useCollection } from '../context/CollectionContext';

const { width: W } = Dimensions.get('window');
const GAP = 12;
const PAD = 16;
const CARD_W = (W - PAD * 2 - GAP) / 2;

const CATEGORY_ICONS = {
  'Sports Cards': 'football-outline',
  'Art':          'color-palette-outline',
  'Coins':        'ellipse-outline',
  'Watches':      'time-outline',
  'Sneakers':     'walk-outline',
  'Wine':         'wine-outline',
  'Jewellery':    'diamond-outline',
  'Vintage Cars': 'car-outline',
  'Comics':       'book-outline',
  'Stamps':       'mail-outline',
  'Other':        'pricetag-outline',
};
const iconFor = cat => CATEGORY_ICONS[cat] || 'pricetag-outline';

function CoinCircle({ color, symbol, size }) {
  return (
    <View style={[col.ring1, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '14', borderColor: color + '40',
    }]}>
      <View style={[col.ring2, {
        width: size * 0.74, height: size * 0.74, borderRadius: size * 0.37,
        backgroundColor: color + '24', borderColor: color + '60',
      }]}>
        <View style={[col.ring3, {
          width: size * 0.46, height: size * 0.46, borderRadius: size * 0.23,
          backgroundColor: color + '38',
        }]}>
          <Text style={{ fontSize: size * 0.26, color, fontWeight: '800' }}>{symbol}</Text>
        </View>
      </View>
    </View>
  );
}

const PREMIUM = new Set(['Watches', 'Art', 'Vintage Cars', 'Jewellery']);

function CoinCard({ coin, onEdit }) {
  const r = RARITY[coin.rarity] ?? RARITY.common;
  const isPremium = coin.category ? PREMIUM.has(coin.category) : coin.metal === 'Gold';
  return (
    <View style={[col.card, { width: CARD_W }, CARD_SHADOW]}>
      {/* Top stripe */}
      <View style={[col.stripe, { backgroundColor: r.color }]} />

      <View style={col.cardBody}>
        <View style={col.coinWrap}>
          <CoinCircle color={coin.coinColor} symbol={coin.symbolChar} size={68} />
        </View>

        <Text style={col.coinName} numberOfLines={2}>{coin.name}</Text>
        <Text style={col.coinMeta}>{coin.country} · {coin.year}</Text>

        <View style={col.cardFooter}>
          <Text style={col.coinValue}>${coin.value.toLocaleString()}</Text>
          <View style={[col.metalTag, {
            backgroundColor: isPremium ? '#FEF3C7' : '#F1F5F9',
          }]}>
            <Text style={[col.metalTagText, { color: isPremium ? '#D97706' : '#64748B' }]}>
              {coin.category ?? 'Other'}
            </Text>
          </View>
        </View>

        <View style={[col.rarityRow, { backgroundColor: r.bg }]}>
          <View style={[col.rarityDot, { backgroundColor: r.color }]} />
          <Text style={[col.rarityText, { color: r.color }]}>{r.label}</Text>
        </View>

        <TouchableOpacity style={col.editBtn} onPress={() => onEdit(coin)} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={11} color={C.textMuted} />
          <Text style={col.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CollectionScreen() {
  const { coins: allCoins, loading, updateCoinValue, deleteCoin } = useCollection();
  const [active, setActive] = useState('All');
  const [editingCoin, setEditingCoin] = useState(null);
  const [editValue, setEditValue] = useState('');

  const coins = allCoins.filter(c => {
    if (active === 'All') return true;
    return (c.category ?? 'Other') === active;
  });

  // Filter chips: "All" + only the categories actually present (incl. custom ones).
  const filters = [
    { label: 'All', icon: 'apps-outline' },
    ...[...new Set(allCoins.map(c => c.category).filter(Boolean))]
      .map(c => ({ label: c, icon: iconFor(c) })),
  ];

  const pairs = [];
  for (let i = 0; i < coins.length; i += 2) pairs.push(coins.slice(i, i + 2));

  function openEdit(coin) {
    setEditingCoin(coin);
    setEditValue(String(coin.value));
  }

  function confirmDelete() {
    const item = editingCoin;
    Alert.alert(
      'Delete item',
      `Remove "${item.name}" from your collection? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { setEditingCoin(null); deleteCoin(item.id); } },
      ],
    );
  }

  function saveEdit() {
    const v = parseFloat(editValue);
    if (!isNaN(v) && v >= 0) updateCoinValue(editingCoin.id, Math.round(v));
    setEditingCoin(null);
  }

  return (
    <View style={col.root}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={col.safeArea}>
        <View style={col.header}>
          <View>
            <Text style={col.headerEyebrow}>YOUR VAULT</Text>
            <Text style={col.headerTitle}>Collection</Text>
          </View>
          <View style={col.headerStats}>
            <View style={col.statPill}>
              <Ionicons name="layers-outline" size={13} color={C.accent} />
              <Text style={col.statPillText}>{allCoins.length} {allCoins.length === 1 ? 'item' : 'items'}</Text>
            </View>
            <View style={[col.statPill, col.statPillGold]}>
              <Text style={col.statPillGoldText}>${allCoins.reduce((s, c) => s + c.value, 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={col.filterBar} contentContainerStyle={col.filterContent}
        >
          {filters.map(f => {
            const isActive = active === f.label;
            return (
              <TouchableOpacity
                key={f.label}
                style={[col.chip, isActive && col.chipActive]}
                onPress={() => setActive(f.label)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={isActive ? C.accent : C.textMuted}
                />
                <Text style={[col.chipText, isActive && col.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Grid ── */}
      {loading ? (
        <View style={col.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : null}
      <ScrollView style={col.scroll} contentContainerStyle={col.scrollContent} showsVerticalScrollIndicator={false}>
        {pairs.map((pair, pi) => (
          <View key={pi} style={col.row}>
            {pair.map(coin => <CoinCard key={coin.id} coin={coin} onEdit={openEdit} />)}
          </View>
        ))}

        {coins.length === 0 && (
          <View style={col.empty}>
            <View style={col.emptyIcon}>
              <Ionicons name="albums-outline" size={32} color={C.textMuted} />
            </View>
            <Text style={col.emptyTitle}>No items found</Text>
            <Text style={col.emptyText}>Try a different filter</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={editingCoin !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCoin(null)}
      >
        <KeyboardAvoidingView
          style={col.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={col.modalBox}>
            <Text style={col.modalTitle}>Edit item</Text>
            <Text style={col.modalSub} numberOfLines={2}>{editingCoin?.name}</Text>
            <TextInput
              style={col.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              placeholder="Enter new value"
              placeholderTextColor={C.textMuted}
              autoFocus
            />
            <View style={col.modalActions}>
              <TouchableOpacity style={col.modalCancel} onPress={() => setEditingCoin(null)} activeOpacity={0.8}>
                <Text style={col.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={col.modalSave} onPress={saveEdit} activeOpacity={0.8}>
                <Text style={col.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={col.modalDelete} onPress={confirmDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={15} color={C.danger} />
              <Text style={col.modalDeleteText}>Delete item</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const col = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  safeArea: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 12,
  },
  headerEyebrow: {
    fontSize: 10, color: C.textMuted, letterSpacing: 2.5, fontWeight: '700',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.4,
  },
  headerStats: { gap: 6, alignItems: 'flex-end' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statPillText: { fontSize: 11, fontWeight: '700', color: C.accent },
  statPillGold: { backgroundColor: '#FEF3C7' },
  statPillGoldText: { fontSize: 12, fontWeight: '800', color: '#B45309' },

  filterBar: { maxHeight: 48 },
  filterContent: { paddingHorizontal: PAD, paddingBottom: 12, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accentLight, borderColor: C.accent + '60' },
  chipText:       { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  chipTextActive: { color: C.accent },

  scroll:        { flex: 1 },
  scrollContent: { padding: PAD, paddingTop: 14 },
  row:           { flexDirection: 'row', gap: GAP, marginBottom: GAP },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  stripe: { height: 4 },
  cardBody: { padding: 14 },
  coinWrap: { alignItems: 'center', marginBottom: 12 },
  coinName: { fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 18, textAlign: 'center' },
  coinMeta: { fontSize: 11, color: C.textSub, textAlign: 'center', marginTop: 2 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, marginBottom: 8,
  },
  coinValue: { fontSize: 16, fontWeight: '800', color: C.accent },
  metalTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metalTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  rarityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  rarityDot:  { width: 6, height: 6, borderRadius: 3 },
  rarityText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },

  empty: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptyText:  { fontSize: 13, color: C.textSub },

  loadingWrap: { position: 'absolute', top: 80, left: 0, right: 0, zIndex: 10, alignItems: 'center' },

  ring1: { borderWidth: 2,   alignItems: 'center', justifyContent: 'center' },
  ring2: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ring3: {                   alignItems: 'center', justifyContent: 'center' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 8, paddingVertical: 4,
  },
  editBtnText: { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    width: 300, backgroundColor: C.surface,
    borderRadius: 18, padding: 24,
    borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4 },
  modalSub:   { fontSize: 12, color: C.textSub, marginBottom: 18, lineHeight: 17 },
  modalInput: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 20, fontWeight: '700', color: C.text,
    backgroundColor: C.bg, marginBottom: 20, textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: C.textSub },
  modalSave: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.accent, alignItems: 'center',
  },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalDelete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 8,
  },
  modalDeleteText: { fontSize: 13, fontWeight: '700', color: C.danger },
});

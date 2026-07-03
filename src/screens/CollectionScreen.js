import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  RefreshControl, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RARITY, CARD_SHADOW } from '../constants/colors';
import { useCollection } from '../context/CollectionContext';
import { CATEGORIES } from '../data/items';

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

const SORTS = [
  { id: 'newest', label: 'Newest',     icon: 'time-outline' },
  { id: 'value',  label: 'Value',      icon: 'trending-up-outline' },
  { id: 'name',   label: 'Name (A–Z)', icon: 'text-outline' },
];

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

function CoinCard({ coin, onOpen }) {
  const r = RARITY[coin.rarity] ?? RARITY.common;
  const isPremium = PREMIUM.has(coin.category);
  return (
    <TouchableOpacity
      style={[col.card, { width: CARD_W }, CARD_SHADOW]}
      onPress={() => onOpen(coin)}
      activeOpacity={0.85}
    >
      {/* Top stripe */}
      <View style={[col.stripe, { backgroundColor: r.color }]} />

      <View style={col.cardBody}>
        <View style={col.coinWrap}>
          {coin.photoUrls?.[0] ? (
            <Image source={{ uri: coin.photoUrls[0] }} style={col.cardPhoto} />
          ) : (
            <CoinCircle color={coin.coinColor} symbol={coin.symbolChar} size={68} />
          )}
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

        <View style={col.editBtn}>
          <Ionicons name="information-circle-outline" size={11} color={C.textMuted} />
          <Text style={col.editBtnText}>View details</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Shared form used by both "Edit item" and "Add item".
function ItemForm({ draft, setDraft }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  return (
    <>
      <Text style={col.fieldLabel}>Name</Text>
      <TextInput
        style={col.formInput}
        value={draft.name}
        onChangeText={t => set('name', t)}
        placeholder="e.g. 1921 Morgan Silver Dollar"
        placeholderTextColor={C.textMuted}
      />

      <View style={col.fieldRow}>
        <View style={{ flex: 1 }}>
          <Text style={col.fieldLabel}>Country / Origin</Text>
          <TextInput
            style={col.formInput}
            value={draft.country}
            onChangeText={t => set('country', t)}
            placeholder="e.g. USA"
            placeholderTextColor={C.textMuted}
          />
        </View>
        <View style={{ width: 100 }}>
          <Text style={col.fieldLabel}>Year</Text>
          <TextInput
            style={col.formInput}
            value={draft.year}
            onChangeText={t => set('year', t.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="2024"
            placeholderTextColor={C.textMuted}
          />
        </View>
      </View>

      <Text style={col.fieldLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={col.catScroll}>
        {CATEGORIES.map(cat => {
          const on = draft.category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[col.catChip, on && col.catChipOn]}
              onPress={() => set('category', cat)}
              activeOpacity={0.8}
            >
              <Ionicons name={iconFor(cat)} size={12} color={on ? '#FFF' : C.textMuted} />
              <Text style={[col.catChipText, on && col.catChipTextOn]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={col.fieldLabel}>Estimated value ($)</Text>
      <TextInput
        style={col.formInput}
        value={draft.value}
        onChangeText={t => set('value', t.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={C.textMuted}
      />
    </>
  );
}

const emptyDraft = { name: '', country: '', year: '', category: 'Other', value: '' };

export default function CollectionScreen() {
  const { coins: allCoins, loading, updateCoin, addManualCoin, deleteCoin, refresh } = useCollection();
  const [active, setActive] = useState('All');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sort, setSort] = useState('newest');
  const [showSort, setShowSort] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [detailCoin, setDetailCoin] = useState(null);   // detail view
  const [editing, setEditing] = useState(false);         // edit modal (uses detailCoin)
  const [adding, setAdding] = useState(false);           // manual add modal
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  // Filter → search → sort pipeline.
  const coins = useMemo(() => {
    let list = allCoins.filter(c => active === 'All' || (c.category ?? 'Other') === active);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        String(c.year).includes(q)
      );
    }
    if (sort === 'value') list = [...list].sort((a, b) => b.value - a.value);
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    // 'newest' keeps the load order (created_at desc).
    return list;
  }, [allCoins, active, query, sort]);

  // Filter chips: "All" + only the categories actually present (incl. custom ones).
  const filters = [
    { label: 'All', icon: 'apps-outline' },
    ...[...new Set(allCoins.map(c => c.category).filter(Boolean))]
      .map(c => ({ label: c, icon: iconFor(c) })),
  ];

  const pairs = [];
  for (let i = 0; i < coins.length; i += 2) pairs.push(coins.slice(i, i + 2));

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function openDetail(coin) {
    setDetailCoin(coin);
    setEditing(false);
  }

  function startEdit() {
    setDraft({
      name: detailCoin.name,
      country: detailCoin.country || '',
      year: detailCoin.year ? String(detailCoin.year) : '',
      category: detailCoin.category || 'Other',
      value: String(detailCoin.value ?? ''),
    });
    setEditing(true);
  }

  function startAdd() {
    setDraft(emptyDraft);
    setAdding(true);
  }

  function openEbay(coin) {
    const q = encodeURIComponent(`${coin.name} ${coin.year || ''}`.trim());
    // Affiliate-ready: swap to an EPN rover URL later.
    Linking.openURL(`https://www.ebay.com/sch/i.html?_nkw=${q}`);
  }

  function confirmDelete(coin) {
    Alert.alert(
      'Delete item',
      `Remove "${coin.name}" from your collection? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => { setEditing(false); setDetailCoin(null); deleteCoin(coin.id); },
        },
      ],
    );
  }

  async function saveEdit() {
    if (!draft.name.trim()) { Alert.alert('Name required', 'Please enter a name for this item.'); return; }
    setSaving(true);
    const { error } = await updateCoin(detailCoin.id, {
      name: draft.name.trim(),
      country: draft.country.trim(),
      year: parseInt(draft.year, 10) || 0,
      category: draft.category || 'Other',
      value: Math.round(parseFloat(draft.value) || 0),
    });
    setSaving(false);
    if (error) { Alert.alert('Could not save', 'Please try again.'); return; }
    setEditing(false);
    setDetailCoin(null);
  }

  async function saveAdd() {
    if (!draft.name.trim()) { Alert.alert('Name required', 'Please enter a name for this item.'); return; }
    setSaving(true);
    const { error } = await addManualCoin({
      name: draft.name.trim(),
      country: draft.country.trim(),
      year: parseInt(draft.year, 10) || 0,
      category: draft.category || 'Other',
      value: Math.round(parseFloat(draft.value) || 0),
    });
    setSaving(false);
    if (error) { Alert.alert('Could not add item', 'Please try again.'); return; }
    setAdding(false);
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
          <View style={col.headerActions}>
            <TouchableOpacity
              style={[col.iconBtn, showSearch && col.iconBtnOn]}
              onPress={() => { setShowSearch(s => !s); if (showSearch) setQuery(''); }}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={18} color={showSearch ? C.accent : C.textSub} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[col.iconBtn, showSort && col.iconBtnOn]}
              onPress={() => setShowSort(s => !s)}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical" size={18} color={showSort ? C.accent : C.textSub} />
            </TouchableOpacity>
            <TouchableOpacity style={[col.iconBtn, col.addBtn]} onPress={startAdd} activeOpacity={0.85}>
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats line */}
        <View style={col.statsLine}>
          <View style={col.statPill}>
            <Ionicons name="layers-outline" size={13} color={C.accent} />
            <Text style={col.statPillText}>{allCoins.length} {allCoins.length === 1 ? 'item' : 'items'}</Text>
          </View>
          <View style={[col.statPill, col.statPillGold]}>
            <Text style={col.statPillGoldText}>${allCoins.reduce((s, c) => s + c.value, 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Search box */}
        {showSearch && (
          <View style={col.searchWrap}>
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              style={col.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, country, category…"
              placeholderTextColor={C.textMuted}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sort options */}
        {showSort && (
          <View style={col.sortRow}>
            {SORTS.map(s => {
              const on = sort === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[col.sortChip, on && col.sortChipOn]}
                  onPress={() => { setSort(s.id); setShowSort(false); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={s.icon} size={13} color={on ? C.accent : C.textMuted} />
                  <Text style={[col.sortChipText, on && col.sortChipTextOn]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
                <Ionicons name={f.icon} size={13} color={isActive ? C.accent : C.textMuted} />
                <Text style={[col.chipText, isActive && col.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Grid ── */}
      {loading && !refreshing ? (
        <View style={col.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : null}
      <ScrollView
        style={col.scroll}
        contentContainerStyle={col.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />
        }
      >
        {pairs.map((pair, pi) => (
          <View key={pi} style={col.row}>
            {pair.map(coin => <CoinCard key={coin.id} coin={coin} onOpen={openDetail} />)}
          </View>
        ))}

        {coins.length === 0 && (
          <View style={col.empty}>
            <View style={col.emptyIcon}>
              <Ionicons name={query || active !== 'All' ? 'search-outline' : 'albums-outline'} size={32} color={C.textMuted} />
            </View>
            <Text style={col.emptyTitle}>
              {query || active !== 'All' ? 'No matches' : 'No items yet'}
            </Text>
            <Text style={col.emptyText}>
              {query || active !== 'All'
                ? 'Try a different search or filter'
                : 'Scan an item or add one manually with +'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Detail modal ── */}
      <Modal
        visible={detailCoin !== null && !editing}
        transparent animationType="slide"
        onRequestClose={() => setDetailCoin(null)}
      >
        <View style={col.sheetOverlay}>
          <View style={col.sheet}>
            <View style={col.sheetHandle} />
            {detailCoin && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={col.detailHead}>
                  {detailCoin.photoUrls?.[0] ? (
                    <Image source={{ uri: detailCoin.photoUrls[0] }} style={col.detailPhoto} />
                  ) : (
                    <CoinCircle color={detailCoin.coinColor} symbol={detailCoin.symbolChar} size={84} />
                  )}
                  <Text style={col.detailName}>{detailCoin.name}</Text>
                  <Text style={col.detailMeta}>{detailCoin.country} · {detailCoin.year || '—'}</Text>
                </View>

                {detailCoin.photoUrls?.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={col.photoStrip}>
                    {detailCoin.photoUrls.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={col.photoStripImg} />
                    ))}
                  </ScrollView>
                )}

                <View style={col.detailValueCard}>
                  <Text style={col.detailValueLabel}>ESTIMATED VALUE</Text>
                  <Text style={col.detailValue}>${detailCoin.value.toLocaleString()}</Text>
                </View>

                <View style={col.detailRows}>
                  <DetailRow icon={iconFor(detailCoin.category)} label="Category" value={detailCoin.category ?? 'Other'} />
                  <DetailRow icon="ribbon-outline" label="Rarity" value={(RARITY[detailCoin.rarity] ?? RARITY.common).label} />
                </View>

                <TouchableOpacity style={col.ebayBtn} onPress={() => openEbay(detailCoin)} activeOpacity={0.85}>
                  <Ionicons name="pricetags-outline" size={16} color={C.accent} />
                  <Text style={col.ebayBtnText}>See live eBay listings</Text>
                  <Ionicons name="open-outline" size={14} color={C.accent} />
                </TouchableOpacity>

                <View style={col.detailActions}>
                  <TouchableOpacity style={col.detailEdit} onPress={startEdit} activeOpacity={0.85}>
                    <Ionicons name="pencil" size={15} color="#FFF" />
                    <Text style={col.detailEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={col.detailClose} onPress={() => setDetailCoin(null)} activeOpacity={0.85}>
                    <Text style={col.detailCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={col.modalDelete} onPress={() => confirmDelete(detailCoin)} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={15} color={C.danger} />
                  <Text style={col.modalDeleteText}>Delete item</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Edit modal ── */}
      <FormModal
        visible={editing}
        title="Edit item"
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onCancel={() => setEditing(false)}
        onSave={saveEdit}
        saveLabel="Save changes"
      />

      {/* ── Add modal ── */}
      <FormModal
        visible={adding}
        title="Add item"
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onCancel={() => setAdding(false)}
        onSave={saveAdd}
        saveLabel="Add to vault"
      />
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={col.detailRow}>
      <View style={col.detailRowLeft}>
        <Ionicons name={icon} size={15} color={C.textMuted} />
        <Text style={col.detailRowLabel}>{label}</Text>
      </View>
      <Text style={col.detailRowValue}>{value}</Text>
    </View>
  );
}

function FormModal({ visible, title, draft, setDraft, saving, onCancel, onSave, saveLabel }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={col.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={col.sheet}>
          <View style={col.sheetHandle} />
          <Text style={col.sheetTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <ItemForm draft={draft} setDraft={setDraft} />
            <View style={col.formActions}>
              <TouchableOpacity style={col.modalCancel} onPress={onCancel} activeOpacity={0.8} disabled={saving}>
                <Text style={col.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[col.modalSave, saving && { opacity: 0.6 }]} onPress={onSave} activeOpacity={0.8} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={col.modalSaveText}>{saveLabel}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const col = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  safeArea: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 6,
  },
  headerEyebrow: {
    fontSize: 10, color: C.textMuted, letterSpacing: 2.5, fontWeight: '700',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.4,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  iconBtnOn: { backgroundColor: C.accentLight, borderColor: C.accent + '60' },
  addBtn: { backgroundColor: C.accent, borderColor: C.accent },

  statsLine: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: PAD, paddingBottom: 10,
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statPillText: { fontSize: 11, fontWeight: '700', color: C.accent },
  statPillGold: { backgroundColor: '#FEF3C7' },
  statPillGoldText: { fontSize: 12, fontWeight: '800', color: '#B45309' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: PAD, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, padding: 0 },

  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: PAD, paddingBottom: 10 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  sortChipOn: { backgroundColor: C.accentLight, borderColor: C.accent + '60' },
  sortChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  sortChipTextOn: { color: C.accent },

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
  cardPhoto: { width: 68, height: 68, borderRadius: 16, backgroundColor: '#EEF2FF' },
  coinName: { fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 18, textAlign: 'center' },
  coinMeta: { fontSize: 11, color: C.textSub, textAlign: 'center', marginTop: 2 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, marginBottom: 8,
  },
  coinValue: { fontSize: 16, fontWeight: '800', color: C.accent },
  metalTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, maxWidth: 90 },
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
  emptyText:  { fontSize: 13, color: C.textSub, textAlign: 'center', paddingHorizontal: 40 },

  loadingWrap: { position: 'absolute', top: 80, left: 0, right: 0, zIndex: 10, alignItems: 'center' },

  ring1: { borderWidth: 2,   alignItems: 'center', justifyContent: 'center' },
  ring2: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ring3: {                   alignItems: 'center', justifyContent: 'center' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 8, paddingVertical: 4,
  },
  editBtnText: { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  // Bottom-sheet style modal
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 32,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: C.text, marginBottom: 16 },

  // Detail view
  detailHead: { alignItems: 'center', marginBottom: 18 },
  detailPhoto: { width: 132, height: 132, borderRadius: 20, backgroundColor: '#EEF2FF', marginBottom: 4 },
  photoStrip: { marginBottom: 16 },
  photoStripImg: { width: 88, height: 88, borderRadius: 12, marginRight: 8, backgroundColor: '#EEF2FF' },
  detailName: { fontSize: 19, fontWeight: '800', color: C.text, textAlign: 'center', marginTop: 14 },
  detailMeta: { fontSize: 13, color: C.textSub, marginTop: 4 },
  detailValueCard: {
    backgroundColor: C.accentLight, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
  },
  detailValueLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: C.accent },
  detailValue: { fontSize: 30, fontWeight: '900', color: C.accent, marginTop: 4, letterSpacing: -0.5 },
  detailRows: { gap: 2, marginBottom: 16 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailRowLabel: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  detailRowValue: { fontSize: 14, color: C.text, fontWeight: '700' },

  ebayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: C.accentLight, borderWidth: 1, borderColor: C.accent + '40',
    marginBottom: 18,
  },
  ebayBtnText: { fontSize: 14, fontWeight: '700', color: C.accent },

  detailActions: { flexDirection: 'row', gap: 10 },
  detailEdit: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent,
  },
  detailEditText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  detailClose: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  detailCloseText: { fontSize: 15, fontWeight: '700', color: C.textSub },

  // Form
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6, marginTop: 14 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  formInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  catScroll: { flexGrow: 0 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  catChipOn: { backgroundColor: C.accent, borderColor: C.accent },
  catChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  catChipTextOn: { color: '#FFF' },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 24 },

  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: C.textSub },
  modalSave: {
    flex: 1.4, paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.accent, alignItems: 'center',
  },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalDelete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 8,
  },
  modalDeleteText: { fontSize: 13, fontWeight: '700', color: C.danger },
});

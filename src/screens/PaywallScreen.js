import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';
import { usePremium } from '../context/PremiumContext';
import { fetchAvailablePlans } from '../services/purchases';
import IconBackdrop from '../components/IconBackdrop';

const GOLD = '#F5B301';

// App Review (guideline 3.1.2) requires functional Terms of Use and Privacy
// Policy links inside the purchase flow itself.
const TERMS_URL   = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://drozajoshua-oss.github.io/asset-portfolio/privacy-policy.html';

const FEATURES = [
  { icon: 'infinite',         title: 'Unlimited scans',         body: 'Identify as many items as you want — no monthly cap.' },
  { icon: 'images',           title: 'Multi-angle AI',          body: 'Combine several photos for a more accurate identification.' },
  { icon: 'trending-up',      title: 'Live market values',      body: 'Up-to-date value estimates across every collectible category.' },
  { icon: 'stats-chart',      title: 'Full portfolio analytics', body: 'Track your total worth, breakdowns, and top movers.' },
  { icon: 'cloud-upload',     title: 'Export your collection',  body: 'Download your full vault any time as a backup.' },
  { icon: 'flash',            title: 'Priority processing',     body: 'Faster scans and first access to new features.' },
];

const PLANS = [
  {
    id: 'annual',
    label: 'Annual',
    price: '$39.99',
    per: '/year',
    sub: 'Just $3.33/mo — billed yearly',
    badge: 'BEST VALUE · SAVE 33%',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    per: '/month',
    sub: 'Billed monthly, cancel anytime',
    badge: null,
  },
];

// Rendered only when RevenueCat's offering actually contains $rc_lifetime,
// so this can ship ahead of the store config without a dead button.
const LIFETIME_PLAN = {
  id: 'lifetime',
  label: 'Lifetime',
  price: '$99.99',
  per: 'one time',
  sub: 'One payment — yours forever',
  badge: null,
};

const APP_STORE_URL = 'https://apps.apple.com/app/id6786001252';

export default function PaywallScreen({ visible, onClose }) {
  const [selected, setSelected] = useState('annual');
  const [busy, setBusy] = useState(false);
  // Localized priceStrings by plan id, from the live offering. Also gates the
  // lifetime card: it only renders once RevenueCat serves a lifetime package.
  const [livePrices, setLivePrices] = useState({});
  const { purchase, restore } = usePremium();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (visible) fetchAvailablePlans().then(setLivePrices).catch(() => {});
  }, [visible]);

  const plans = 'lifetime' in livePrices ? [...PLANS, LIFETIME_PLAN] : PLANS;
  const priceOf = p => livePrices[p.id] ?? p.price;

  async function handlePurchase() {
    setBusy(true);
    const res = await purchase(selected);
    setBusy(false);

    if (res?.ok) {
      Alert.alert('Welcome to Premium', 'Your vault is now fully unlocked.', [
        { text: 'Great', onPress: onClose },
      ]);
    } else if (res?.reason === 'not_configured') {
      Alert.alert('Almost there', 'In-app purchases will be enabled once billing is connected.', [{ text: 'OK' }]);
    } else if (res?.reason === 'cancelled') {
      // user backed out — no message needed
    } else {
      Alert.alert('Purchase failed', res?.message || 'Something went wrong. Please try again.', [{ text: 'OK' }]);
    }
  }

  async function handleRestore() {
    setBusy(true);
    const res = await restore();
    setBusy(false);

    if (res?.ok) {
      Alert.alert('Purchases restored', 'Your premium access is active again.', [{ text: 'Great', onPress: onClose }]);
    } else if (res?.reason === 'not_configured') {
      Alert.alert('Restore purchases', 'Purchases will be available once billing is connected.', [{ text: 'OK' }]);
    } else {
      Alert.alert('Restore purchases', 'No previous purchases were found on this account.', [{ text: 'OK' }]);
    }
  }

  const plan = plans.find(p => p.id === selected) ?? PLANS[0];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      {/* Native SafeAreaView measures zero insets inside iOS Modals — pad a
          plain View with the root provider's insets instead. */}
      <View style={[pw.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <IconBackdrop tint={GOLD} opacity={0.05} />
        {/* Close */}
        <View style={pw.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7} style={pw.closeBtn}>
            <Ionicons name="close" size={22} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView style={pw.scrollView} contentContainerStyle={pw.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={pw.hero}>
            <View style={pw.crownRing}>
              <Ionicons name="diamond" size={34} color={GOLD} />
            </View>
            <Text style={pw.title}>Trovault Premium</Text>
            <Text style={pw.subtitle}>Unlock the full power of your vault.</Text>
          </View>

          {/* Features */}
          <View style={pw.features}>
            {FEATURES.map(f => (
              <View key={f.title} style={pw.featureRow}>
                <View style={pw.featureIcon}>
                  <Ionicons name={f.icon} size={16} color={C.accent} />
                </View>
                <View style={pw.featureText}>
                  <Text style={pw.featureTitle}>{f.title}</Text>
                  <Text style={pw.featureBody}>{f.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Plans */}
          <View style={pw.plans}>
            {plans.map(p => {
              const active = p.id === selected;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[pw.plan, active && pw.planActive]}
                  onPress={() => setSelected(p.id)}
                  activeOpacity={0.85}
                >
                  {p.badge && (
                    <View style={pw.planBadge}>
                      <Text style={pw.planBadgeText}>{p.badge}</Text>
                    </View>
                  )}
                  <View style={pw.planMain}>
                    <View style={[pw.radio, active && pw.radioActive]}>
                      {active && <View style={pw.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pw.planLabel}>{p.label}</Text>
                      <Text style={pw.planSub}>{p.sub}</Text>
                    </View>
                    <View style={pw.planPriceWrap}>
                      <Text style={pw.planPrice}>{priceOf(p)}</Text>
                      <Text style={pw.planPer}>{p.per}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA */}
          <View style={pw.footer}>
            <TouchableOpacity
              style={[pw.cta, busy && pw.ctaDisabled]}
              onPress={isWeb ? () => Linking.openURL(APP_STORE_URL) : handlePurchase}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy
                ? <ActivityIndicator color="#FFF" />
                : <Text style={pw.ctaText}>
                    {isWeb ? 'Get the app to upgrade'
                      : plan.id === 'annual' ? 'Start 7-day free trial'
                      : plan.id === 'lifetime' ? 'Buy once — yours forever'
                      : 'Subscribe now'}
                  </Text>}
            </TouchableOpacity>
            <Text style={pw.ctaSub}>
              {isWeb
                ? 'Purchases are made in the iPhone app'
                : plan.id === 'annual'
                ? `7 days free, then ${priceOf(plan)}${plan.per} · Cancel anytime`
                : plan.id === 'lifetime'
                ? `${priceOf(plan)} once · No subscription, ever`
                : `${priceOf(plan)}${plan.per} · Cancel anytime`}
            </Text>
            {!isWeb && (
              <TouchableOpacity onPress={handleRestore} disabled={busy} hitSlop={8} activeOpacity={0.7}>
                <Text style={pw.restore}>Restore purchases</Text>
              </TouchableOpacity>
            )}
            <View style={pw.legalRow}>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8} activeOpacity={0.7}>
                <Text style={pw.legalLink}>Terms of Use (EULA)</Text>
              </TouchableOpacity>
              <Text style={pw.legalDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8} activeOpacity={0.7}>
                <Text style={pw.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const pw = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  // Hero
  hero: { alignItems: 'center', marginTop: 4, marginBottom: 28 },
  crownRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF8E6',
    borderWidth: 1, borderColor: GOLD + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.textSub, textAlign: 'center' },

  // Features
  features: { gap: 16, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.accentLight,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  featureBody: { fontSize: 12.5, lineHeight: 18, color: C.textSub, marginTop: 2 },

  // Plans
  plans: { gap: 12 },
  plan: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 14,
  },
  planActive: { borderColor: C.accent, backgroundColor: C.accentLight + '80' },
  planBadge: {
    position: 'absolute', top: -9, left: 16,
    backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  planBadgeText: { fontSize: 9, fontWeight: '900', color: '#3A2A00', letterSpacing: 0.5 },
  planMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  planLabel: { fontSize: 15, fontWeight: '800', color: C.text },
  planSub: { fontSize: 11.5, color: C.textSub, marginTop: 2 },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 17, fontWeight: '900', color: C.text },
  planPer: { fontSize: 11, color: C.textMuted },

  // Footer (sits at the end of the scroll content)
  footer: { marginTop: 24 },
  cta: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  ctaSub: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 10 },
  restore: { fontSize: 13, fontWeight: '700', color: C.accent, textAlign: 'center', marginTop: 12 },
  legalRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 14,
  },
  legalLink: { fontSize: 11.5, color: C.textMuted, textDecorationLine: 'underline' },
  legalDot: { fontSize: 11.5, color: C.textMuted },
});

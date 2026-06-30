import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { deleteAccount } from '../services/account';
import PaywallScreen from './PaywallScreen';

const PRIVACY_URL   = 'https://drozajoshua-oss.github.io/asset-portfolio/privacy-policy.html';
const SUPPORT_EMAIL = 'joshuadroza777@gmail.com';
const APP_VERSION   = '1.0.0';
const GOLD = '#F5B301';

function Row({ icon, iconColor, label, value, onPress, destructive, last }) {
  return (
    <TouchableOpacity
      style={[set.row, !last && set.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={18} color={iconColor || (destructive ? C.danger : C.textSub)} />
      <Text style={[set.rowLabel, destructive && { color: C.danger }]}>{label}</Text>
      {value ? <Text style={set.rowValue}>{value}</Text> : null}
      {onPress && !value ? <Ionicons name="chevron-forward" size={16} color={C.textMuted} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ visible, onClose }) {
  const { session, signOut } = useAuth();
  const { isPremium, restore } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);
  const [busy, setBusy] = useState(false);

  const email = session?.user?.email ?? '—';

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out of Trovault?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { onClose?.(); signOut(); } },
    ]);
  }

  async function handleRestore() {
    setBusy(true);
    const res = await restore();
    setBusy(false);
    if (res?.ok) Alert.alert('Purchases restored', 'Your premium access is active.');
    else if (res?.reason === 'not_configured') Alert.alert('Restore purchases', 'Purchases will be available once billing is connected.');
    else Alert.alert('Restore purchases', 'No previous purchases were found.');
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and your entire collection. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ],
    );
  }

  async function runDelete() {
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    if (res?.ok) {
      // Session is cleared inside deleteAccount → app returns to the auth screen.
      onClose?.();
    } else if (res?.reason === 'no-session') {
      Alert.alert('Not signed in', 'Please sign in again and retry.');
    } else {
      Alert.alert('Could not delete account', res?.message || 'Something went wrong. Please try again.');
    }
  }

  function openLink(url) {
    Linking.openURL(url).catch(() => Alert.alert('Unable to open link'));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={set.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={set.header}>
          <Text style={set.title}>Settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7} style={set.closeBtn}>
            <Ionicons name="close" size={22} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={set.scroll} showsVerticalScrollIndicator={false}>
          {/* Account */}
          <Text style={set.sectionLabel}>ACCOUNT</Text>
          <View style={set.card}>
            <Row icon="mail-outline" label="Email" value={email} last />
          </View>

          {/* Subscription */}
          <Text style={set.sectionLabel}>SUBSCRIPTION</Text>
          <View style={set.card}>
            <Row
              icon={isPremium ? 'diamond' : 'diamond-outline'}
              iconColor={isPremium ? GOLD : C.textSub}
              label="Plan"
              value={isPremium ? 'Premium' : 'Free'}
            />
            {!isPremium && (
              <Row icon="rocket-outline" iconColor={C.accent} label="Upgrade to Premium" onPress={() => setShowPaywall(true)} />
            )}
            <Row icon="refresh-outline" label="Restore purchases" onPress={handleRestore} last />
          </View>

          {/* About */}
          <Text style={set.sectionLabel}>ABOUT</Text>
          <View style={set.card}>
            <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => openLink(PRIVACY_URL)} />
            <Row icon="help-buoy-outline" label="Contact support" onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)} />
            <Row icon="information-circle-outline" label="Version" value={APP_VERSION} last />
          </View>

          {/* Danger zone */}
          <Text style={set.sectionLabel}>ACCOUNT ACTIONS</Text>
          <View style={set.card}>
            <Row icon="log-out-outline" label="Sign out" onPress={confirmSignOut} />
            <Row icon="trash-outline" label="Delete account" onPress={confirmDelete} destructive last />
          </View>

          <Text style={set.disclaimer}>
            Identifications and values are AI- and market-based estimates for guidance only — not professional appraisals. For high-value items, confirm with a qualified appraiser.
          </Text>

          <Text style={set.footnote}>Trovault · {APP_VERSION}</Text>
        </ScrollView>

        {busy && (
          <View style={set.busyOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        )}

        <PaywallScreen visible={showPaywall} onClose={() => setShowPaywall(false)} />
      </SafeAreaView>
    </Modal>
  );
}

const set = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.textMuted,
    letterSpacing: 1.5, marginBottom: 8, marginLeft: 4, marginTop: 18,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  rowLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  rowValue: { fontSize: 13, color: C.textMuted },

  disclaimer: { fontSize: 11, lineHeight: 16, color: C.textMuted, textAlign: 'center', marginTop: 22, paddingHorizontal: 6 },
  footnote: { textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 16 },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
});

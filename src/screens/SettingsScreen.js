import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, Linking, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { deleteAccount } from '../services/account';
import { supabase } from '../services/supabase';
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

  // Change-password modal
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwdText, setShowPwdText] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const email = session?.user?.email ?? '—';

  function openChangePwd() {
    setNewPwd('');
    setConfirmPwd('');
    setShowPwdText(false);
    setShowPwd(true);
  }

  async function savePassword() {
    if (newPwd.length < 6) { Alert.alert('Password too short', 'Use at least 6 characters.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Passwords don’t match', 'Please re-enter the same password.'); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) { Alert.alert('Could not update password', error.message || 'Please try again.'); return; }
    setShowPwd(false);
    Alert.alert('Password updated', 'Your password has been changed.');
  }

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

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Native SafeAreaView measures zero insets inside iOS Modals — pad a
          plain View with the root provider's insets instead. */}
      <View style={[set.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
            <Row icon="mail-outline" label="Email" value={email} />
            <Row icon="key-outline" label="Change password" onPress={openChangePwd} last />
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

        {/* Change password */}
        <Modal visible={showPwd} transparent animationType="fade" onRequestClose={() => setShowPwd(false)}>
          <KeyboardAvoidingView
            style={set.pwdOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={set.pwdBox}>
              <Text style={set.pwdTitle}>Change password</Text>
              <Text style={set.pwdSub}>Enter a new password for {email}.</Text>

              <View style={set.pwdInputWrap}>
                <TextInput
                  style={set.pwdInput}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  placeholder="New password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPwdText}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPwdText(s => !s)} hitSlop={8}>
                  <Ionicons name={showPwdText ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={set.pwdInputWrap}>
                <TextInput
                  style={set.pwdInput}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Confirm new password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPwdText}
                  autoCapitalize="none"
                />
              </View>

              <View style={set.pwdActions}>
                <TouchableOpacity style={set.pwdCancel} onPress={() => setShowPwd(false)} activeOpacity={0.8} disabled={savingPwd}>
                  <Text style={set.pwdCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[set.pwdSave, savingPwd && { opacity: 0.6 }]} onPress={savePassword} activeOpacity={0.8} disabled={savingPwd}>
                  {savingPwd ? <ActivityIndicator color="#FFF" /> : <Text style={set.pwdSaveText}>Update</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
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

  // Change-password modal
  pwdOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  pwdBox: {
    width: '100%', maxWidth: 360, backgroundColor: C.surface,
    borderRadius: 18, padding: 22, borderWidth: 1, borderColor: C.border,
  },
  pwdTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  pwdSub: { fontSize: 12.5, color: C.textSub, marginTop: 4, marginBottom: 16, lineHeight: 17 },
  pwdInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: C.bg, marginBottom: 12,
  },
  pwdInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.text },
  pwdActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  pwdCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  pwdCancelText: { fontSize: 14, fontWeight: '700', color: C.textSub },
  pwdSave: {
    flex: 1.3, paddingVertical: 13, borderRadius: 10,
    backgroundColor: C.accent, alignItems: 'center',
  },
  pwdSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

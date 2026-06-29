import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';
import { supabase } from '../services/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setMessage({ text: 'Please enter your email and password.', isError: true });
      return;
    }
    setMessage({ text: '', isError: false });
    setLoading(true);

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });

    setLoading(false);
    if (error) {
      setMessage({ text: error.message, isError: true });
    } else if (mode === 'signup') {
      setMessage({ text: 'Check your email to confirm your account before signing in.', isError: false });
    }
    // On successful login, AuthContext updates the session and App re-renders automatically.
  }

  function switchMode(next) {
    setMode(next);
    setMessage({ text: '', isError: false });
  }

  return (
    <SafeAreaView style={au.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={au.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Brand */}
        <View style={au.brand}>
          <View style={au.logoRing}>
            <Ionicons name="diamond-outline" size={32} color={C.accent} />
          </View>
          <Text style={au.appName}>YOUR ASSET PORTFOLIO</Text>
          <Text style={au.tagline}>Track what matters</Text>
        </View>

        {/* Card */}
        <View style={au.card}>
          {/* Mode toggle */}
          <View style={au.tabs}>
            <TouchableOpacity
              style={[au.tab, mode === 'login' && au.tabActive]}
              onPress={() => switchMode('login')}
              activeOpacity={0.8}
            >
              <Text style={[au.tabText, mode === 'login' && au.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[au.tab, mode === 'signup' && au.tabActive]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.8}
            >
              <Text style={[au.tabText, mode === 'signup' && au.tabTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={au.fields}>
            <View style={au.fieldWrap}>
              <Ionicons name="mail-outline" size={16} color={C.textMuted} style={au.fieldIcon} />
              <TextInput
                style={au.input}
                placeholder="Email address"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>
            <View style={au.fieldWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={C.textMuted} style={au.fieldIcon} />
              <TextInput
                style={au.input}
                placeholder="Password"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          </View>

          {/* Feedback */}
          {message.text ? (
            <View style={[au.msgBox, message.isError ? au.msgError : au.msgInfo]}>
              <Text style={[au.msgText, message.isError ? au.msgTextError : au.msgTextInfo]}>
                {message.text}
              </Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[au.btn, loading && au.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={au.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const au = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  kav:  { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  // Brand
  brand:    { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.accentLight,
    borderWidth: 1, borderColor: C.accent + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName: {
    fontSize: 13, fontWeight: '800', color: C.text,
    letterSpacing: 2.5, textAlign: 'center', marginBottom: 6,
  },
  tagline: { fontSize: 13, color: C.textMuted },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: C.border,
  },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: C.bg,
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  tab:          { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive:    { backgroundColor: C.accent },
  tabText:      { fontSize: 13, fontWeight: '700', color: C.textMuted },
  tabTextActive:{ color: '#FFF' },

  // Fields
  fields:    { gap: 12, marginBottom: 16 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, height: 52,
  },
  fieldIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 15, color: C.text },

  // Feedback
  msgBox:      { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  msgError:    { backgroundColor: '#FEE2E2' },
  msgInfo:     { backgroundColor: C.accentLight },
  msgText:     { fontSize: 13, lineHeight: 18 },
  msgTextError:{ color: '#DC2626' },
  msgTextInfo: { color: C.accent },

  // Button
  btn:        { backgroundColor: C.accent, borderRadius: 13, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { fontSize: 15, fontWeight: '800', color: '#FFF' },
});

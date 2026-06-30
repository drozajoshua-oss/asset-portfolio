import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';
import { supabase } from '../services/supabase';
import IconBackdrop from '../components/IconBackdrop';

const MIN_PASSWORD = 6;

export default function AuthScreen() {
  const [screen, setScreen] = useState('auth');   // 'auth' | 'reset'
  const [mode, setMode] = useState('login');       // 'login' | 'signup'
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'verify'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  function clearMessage() { setMessage({ text: '', isError: false }); }
  function err(text) { setMessage({ text, isError: true }); }
  function info(text) { setMessage({ text, isError: false }); }

  // Turn any auth error into a clean, human message — never surface a raw HTTP response.
  function authErrorMessage(error, fallback) {
    const msg = error && typeof error.message === 'string' ? error.message : '';
    const status = error?.status;
    if (status === 502 || status === 503 || status === 504 || /timed? ?out|gateway|network|failed to fetch/i.test(msg)) {
      return 'The server is taking too long to respond. Please try again in a moment.';
    }
    if (!msg || msg.length > 140 || msg.trim().startsWith('{') || msg.includes('"status"')) {
      return fallback;
    }
    return msg;
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      err('Please enter your email and password.');
      return;
    }
    clearMessage();
    setLoading(true);

    try {
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });

      if (error) {
        err(authErrorMessage(error, mode === 'login'
          ? 'Could not sign in. Check your email and password and try again.'
          : 'Could not create your account. Please try again.'));
      } else if (mode === 'signup') {
        info('Check your email to confirm your account before signing in.');
      }
      // On successful login, AuthContext updates the session and App re-renders automatically.
    } catch (e) {
      err(authErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    clearMessage();
  }

  // ── Password reset (email code) ────────────────────────────
  function openReset() {
    setScreen('reset');
    setResetStep('request');
    setCode('');
    setNewPassword('');
    clearMessage();
  }

  function backToAuth() {
    setScreen('auth');
    setResetStep('request');
    setCode('');
    setNewPassword('');
    clearMessage();
  }

  async function sendResetCode() {
    if (!email.trim()) {
      err('Enter your email address so we can send you a reset code.');
      return;
    }
    clearMessage();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        err(authErrorMessage(error, 'Could not send the code right now. Please try again in a moment.'));
      } else {
        setResetStep('verify');
        info(`If an account exists for ${email.trim()}, a 6-digit code is on its way. Enter it below with your new password.`);
      }
    } catch (e) {
      err(authErrorMessage(e, 'Could not send the code right now. Please try again in a moment.'));
    } finally {
      setLoading(false);
    }
  }

  async function verifyResetCode() {
    if (code.trim().length < 6) {
      err('Enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD) {
      err(`New password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    clearMessage();
    setLoading(true);

    try {
      // 1) Verify the code — this signs the user in via a recovery session.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (verifyError) {
        err('That code is invalid or expired. Request a new one.');
        return;
      }

      // 2) Set the new password on the now-authenticated session.
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        err(authErrorMessage(updateError, 'Could not update your password. Please try again.'));
      } else {
        info('Password updated — you are now signed in.');
        // AuthContext picks up the session and navigates to the app automatically.
      }
    } catch (e) {
      err(authErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const isReset = screen === 'reset';

  return (
    <SafeAreaView style={au.root} edges={['top', 'bottom']}>
      <IconBackdrop />
      <KeyboardAvoidingView
        style={au.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Brand */}
        <View style={au.brand}>
          <View style={au.logoRing}>
            <Ionicons name="diamond-outline" size={32} color={C.accent} />
          </View>
          <Text style={au.appName}>TROVAULT</Text>
          <Text style={au.tagline}>Your collection, secured</Text>
        </View>

        {/* Card */}
        <View style={au.card}>
          {!isReset ? (
            <>
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
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8} activeOpacity={0.7}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot password — login mode only */}
              {mode === 'login' && (
                <TouchableOpacity
                  style={au.forgotWrap}
                  onPress={openReset}
                  disabled={loading}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Text style={au.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {message.text ? (
                <View style={[au.msgBox, message.isError ? au.msgError : au.msgInfo]}>
                  <Text style={[au.msgText, message.isError ? au.msgTextError : au.msgTextInfo]}>
                    {message.text}
                  </Text>
                </View>
              ) : null}

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
            </>
          ) : (
            <>
              {/* Reset header */}
              <View style={au.resetHeader}>
                <TouchableOpacity onPress={backToAuth} hitSlop={10} activeOpacity={0.7} style={au.backBtn}>
                  <Ionicons name="chevron-back" size={20} color={C.textSub} />
                </TouchableOpacity>
                <Text style={au.resetTitle}>Reset password</Text>
                <View style={au.backBtn} />
              </View>

              <Text style={au.resetSub}>
                {resetStep === 'request'
                  ? "Enter your email and we'll send you a 6-digit reset code."
                  : 'Enter the code from your email and choose a new password.'}
              </Text>

              <View style={au.fields}>
                {/* Email — always shown, editable only on request step */}
                <View style={au.fieldWrap}>
                  <Ionicons name="mail-outline" size={16} color={C.textMuted} style={au.fieldIcon} />
                  <TextInput
                    style={au.input}
                    placeholder="Email address"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    editable={resetStep === 'request'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="done"
                  />
                </View>

                {resetStep === 'verify' && (
                  <>
                    <View style={au.fieldWrap}>
                      <Ionicons name="keypad-outline" size={16} color={C.textMuted} style={au.fieldIcon} />
                      <TextInput
                        style={[au.input, au.codeInput]}
                        placeholder="6-digit code"
                        placeholderTextColor={C.textMuted}
                        value={code}
                        onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        returnKeyType="next"
                      />
                    </View>
                    <View style={au.fieldWrap}>
                      <Ionicons name="lock-closed-outline" size={16} color={C.textMuted} style={au.fieldIcon} />
                      <TextInput
                        style={au.input}
                        placeholder="New password"
                        placeholderTextColor={C.textMuted}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={verifyResetCode}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8} activeOpacity={0.7}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {message.text ? (
                <View style={[au.msgBox, message.isError ? au.msgError : au.msgInfo]}>
                  <Text style={[au.msgText, message.isError ? au.msgTextError : au.msgTextInfo]}>
                    {message.text}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[au.btn, loading && au.btnDisabled]}
                onPress={resetStep === 'request' ? sendResetCode : verifyResetCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={au.btnText}>{resetStep === 'request' ? 'Send code' : 'Reset password'}</Text>
                }
              </TouchableOpacity>

              {resetStep === 'verify' && (
                <TouchableOpacity
                  style={au.resendWrap}
                  onPress={sendResetCode}
                  disabled={loading}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Text style={au.resendText}>Resend code</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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
  codeInput: { letterSpacing: 6, fontWeight: '700' },

  // Forgot password
  forgotWrap: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 14 },
  forgotText: { fontSize: 13, fontWeight: '700', color: C.accent },

  // Reset header
  resetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn:    { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  resetTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  resetSub:   { fontSize: 13, lineHeight: 19, color: C.textSub, marginBottom: 20 },
  resendWrap: { alignSelf: 'center', marginTop: 16 },
  resendText: { fontSize: 13, fontWeight: '700', color: C.accent },

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

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Dimensions, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { C, RARITY, CARD_SHADOW } from '../constants/colors';
import { identifyAsset } from '../services/gemini';
import { useCollection } from '../context/CollectionContext';

const { width: W, height: H } = Dimensions.get('window');
// Larger circle so tall items (cards, stamps) clip less at the edges.
const VF = Math.min(W * 0.92, H * 0.50);
const MAX_PHOTOS = 3;

function CoinCircle({ color, symbol, size }) {
  return (
    <View style={[sc.ring1, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '14', borderColor: color + '40',
    }]}>
      <View style={[sc.ring2, {
        width: size * 0.74, height: size * 0.74, borderRadius: size * 0.37,
        backgroundColor: color + '24', borderColor: color + '60',
      }]}>
        <View style={[sc.ring3, {
          width: size * 0.46, height: size * 0.46, borderRadius: size * 0.23,
          backgroundColor: color + '38',
        }]}>
          <Text style={{ fontSize: size * 0.26, color, fontWeight: '800' }}>{symbol}</Text>
        </View>
      </View>
    </View>
  );
}

const CORNER = 22;
function Corner({ pos }) {
  const t = pos[0] === 't', l = pos[1] === 'l';
  return (
    <View style={[sc.corner, {
      top:    t ? 0 : undefined,
      bottom: !t ? 0 : undefined,
      left:   l ? 0 : undefined,
      right:  !l ? 0 : undefined,
      borderTopWidth:    t ? 2.5 : 0,
      borderBottomWidth: !t ? 2.5 : 0,
      borderLeftWidth:   l ? 2.5 : 0,
      borderRightWidth:  !l ? 2.5 : 0,
      borderTopLeftRadius:     (t && l) ? 5 : 0,
      borderTopRightRadius:    (t && !l) ? 5 : 0,
      borderBottomLeftRadius:  (!t && l) ? 5 : 0,
      borderBottomRightRadius: (!t && !l) ? 5 : 0,
    }]} />
  );
}

export default function ScanScreen() {
  const { addCoin } = useCollection();
  // idle | reviewing | scanning | done | error
  const [state, setState] = useState('idle');
  const [photos, setPhotos] = useState([]);       // [{uri, base64}]
  const [pickedImage, setPickedImage] = useState(null); // uri of most recent photo
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [added, setAdded] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (state === 'idle') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1100, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    if (state === 'done') {
      fadeAnim.setValue(0);
      slideAnim.setValue(80);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

  const runAnalysis = async (photoList) => {
    setScanResult(null);
    setErrorMsg('');
    setState('scanning');
    try {
      const result = await identifyAsset(photoList.map(p => p.base64));
      setScanResult(result);
      setState('done');
    } catch (err) {
      setErrorMsg(err.message || 'Could not identify item. Please try again.');
      setState('error');
    }
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to photograph items.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    return result.canceled ? null : result.assets[0];
  };

  // First-photo capture (only from idle). Leads directly to the review screen.
  const handleCamera = async () => {
    if (state !== 'idle') return;
    const asset = await launchCamera();
    if (!asset) return;
    setPhotos([{ uri: asset.uri, base64: asset.base64 }]);
    setPickedImage(asset.uri);
    setState('reviewing');
  };

  // Gallery pick (only from idle). Same destination as handleCamera.
  const handleGallery = async () => {
    if (state !== 'idle') return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
      mediaTypes: ['images'],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhotos([{ uri: asset.uri, base64: asset.base64 }]);
    setPickedImage(asset.uri);
    setState('reviewing');
  };

  // Add another angle from the review screen.
  const handleAddAngle = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const asset = await launchCamera();
    if (!asset) return; // user cancelled — stay on review screen unchanged
    const next = [...photos, { uri: asset.uri, base64: asset.base64 }];
    setPhotos(next);
    setPickedImage(asset.uri);
    // state stays 'reviewing', photo count badge updates automatically
  };

  // Discard the most-recent photo and re-open the camera immediately.
  const handleRetake = async () => {
    const remaining = photos.slice(0, -1);
    const asset = await launchCamera();
    if (!asset) {
      // User cancelled the camera after tapping Retake.
      if (remaining.length === 0) {
        handleReset(); // nothing left — go back to idle
      } else {
        setPhotos(remaining);
        setPickedImage(remaining[remaining.length - 1].uri);
        // stay in reviewing with whatever remains
      }
      return;
    }
    const next = [...remaining, { uri: asset.uri, base64: asset.base64 }];
    setPhotos(next);
    setPickedImage(asset.uri);
    // state stays 'reviewing'
  };

  const handleReset = () => {
    setState('idle');
    setPickedImage(null);
    setPhotos([]);
    setScanResult(null);
    setErrorMsg('');
    setAdded(false);
  };

  const r = scanResult ? (RARITY[scanResult.rarity] ?? RARITY.common) : RARITY.common;

  return (
    <View style={sc.root}>

      {/* ── Dark camera / review area ── */}
      <View style={sc.cameraArea}>
        <View style={sc.camTex} pointerEvents="none">
          {[...Array(8)].map((_, row) =>
            [...Array(6)].map((_, col) => (
              <View key={`${row}-${col}`} style={sc.texCell} />
            ))
          )}
        </View>

        <SafeAreaView edges={['top']} style={sc.header}>
          <Text style={sc.appName}>YOUR ASSET PORTFOLIO</Text>
        </SafeAreaView>

        {/* ── Review image — fills full cameraArea with overlay controls ── */}
        {state === 'reviewing' ? (
          <View style={sc.reviewArea}>
            <Image
              source={{ uri: pickedImage }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            {/* Dark gradient overlay at the bottom with all controls */}
            <View style={sc.reviewOverlay}>
              {/* Badge row + Retake */}
              <View style={sc.reviewTopRow}>
                <View style={sc.reviewBadge}>
                  <Ionicons name="images-outline" size={12} color="#FFF" />
                  <Text style={sc.reviewBadgeText}>{photos.length}/{MAX_PHOTOS} photos</Text>
                </View>
                <TouchableOpacity style={sc.btnRetake} onPress={handleRetake} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={15} color="rgba(255,255,255,0.85)" />
                  <Text style={sc.btnRetakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
              {/* Stacked action buttons */}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={sc.btnAddAngle} onPress={handleAddAngle} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={18} color={C.accent} />
                  <Text style={sc.btnAddAngleText}>Add Another Angle</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={sc.btnIdentifyNow} onPress={() => runAnalysis(photos)} activeOpacity={0.9}>
                <Ionicons name="search-outline" size={18} color="#FFF" />
                <Text style={sc.btnIdentifyNowText}>Identify Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── Circular viewfinder ── */
          <View style={sc.vfOuter}>
            <TouchableOpacity
              onPress={handleCamera}
              disabled={state !== 'idle'}
              activeOpacity={0.85}
            >
              <Animated.View style={[sc.vfCircle, {
                width: VF, height: VF, borderRadius: VF / 2,
                transform: state === 'idle' ? [{ scale: pulseAnim }] : [],
                borderColor: state === 'done'
                  ? C.accent
                  : state === 'error'
                  ? C.danger
                  : 'rgba(92,110,240,0.55)',
              }]}>
                {pickedImage && (
                  <Image
                    source={{ uri: pickedImage }}
                    style={[StyleSheet.absoluteFill, { borderRadius: VF / 2 }]}
                    resizeMode="cover"
                  />
                )}

                <Corner pos="tl" /><Corner pos="tr" />
                <Corner pos="bl" /><Corner pos="br" />

                {state === 'idle' && (
                  <View style={sc.vfCenter}>
                    <Ionicons name="scan-outline" size={48} color="rgba(255,255,255,0.30)" />
                    <Text style={sc.vfHint}>TAP TO SCAN</Text>
                  </View>
                )}
                {state === 'scanning' && (
                  <View style={[sc.vfCenter, sc.vfOverlay]}>
                    <Ionicons name="hourglass-outline" size={48} color={C.accent} />
                    <Text style={sc.vfScanning}>Analyzing…</Text>
                  </View>
                )}
                {state === 'done' && (
                  <View style={[sc.vfCenter, sc.vfOverlay]}>
                    <Ionicons name="checkmark-circle" size={62} color={C.success} />
                    <Text style={[sc.vfDone, { color: C.success }]}>IDENTIFIED</Text>
                  </View>
                )}
                {state === 'error' && (
                  <View style={[sc.vfCenter, sc.vfOverlay]}>
                    <Ionicons name="alert-circle" size={62} color={C.danger} />
                    <Text style={[sc.vfDone, { color: C.danger }]}>SCAN FAILED</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Light control / results area — hidden during reviewing (controls live on image overlay) ── */}
      {state !== 'reviewing' && <View style={sc.bottomArea}>

        {/* Capture controls — idle or scanning */}
        {(state === 'idle' || state === 'scanning') && (
          <View style={sc.captureRow}>
            <TouchableOpacity
              style={sc.sideBtn}
              onPress={handleGallery}
              disabled={state === 'scanning'}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={22} color={C.textSub} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[sc.captureBtn, state === 'scanning' && { opacity: 0.65 }]}
              onPress={handleCamera}
              disabled={state === 'scanning'}
              activeOpacity={0.8}
            >
              <View style={sc.captureBtnFill}>
                <Ionicons
                  name={state === 'scanning' ? 'hourglass-outline' : 'scan'}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={sc.sideBtn}>
              <Ionicons name="help-circle-outline" size={22} color={C.textSub} />
            </TouchableOpacity>
          </View>
        )}

        {/* Error state */}
        {state === 'error' && (
          <View style={sc.errorWrap}>
            <Ionicons name="alert-circle-outline" size={22} color={C.danger} />
            <Text style={sc.errorText} numberOfLines={3}>{errorMsg}</Text>
            <TouchableOpacity style={sc.btnRetryErr} onPress={handleReset} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={C.accent} />
              <Text style={sc.btnRetryErrText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results card */}
        {state === 'done' && scanResult && (
          <Animated.View style={[sc.resultsWrap, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.resultsScroll}>
              <View style={[sc.card, CARD_SHADOW]}>
                <View style={[sc.accentBar, { backgroundColor: r.color }]} />

                <View style={sc.cardBody}>
                  <View style={sc.resHeader}>
                    <CoinCircle
                      color={scanResult.coinColor}
                      symbol={scanResult.symbolChar}
                      size={52}
                    />
                    <View style={sc.resHeaderText}>
                      <Text style={sc.resCoinName}>{scanResult.name}</Text>
                      <Text style={sc.resCoinSub}>{scanResult.country} · {scanResult.year}</Text>
                    </View>
                    <View style={[sc.rarityBadge, { backgroundColor: r.bg }]}>
                      <Text style={[sc.rarityLabel, { color: r.color }]}>{r.label}</Text>
                    </View>
                  </View>

                  <View style={sc.divider} />

                  <View style={sc.detailGrid}>
                    <View style={sc.detailCell}>
                      <Text style={sc.detailLbl}>ESTIMATED VALUE</Text>
                      <Text style={sc.detailValAccent}>
                        ${scanResult.minValue.toLocaleString()} – ${scanResult.maxValue.toLocaleString()}
                      </Text>
                    </View>
                    <View style={sc.detailCell}>
                      <Text style={sc.detailLbl}>GRADE</Text>
                      <Text style={sc.detailVal}>{scanResult.grade}</Text>
                    </View>
                    <View style={sc.detailCell}>
                      <Text style={sc.detailLbl}>CATEGORY</Text>
                      <Text style={sc.detailVal}>{scanResult.category ?? 'Unknown'}</Text>
                    </View>
                    <View style={sc.detailCell}>
                      <Text style={sc.detailLbl}>YEAR</Text>
                      <Text style={sc.detailVal}>{scanResult.year}</Text>
                    </View>
                  </View>

                  <View style={sc.actions}>
                    <TouchableOpacity
                      style={[sc.btnPrimary, added && { opacity: 0.55 }]}
                      activeOpacity={0.85}
                      disabled={added}
                      onPress={() => { addCoin(scanResult); setAdded(true); }}
                    >
                      <Ionicons name={added ? 'checkmark-circle-outline' : 'add-circle-outline'} size={17} color="#FFF" />
                      <Text style={sc.btnPrimaryText}>{added ? 'Added!' : 'Add to Collection'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={sc.btnSecondary}
                      onPress={handleReset}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={17} color={C.accent} />
                      <Text style={sc.btnSecondaryText}>Scan Again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text style={sc.disclaimer}>
                Values are AI-estimated. Always consult a professional appraiser for accurate valuations.
              </Text>
            </ScrollView>
          </Animated.View>
        )}
      </View>}
    </View>
  );
}

const sc = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  cameraArea: {
    flex: 1,
    backgroundColor: '#0A0C18',
    overflow: 'hidden',
  },
  camTex: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  texCell: {
    width: '16.66%',
    height: 60,
    borderWidth: 0.4,
    borderColor: 'rgba(255,255,255,0.03)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 12, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 3, opacity: 0.9,
  },

  // ── Circular viewfinder ──────────────────────────────────────────────────
  vfOuter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vfCircle: {
    borderWidth: 1.5,
    backgroundColor: 'rgba(10,12,24,0.50)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER, height: CORNER,
    borderColor: C.accent,
  },
  vfCenter:   { alignItems: 'center', gap: 8 },
  vfOverlay:  {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,12,24,0.55)',
  },
  vfHint:     { fontSize: 10, color: 'rgba(255,255,255,0.40)', letterSpacing: 2.5, fontWeight: '700' },
  vfScanning: { fontSize: 12, color: C.accent, letterSpacing: 1.5 },
  vfDone:     { fontSize: 11, fontWeight: '800', letterSpacing: 3 },

  // ── Review image area ────────────────────────────────────────────────────
  reviewArea: {
    flex: 1,
    overflow: 'hidden',
  },
  // Frosted-dark gradient band at the bottom of the image
  reviewOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.60)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 10,
  },
  reviewTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 2,
  },
  reviewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(92,110,240,0.30)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(92,110,240,0.55)',
  },
  reviewBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // ── Bottom area ──────────────────────────────────────────────────────────
  bottomArea: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    minHeight: 130,
  },
  captureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 26, gap: 38,
  },
  sideBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: C.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnFill: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  // Overlay review buttons — stacked vertically, full width
  btnRetake: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  btnRetakeText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  btnAddAngle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 12,
    backgroundColor: 'rgba(92,110,240,0.22)',
    borderWidth: 1, borderColor: 'rgba(92,110,240,0.55)',
  },
  btnAddAngleText: { fontSize: 15, fontWeight: '700', color: C.accent },
  btnIdentifyNow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 12,
    backgroundColor: C.accent,
  },
  btnIdentifyNowText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  errorWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 20, gap: 10,
  },
  errorText: {
    fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19,
  },
  btnRetryErr: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.accentLight,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  btnRetryErrText: { fontSize: 13, fontWeight: '700', color: C.accent },

  resultsWrap: { flex: 1 },
  resultsScroll: { padding: 14 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  accentBar: { height: 4 },
  cardBody: { padding: 16 },

  resHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  resHeaderText: { flex: 1 },
  resCoinName: { fontSize: 15, fontWeight: '700', color: C.text, lineHeight: 20 },
  resCoinSub:  { fontSize: 12, color: C.textSub, marginTop: 3 },
  rarityBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  rarityLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },

  divider: { height: 1, backgroundColor: C.border, marginBottom: 16 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 },
  detailCell: { width: '46%' },
  detailLbl: {
    fontSize: 9, color: C.textMuted, letterSpacing: 1.8, fontWeight: '700', marginBottom: 4,
  },
  detailVal:       { fontSize: 14, color: C.text, fontWeight: '600' },
  detailValAccent: { fontSize: 15, color: C.accent, fontWeight: '800', letterSpacing: -0.3 },

  actions: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.accent,
    paddingVertical: 12, borderRadius: 10,
  },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.accentLight,
    paddingVertical: 12, borderRadius: 10,
  },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: C.accent },

  disclaimer: {
    fontSize: 11, color: C.textMuted, textAlign: 'center',
    marginTop: 10, marginBottom: 4, paddingHorizontal: 8, lineHeight: 16,
  },

  ring1: { borderWidth: 2,   alignItems: 'center', justifyContent: 'center' },
  ring2: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ring3: {                   alignItems: 'center', justifyContent: 'center' },
});

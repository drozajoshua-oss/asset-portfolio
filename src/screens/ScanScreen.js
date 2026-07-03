import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Dimensions, Image, Alert, Linking, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { C, RARITY, CARD_SHADOW } from '../constants/colors';
import { identifyAsset } from '../services/gemini';
import { useCollection } from '../context/CollectionContext';
import { usePremium } from '../context/PremiumContext';
import { CATEGORIES } from '../data/items';
import PaywallScreen from './PaywallScreen';

const { width: W, height: H } = Dimensions.get('window');
// Larger circle so tall items (cards, stamps) clip less at the edges.
const VF = Math.min(W * 0.92, H * 0.50);
const MAX_PHOTOS = 5;

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
  const { isPremium, canScan, scansRemaining, recordScan } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);
  // idle | reviewing | scanning | done | error
  const [state, setState] = useState('idle');
  const [photos, setPhotos] = useState([]);       // [{uri, base64}]
  const [pickedImage, setPickedImage] = useState(null); // uri of most recent photo
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [added, setAdded] = useState(false);
  const [category, setCategory] = useState('Other'); // editable category for the result
  const [showCat, setShowCat] = useState(false);
  const [customCat, setCustomCat] = useState('');

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
    recordScan(); // count this identification against the daily free quota
    try {
      const result = await identifyAsset(photoList.map(p => p.base64));
      setScanResult(result);
      setCategory(result.category ?? 'Other');
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
    if (!canScan) { setShowPaywall(true); return; }
    const asset = await launchCamera();
    if (!asset) return;
    setPhotos([{ uri: asset.uri, base64: asset.base64 }]);
    setPickedImage(asset.uri);
    setState('reviewing');
  };

  // Gallery pick (only from idle). Same destination as handleCamera.
  const handleGallery = async () => {
    if (state !== 'idle') return;
    if (!canScan) { setShowPaywall(true); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.7,
      base64: true,
      mediaTypes: ['images'],
    });
    if (result.canceled) return;
    const picked = result.assets.slice(0, MAX_PHOTOS)
      .map(a => ({ uri: a.uri, base64: a.base64 }));
    setPhotos(picked);
    setPickedImage(picked[picked.length - 1].uri);
    setState('reviewing');
  };

  // Append more shots from the gallery while reviewing.
  const addFromGallery = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
      base64: true,
      mediaTypes: ['images'],
    });
    if (result.canceled) return;
    const added = result.assets.slice(0, remaining)
      .map(a => ({ uri: a.uri, base64: a.base64 }));
    const next = [...photos, ...added];
    setPhotos(next);
    setPickedImage(next[next.length - 1].uri);
  };

  // Add another angle from the review screen — camera or gallery.
  const handleAddAngle = () => {
    if (photos.length >= MAX_PHOTOS) return;
    Alert.alert('Add another angle', null, [
      {
        text: 'Take photo',
        onPress: async () => {
          const asset = await launchCamera();
          if (!asset) return; // user cancelled — stay on review screen unchanged
          const next = [...photos, { uri: asset.uri, base64: asset.base64 }];
          setPhotos(next);
          setPickedImage(asset.uri);
        },
      },
      { text: 'Choose from gallery', onPress: addFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  // In the 'done' state, shrink the viewfinder to a compact confirmation badge so
  // the results card below gets the majority of the screen (and can scroll).
  const circleSize = state === 'done' ? Math.min(VF, H * 0.28) : VF;

  // Open the live eBay listings for this item. To monetize later, wrap this URL
  // in an eBay Partner Network (EPN) rover link with your campaign id.
  function openEbay(query) {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  }

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
          <Text style={sc.appName}>TROVAULT</Text>
        </SafeAreaView>

        {/* ── Review image — fills full cameraArea with overlay controls ── */}
        {state === 'reviewing' ? (
          <View style={sc.reviewArea}>
            <Image
              source={{ uri: pickedImage }}
              style={sc.reviewImage}
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
              {/* Accuracy nudge */}
              {photos.length < MAX_PHOTOS && (
                <View style={sc.reviewTip}>
                  <Ionicons name="bulb-outline" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={sc.reviewTipText}>
                    Add more angles — front, back, and any markings or labels — for a more accurate ID.
                  </Text>
                </View>
              )}
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
                width: circleSize, height: circleSize, borderRadius: circleSize / 2,
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
                    style={[StyleSheet.absoluteFill, { borderRadius: circleSize / 2 }]}
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
      {state !== 'reviewing' && <View style={[sc.bottomArea, state === 'done' && sc.bottomAreaDone]}>

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

            <TouchableOpacity
              style={sc.sideBtn}
              onPress={() => Alert.alert(
                'Scanning tips',
                '• Use bright, even lighting\n• Fill the frame with your item\n• Add angles: front, back, and any markings or labels\n• For coins and cards, get close on dates and fine details'
              )}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={22} color={C.textSub} />
            </TouchableOpacity>
          </View>
        )}

        {/* Free-scan meter — idle only */}
        {state === 'idle' && (
          <View style={sc.scanMeter}>
            {isPremium ? (
              <View style={sc.scanMeterRow}>
                <Ionicons name="diamond" size={12} color={C.accent} />
                <Text style={sc.scanMeterPremium}>Premium · Unlimited scans</Text>
              </View>
            ) : scansRemaining > 0 ? (
              <View style={sc.scanMeterRow}>
                <Text style={sc.scanMeterText}>
                  {scansRemaining} free {scansRemaining === 1 ? 'scan' : 'scans'} left
                </Text>
                <TouchableOpacity
                  style={sc.scanMeterBtn}
                  onPress={() => setShowPaywall(true)}
                  activeOpacity={0.8}
                  hitSlop={6}
                >
                  <Text style={sc.scanMeterBtnText}>Go Premium</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowPaywall(true)} activeOpacity={0.7} hitSlop={8}>
                <Text style={sc.scanMeterUpgrade}>You're out of free scans — Go Premium →</Text>
              </TouchableOpacity>
            )}
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
                    <TouchableOpacity style={sc.detailCell} onPress={() => { setCustomCat(''); setShowCat(true); }} activeOpacity={0.7}>
                      <Text style={sc.detailLbl}>CATEGORY</Text>
                      <View style={sc.catRow}>
                        <Text style={sc.detailVal} numberOfLines={1}>{category}</Text>
                        <Ionicons name="create-outline" size={13} color={C.accent} />
                      </View>
                    </TouchableOpacity>
                    <View style={sc.detailCell}>
                      <Text style={sc.detailLbl}>YEAR</Text>
                      <Text style={sc.detailVal}>{scanResult.year}</Text>
                    </View>
                  </View>

                  {scanResult.marketComps?.count >= 3 && (
                    <TouchableOpacity
                      style={sc.compsRow}
                      onPress={() => openEbay(scanResult.name)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="pricetags-outline" size={15} color={C.success} />
                      <View style={{ flex: 1 }}>
                        <Text style={sc.compsTitle}>
                          eBay median ${scanResult.marketComps.median.toLocaleString()}
                        </Text>
                        <Text style={sc.compsMeta}>
                          Typical ${scanResult.marketComps.low.toLocaleString()}–${scanResult.marketComps.high.toLocaleString()} · {scanResult.marketComps.count} live listings
                        </Text>
                      </View>
                      <View style={sc.compsCta}>
                        <Text style={sc.compsCtaText}>View</Text>
                        <Ionicons name="open-outline" size={13} color={C.success} />
                      </View>
                    </TouchableOpacity>
                  )}

                  <View style={sc.actions}>
                    <TouchableOpacity
                      style={[sc.btnPrimary, added && { opacity: 0.55 }]}
                      activeOpacity={0.85}
                      disabled={added}
                      onPress={() => { addCoin({ ...scanResult, category, photos }); setAdded(true); }}
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

      <PaywallScreen visible={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Category picker */}
      <Modal visible={showCat} animationType="fade" transparent onRequestClose={() => setShowCat(false)}>
        <View style={sc.catBackdrop}>
          <View style={sc.catSheet}>
            <Text style={sc.catTitle}>Choose a category</Text>
            <View style={sc.catChips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[sc.catChip, category === cat && sc.catChipActive]}
                  onPress={() => { setCategory(cat); setShowCat(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[sc.catChipText, category === cat && sc.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={sc.catOr}>Or type your own</Text>
            <View style={sc.catInputRow}>
              <TextInput
                style={sc.catInput}
                placeholder="e.g. Vinyl Records"
                placeholderTextColor={C.textMuted}
                value={customCat}
                onChangeText={setCustomCat}
                returnKeyType="done"
                onSubmitEditing={() => { const v = customCat.trim(); if (v) { setCategory(v); setShowCat(false); } }}
              />
              <TouchableOpacity
                style={[sc.catSave, !customCat.trim() && { opacity: 0.5 }]}
                disabled={!customCat.trim()}
                onPress={() => { const v = customCat.trim(); if (v) { setCategory(v); setShowCat(false); } }}
                activeOpacity={0.85}
              >
                <Text style={sc.catSaveText}>Set</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={sc.catCancel} onPress={() => setShowCat(false)} activeOpacity={0.7}>
              <Text style={sc.catCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Big full-width photo at the top of the review area
  reviewImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#05060D',
  },
  // Controls flow directly beneath the photo (no wasted space)
  reviewOverlay: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  reviewTip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 2, marginBottom: 2,
  },
  reviewTipText: { flex: 1, fontSize: 11.5, color: 'rgba(255,255,255,0.85)', lineHeight: 15 },

  // ── Bottom area ──────────────────────────────────────────────────────────
  bottomArea: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    minHeight: 130,
  },
  // Done state: take the remaining screen so the results ScrollView can scroll.
  bottomAreaDone: { flex: 1 },
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

  // Free-scan meter
  scanMeter: { alignItems: 'center', paddingBottom: 18, marginTop: -10 },
  scanMeterRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scanMeterText:    { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  scanMeterPremium: { fontSize: 12, color: C.accent, fontWeight: '700' },
  scanMeterUpgrade: { fontSize: 12.5, color: C.accent, fontWeight: '700' },
  scanMeterBtn: {
    marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, backgroundColor: C.accentSoft ?? '#EEF2FF',
  },
  scanMeterBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },

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

  compsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.successLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  compsTitle: { fontSize: 13, fontWeight: '800', color: '#047857' },
  compsMeta:  { fontSize: 11, color: '#059669', marginTop: 1 },
  compsCta:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compsCtaText: { fontSize: 12, fontWeight: '800', color: C.success },

  // Editable category
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catBackdrop: {
    flex: 1, backgroundColor: 'rgba(10,12,24,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  catSheet: {
    width: '100%', maxWidth: 420, backgroundColor: C.surface,
    borderRadius: 18, padding: 20,
  },
  catTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 14 },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  catChipActive: { backgroundColor: C.accentLight, borderColor: C.accent + '70' },
  catChipText: { fontSize: 12.5, color: C.textSub, fontWeight: '600' },
  catChipTextActive: { color: C.accent, fontWeight: '700' },
  catOr: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  catInputRow: { flexDirection: 'row', gap: 10 },
  catInput: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14, color: C.text,
  },
  catSave: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  catSaveText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  catCancel: { alignSelf: 'center', marginTop: 16, padding: 6 },
  catCancelText: { fontSize: 13, fontWeight: '700', color: C.textMuted },

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

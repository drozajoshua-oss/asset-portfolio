import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';
import IconBackdrop from '../components/IconBackdrop';

const SLIDES = [
  {
    icon: 'diamond-outline',
    title: 'Welcome to Trovault',
    body: 'Finally know what your collection is worth. Coins, cards, watches, art and more — identified, valued, and tracked in one place.',
  },
  {
    icon: 'scan-outline',
    title: 'Scan & Identify',
    body: 'Snap a photo and let us identify your item — then see its real market value, backed by live eBay listings, in seconds.',
  },
  {
    icon: 'albums-outline',
    title: 'Build Your Vault',
    body: 'Every item is saved to your private collection, neatly organized by category and rarity.',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Track Your Worth',
    body: "See your collection's total value and breakdown at a glance, and watch it grow over time.",
  },
];

export default function OnboardingScreen({ onDone }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function onScroll(e) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  function next() {
    if (isLast) {
      onDone?.();
    } else {
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    }
  }

  return (
    <SafeAreaView style={ob.root} edges={['top', 'bottom']}>
      <IconBackdrop />
      {/* Skip */}
      <View style={ob.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={onDone} hitSlop={12} activeOpacity={0.7}>
            <Text style={ob.skip}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={ob.scroll}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[ob.slide, { width }]}>
            <View style={ob.iconRing}>
              <Ionicons name={s.icon} size={64} color={C.accent} />
            </View>
            <Text style={ob.title}>{s.title}</Text>
            <Text style={ob.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={ob.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[ob.dot, i === index && ob.dotActive]} />
        ))}
      </View>

      {/* CTA */}
      <View style={ob.footer}>
        <TouchableOpacity style={ob.btn} onPress={next} activeOpacity={0.85}>
          <Text style={ob.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const ob = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  topBar: {
    height: 24, paddingHorizontal: 24,
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
  },
  skip: { fontSize: 14, fontWeight: '700', color: C.textMuted },

  scroll: { flex: 1 },

  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconRing: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: C.accentLight,
    borderWidth: 1, borderColor: C.accent + '33',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24, fontWeight: '800', color: C.text,
    textAlign: 'center', marginBottom: 14,
  },
  body: {
    fontSize: 15, lineHeight: 23, color: C.textSub,
    textAlign: 'center', maxWidth: 320,
  },

  dots: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginBottom: 24,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.border,
  },
  dotActive: {
    width: 22, backgroundColor: C.accent,
  },

  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  btn: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/colors';

// A faint, on-brand scatter of collectible icons used behind marketing screens
// (auth, onboarding, paywall). Decorative only — never blocks touches.
const ITEMS = [
  { icon: 'diamond-outline',       top: '6%',  left: '10%', size: 60, rot: -12 },
  { icon: 'time-outline',          top: '17%', left: '76%', size: 84, rot: 14 },
  { icon: 'wine-outline',          top: '37%', left: '6%',  size: 72, rot: 8 },
  { icon: 'football-outline',      top: '52%', left: '82%', size: 66, rot: -10 },
  { icon: 'car-sport-outline',     top: '68%', left: '14%', size: 92, rot: 6 },
  { icon: 'book-outline',          top: '80%', left: '72%', size: 60, rot: -8 },
  { icon: 'color-palette-outline', top: '28%', left: '46%', size: 54, rot: 16 },
  { icon: 'ellipse-outline',       top: '90%', left: '38%', size: 46, rot: 0 },
  { icon: 'walk-outline',          top: '10%', left: '48%', size: 50, rot: -6 },
  { icon: 'mail-outline',          top: '60%', left: '48%', size: 44, rot: 10 },
];

export default function IconBackdrop({ tint = C.accent, opacity = 0.06 }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ITEMS.map((it, i) => (
        <Ionicons
          key={i}
          name={it.icon}
          size={it.size}
          color={tint}
          style={{
            position: 'absolute',
            top: it.top,
            left: it.left,
            opacity,
            transform: [{ rotate: `${it.rot}deg` }],
          }}
        />
      ))}
    </View>
  );
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { C, CARD_SHADOW } from '../constants/colors';

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUT = 86;
const R_IN = 56;
const GAP = 3;

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startDeg, endDeg) {
  const s1 = polar(CX, CY, R_OUT, startDeg);
  const e1 = polar(CX, CY, R_OUT, endDeg);
  const s2 = polar(CX, CY, R_IN, endDeg);
  const e2 = polar(CX, CY, R_IN, startDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 ${lg} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
    `L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 ${lg} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({ data, total }) {
  let cursor = 0;
  const segs = data.map((item, i) => {
    const pct = item.value / total;
    const sweep = pct * 360 - GAP;
    const start = cursor + GAP / 2;
    const end = start + sweep;
    cursor += pct * 360;
    return { ...item, path: arcPath(start, end), color: C.chart[i % C.chart.length], pct: Math.round(pct * 100) };
  });

  return (
    <View style={s.wrap}>
      {/* Chart */}
      <View style={s.chartWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {segs.map((seg, i) => <Path key={i} d={seg.path} fill={seg.color} />)}
          <Circle cx={CX} cy={CY} r={R_IN - 2} fill={C.surface} />
        </Svg>
        <View style={s.centerOverlay} pointerEvents="none">
          <Text style={s.centerNum}>{data.length}</Text>
          <Text style={s.centerLbl}>ORIGINS</Text>
        </View>
      </View>

      {/* Legend — 2 columns */}
      <View style={s.legend}>
        {segs.map((seg, i) => (
          <View key={i} style={s.legendRow}>
            <View style={[s.dot, { backgroundColor: seg.color }]} />
            <Text style={s.legendName} numberOfLines={1}>{seg.label}</Text>
            <Text style={s.legendPct}>{seg.pct}%</Text>
            <Text style={s.legendVal}>${seg.value.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },

  chartWrap: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  centerOverlay: { position: 'absolute', alignItems: 'center' },
  centerNum: {
    fontSize: 30, fontWeight: '800', color: C.accent, letterSpacing: -1,
  },
  centerLbl: {
    fontSize: 9, color: C.textMuted, letterSpacing: 2, marginTop: 2, fontWeight: '600',
  },

  legend: { width: '100%', marginTop: 18 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendName: { flex: 1, fontSize: 13, color: C.textSub },
  legendPct: { fontSize: 12, color: C.textMuted, minWidth: 36, textAlign: 'right', marginRight: 12 },
  legendVal: { fontSize: 13, fontWeight: '700', color: C.text, minWidth: 64, textAlign: 'right' },
});

// components/CrashReplayChart.js
// Shows a spike chart of the last 10 seconds of G-force data
// Like a flight black box — shows exact moment of impact

import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polyline, Line, Text as SvgText, Circle, Rect } from "react-native-svg";

const { width } = Dimensions.get("window");
const CHART_W = width - 60;
const CHART_H = 80;
const MAX_G   = 8; // max G-force on chart

export default function CrashReplayChart({ data, severity, peakG }) {
  if (!data || data.length < 2) return null;

  const sevColor = {
    severe:   "#ef4444",
    moderate: "#f97316",
    minor:    "#f59e0b",
  }[severity] || "#ef4444";

  // Convert G-force data to SVG points
  const points = data.map((g, i) => {
    const x = (i / (data.length - 1)) * CHART_W;
    const y = CHART_H - (Math.min(g, MAX_G) / MAX_G) * CHART_H;
    return `${x},${y}`;
  }).join(" ");

  // Find peak index
  const peakIdx  = data.indexOf(Math.max(...data));
  const peakX    = (peakIdx / (data.length - 1)) * CHART_W;
  const peakY    = CHART_H - (Math.min(data[peakIdx], MAX_G) / MAX_G) * CHART_H;

  // Threshold line Y position
  const threshY  = CHART_H - (2.5 / MAX_G) * CHART_H;

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>📊 Crash replay</Text>
        <View style={[s.peakBadge, { backgroundColor: sevColor + "20", borderColor: sevColor + "50" }]}>
          <Text style={[s.peakText, { color: sevColor }]}>
            Peak: {typeof peakG === "number" ? peakG.toFixed(1) : peakG}G
          </Text>
        </View>
      </View>

      <View style={s.chartWrap}>
        <Svg width={CHART_W} height={CHART_H + 4}>
          {/* Background grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <Line
              key={pct}
              x1={0} y1={(pct / 100) * CHART_H}
              x2={CHART_W} y2={(pct / 100) * CHART_H}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            />
          ))}

          {/* Threshold line at 2.5G */}
          <Line
            x1={0} y1={threshY}
            x2={CHART_W} y2={threshY}
            stroke="rgba(245,158,11,0.4)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* G-force line */}
          <Polyline
            points={points}
            fill="none"
            stroke={sevColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Peak marker */}
          <Circle
            cx={peakX} cy={peakY}
            r={4}
            fill={sevColor}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={1.5}
          />

          {/* Peak label */}
          <SvgText
            x={Math.min(peakX + 6, CHART_W - 30)}
            y={Math.max(peakY - 6, 10)}
            fontSize={9}
            fill={sevColor}
            fontWeight="700"
          >
            {typeof peakG === "number" ? peakG.toFixed(1) : peakG}G
          </SvgText>
        </Svg>

        {/* Time labels */}
        <View style={s.timeRow}>
          <Text style={s.timeLabel}>-10s</Text>
          <Text style={s.timeLabel}>-5s</Text>
          <Text style={s.timeLabelRed}>Impact</Text>
        </View>
      </View>

      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: sevColor }]} />
          <Text style={s.legendText}>G-force</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDash, { backgroundColor: "#f59e0b" }]} />
          <Text style={s.legendText}>2.5G trigger</Text>
        </View>
        <Text style={s.legendRight}>10s window</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:       { backgroundColor: "#0a0a14", borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 0.5, borderColor: "#1e1e2e" },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title:      { fontSize: 12, fontWeight: "600", color: "#888" },
  peakBadge:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  peakText:   { fontSize: 11, fontWeight: "700" },
  chartWrap:  { marginBottom: 4 },
  timeRow:    { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  timeLabel:  { fontSize: 9, color: "#444" },
  timeLabelRed:{ fontSize: 9, color: "#ef4444", fontWeight: "600" },
  legend:     { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendDash: { width: 12, height: 2, borderRadius: 1 },
  legendText: { fontSize: 10, color: "#555" },
  legendRight:{ marginLeft: "auto", fontSize: 10, color: "#333" },
});
// screens/AlertSentScreen.js — NO EMOJIS, themed, with ETA + crash replay

import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function AlertSentScreen({ navigation, route }) {
  const { theme: t } = useTheme();
  const { alertId, severity, location, audioUrl, replayData, peakG } = route.params || {};

  const [status,        setStatus]        = useState("active");
  const [responder,     setResponder]     = useState(null);
  const [eta,           setEta]           = useState(null);
  const [etaSeconds,    setEtaSeconds]    = useState(null);
  const [consciousness, setConsciousness] = useState(null);

  const sevColor = {
    severe:   "#ef4444",
    moderate: "#f97316",
    minor:    "#f59e0b",
  }[severity] || "#ef4444";

  useEffect(() => {
    if (!alertId) return;
    const unsub = onSnapshot(doc(db, "alerts", alertId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setStatus(data.status);
      setConsciousness(data.consciousnessCheck);
      if (data.responderName) setResponder(data.responderName);
      if (data.etaMinutes)    setEta(data.etaMinutes);
    });
    return () => unsub();
  }, [alertId]);

  useEffect(() => {
    if (!eta) return;
    setEtaSeconds(eta * 60);
    const interval = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [eta]);

  const formatEta = (secs) => {
    if (!secs) return null;
    if (secs < 60) return `${secs}s`;
    return `${Math.ceil(secs / 60)}m`;
  };

  const statusConfig = {
    active:     { icon: "time-outline",         lib: "I",  text: "Finding nearest responder...", color: "#f59e0b" },
    accepted:   { icon: "checkmark-circle",      lib: "I",  text: "Responder accepted",           color: "#22c55e" },
    "en-route": { icon: "car-outline",           lib: "I",  text: "Responder is on the way",      color: "#6366f1" },
    arrived:    { icon: "medical",               lib: "I",  text: "Responder has arrived",         color: "#22c55e" },
    resolved:   { icon: "checkmark-done-circle", lib: "I",  text: "Case resolved",                color: "#555"   },
  }[status] || { icon: "time-outline", lib: "I", text: "Processing...", color: "#f59e0b" };

  return (
    <View style={[s.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View style={[s.headerIcon, { backgroundColor: sevColor + "20" }]}>
            <MaterialCommunityIcons name="alarm-light" size={36} color={sevColor} />
          </View>
          <Text style={[s.headerTitle, { color: t.text }]}>Alert Sent</Text>
          <Text style={[s.headerSub, { color: t.textMuted }]}>Emergency services notified</Text>
          <View style={[s.sevBadge, { borderColor: sevColor }]}>
            <Text style={[s.sevText, { color: sevColor }]}>
              {severity?.toUpperCase()} IMPACT
            </Text>
          </View>
        </View>

        {/* ETA card */}
        {etaSeconds !== null && status === "en-route" && (
          <View style={[s.etaCard, { backgroundColor: t.indigoBg, borderColor: t.indigo + "30" }]}>
            <Text style={[s.etaLabel, { color: t.indigo }]}>ESTIMATED ARRIVAL</Text>
            <Text style={[s.etaNum, { color: t.text }]}>{formatEta(etaSeconds)}</Text>
            <Text style={[s.etaSub, { color: t.textMuted }]}>
              {responder} is on the way
            </Text>
            <View style={[s.etaBarBg, { backgroundColor: t.border }]}>
              <View style={[s.etaBarFill, {
                width: eta ? `${Math.max(5, (etaSeconds / (eta * 60)) * 100)}%` : "50%",
                backgroundColor: t.indigo,
              }]} />
            </View>
          </View>
        )}

        {/* Status card */}
        <View style={[s.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[s.cardLabel, { color: t.textDim }]}>RESPONSE STATUS</Text>
          <View style={s.statusRow}>
            <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
            <Text style={[s.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
          {responder && status !== "active" && (
            <Text style={[s.responderName, { color: t.indigo }]}>
              Assigned: {responder}
            </Text>
          )}
        </View>

        {/* Consciousness */}
        {consciousness && (
          <View style={[s.card, {
            backgroundColor: consciousness === "conscious" ? t.greenBg : t.accentSub,
            borderColor: consciousness === "conscious" ? t.green + "30" : t.accent + "30",
          }]}>
            <Text style={[s.cardLabel, { color: t.textDim }]}>CONSCIOUSNESS CHECK</Text>
            <View style={s.statusRow}>
              <Ionicons
                name={consciousness === "conscious" ? "happy-outline" : "alert-circle-outline"}
                size={20}
                color={consciousness === "conscious" ? t.green : t.accent}
              />
              <Text style={[s.consciousText, {
                color: consciousness === "conscious" ? t.green : t.accent,
              }]}>
                {consciousness === "conscious"
                  ? "Victim confirmed conscious"
                  : consciousness === "unconscious"
                  ? "Victim unconscious — responder alerted"
                  : "No response — possible unconsciousness"}
              </Text>
            </View>
          </View>
        )}

        {/* Alerts dispatched */}
        <View style={[s.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[s.cardLabel, { color: t.textDim }]}>ALERTS DISPATCHED</Text>
          {[
            { icon: "location-outline",    text: "GPS location shared with responders" },
            { icon: "car-outline",         text: "Nearest responder automatically assigned" },
            { icon: "chatbubble-outline",  text: "Family member SMS with live location" },
            audioUrl && { icon: "mic-outline", text: "10s crash scene audio sent to responder" },
          ].filter(Boolean).map((item, i) => (
            <View key={i} style={s.dispatchRow}>
              <Ionicons name={item.icon} size={16} color={t.textMuted} />
              <Text style={[s.dispatchText, { color: t.textSub }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Crash replay */}
        {replayData && replayData.length > 0 && (
          <View style={[s.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[s.cardLabel, { color: t.textDim }]}>CRASH REPLAY — BLACK BOX</Text>
            <View style={s.replayChart}>
              {replayData.slice(-60).map((g, i) => {
                const barH = Math.min((g / 8) * 40, 40);
                const col  = g > 4 ? "#ef4444" : g > 2.5 ? "#f97316" : "#22c55e";
                return (
                  <View key={i} style={[s.replayBar, { height: barH, backgroundColor: col }]} />
                );
              })}
            </View>
            <View style={s.replayFooter}>
              <Text style={[s.replayTime, { color: t.textDim }]}>-10s</Text>
              <Text style={[s.replayPeak, { color: "#ef4444" }]}>
                Peak: {peakG ? parseFloat(peakG).toFixed(1) : "?"}G
              </Text>
              <Text style={[s.replayTime, { color: t.textDim }]}>Impact</Text>
            </View>
          </View>
        )}

        <Text style={[s.instructions, { color: t.textDim }]}>
          Stay calm and keep your phone with you.{"\n"}
          Responders can see your exact location.
        </Text>

        <TouchableOpacity
          style={[s.homeBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
          onPress={() => navigation.replace("UserHome")}
        >
          <Text style={[s.homeBtnText, { color: t.textMuted }]}>Back to home</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1 },
  scroll:        { paddingHorizontal: 18, paddingTop: 60 },
  header:        { alignItems: "center", marginBottom: 20 },
  headerIcon:    { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  headerTitle:   { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: 6 },
  headerSub:     { fontSize: 13, marginBottom: 14 },
  sevBadge:      { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  sevText:       { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  etaCard:       { borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, alignItems: "center" },
  etaLabel:      { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  etaNum:        { fontSize: 52, fontWeight: "700", letterSpacing: -2 },
  etaSub:        { fontSize: 12, marginTop: 4, marginBottom: 12, textAlign: "center" },
  etaBarBg:      { width: "100%", height: 4, borderRadius: 2, overflow: "hidden" },
  etaBarFill:    { height: "100%", borderRadius: 2 },
  card:          { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 0.5 },
  cardLabel:     { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  statusRow:     { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText:    { fontSize: 16, fontWeight: "600", flex: 1 },
  responderName: { fontSize: 12, marginTop: 10 },
  consciousText: { fontSize: 14, fontWeight: "500", flex: 1, lineHeight: 22 },
  dispatchRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  dispatchText:  { fontSize: 13, lineHeight: 20, flex: 1 },
  replayChart:   { flexDirection: "row", alignItems: "flex-end", height: 44, gap: 1, marginBottom: 6 },
  replayBar:     { flex: 1, borderRadius: 1, minHeight: 2 },
  replayFooter:  { flexDirection: "row", justifyContent: "space-between" },
  replayTime:    { fontSize: 10 },
  replayPeak:    { fontSize: 10, fontWeight: "700" },
  instructions:  { fontSize: 13, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  homeBtn:       { borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 0.5, marginBottom: 10 },
  homeBtnText:   { fontSize: 14, fontWeight: "500" },
});
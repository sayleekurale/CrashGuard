// screens/ConsciousnessScreen.js
// Feature 2: After alert fires, ask victim if they're conscious
// If no response in 60s → auto-upgrade to SEVERE, notify responder

import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Vibration,
} from "react-native";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

const CHECK_SECONDS = 60;

export default function ConsciousnessScreen({ navigation, route }) {
  const { alertId, severity, location } = route.params;
  const [secs,      setSecs]      = useState(CHECK_SECONDS);
  const [answered,  setAnswered]  = useState(false);
  const [answer,    setAnswer]    = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Gentle vibration to get attention
    Vibration.vibrate([0, 200, 100, 200]);
    return () => Vibration.cancel();
  }, []);

  // 60-second countdown
  useEffect(() => {
    if (answered) return;
    const interval = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNoResponse(); // auto-timeout = unconscious
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [answered]);

  // User tapped YES — conscious
  const handleYes = async () => {
    setAnswered(true);
    setAnswer("yes");
    Vibration.cancel();
    try {
      await updateDoc(doc(db, "alerts", alertId), {
        consciousnessCheck: "conscious",
        checkedAt: new Date().toISOString(),
      });
    } catch (e) {}
    // Go to AlertSent screen
    setTimeout(() => {
      navigation.replace("AlertSent", { alertId, severity, location });
    }, 1500);
  };

  // User tapped NO or didn't respond — upgrade severity
  const handleNo = async () => {
    setAnswered(true);
    setAnswer("no");
    Vibration.cancel();
    try {
      // Upgrade severity to severe + mark unconscious
      await updateDoc(doc(db, "alerts", alertId), {
        consciousnessCheck: "unconscious",
        severity:           "severe", // auto-upgrade
        checkedAt:          new Date().toISOString(),
        note:               "Victim may be unconscious — upgrade to SEVERE",
      });
    } catch (e) {}
    setTimeout(() => {
      navigation.replace("AlertSent", { alertId, severity: "severe", location });
    }, 1500);
  };

  // No response in 60 seconds
  const handleNoResponse = async () => {
    if (answered) return;
    setAnswered(true);
    setAnswer("timeout");
    try {
      await updateDoc(doc(db, "alerts", alertId), {
        consciousnessCheck: "no_response",
        severity:           "severe",
        checkedAt:          new Date().toISOString(),
        note:               "No response to consciousness check — possible unconsciousness",
      });
    } catch (e) {}
    setTimeout(() => {
      navigation.replace("AlertSent", { alertId, severity: "severe", location });
    }, 1500);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Alert sent confirmation */}
      <View style={s.topBadge}>
        <Text style={s.topBadgeText}>🚨 Alert sent — responders notified</Text>
      </View>

      {/* Main question */}
      <Animated.View style={[s.questionWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={s.questionIcon}>🧠</Text>
      </Animated.View>

      <Text style={s.question}>Are you conscious?</Text>
      <Text style={s.questionSub}>
        Tap YES or NO to help responders{"\n"}prepare before they arrive
      </Text>

      {/* Timer */}
      {!answered && (
        <View style={s.timerWrap}>
          <Text style={s.timerNum}>{secs}</Text>
          <Text style={s.timerLabel}>seconds to respond</Text>
          <Text style={s.timerNote}>No response = auto-upgrade to SEVERE</Text>
        </View>
      )}

      {/* Answer result */}
      {answered && (
        <View style={[s.resultWrap, {
          backgroundColor:
            answer === "yes" ? "rgba(34,197,94,0.1)" :
            "rgba(239,68,68,0.1)"
        }]}>
          <Text style={s.resultText}>
            {answer === "yes"
              ? "✅ Responders know you're conscious"
              : answer === "no"
              ? "🚨 Alert upgraded to SEVERE — help is coming"
              : "⏱ No response — alert upgraded to SEVERE"}
          </Text>
        </View>
      )}

      {/* YES / NO buttons */}
      {!answered && (
        <View style={s.btnRow}>
          <TouchableOpacity style={s.noBtn} onPress={handleNo} activeOpacity={0.85}>
            <Text style={s.noBtnText}>NO</Text>
            <Text style={s.noBtnSub}>I need urgent help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.yesBtn} onPress={handleYes} activeOpacity={0.85}>
            <Text style={s.yesBtnText}>YES</Text>
            <Text style={s.yesBtnSub}>I'm conscious</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.bottomNote}>
        This information is sent to your responder{"\n"}to help them prepare the right response
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#080810", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  topBadge:      { position: "absolute", top: 60, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(34,197,94,0.2)" },
  topBadgeText:  { fontSize: 12, color: "#22c55e", fontWeight: "600" },
  questionWrap:  { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(99,102,241,0.1)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  questionIcon:  { fontSize: 44 },
  question:      { fontSize: 28, fontWeight: "700", color: "#f0f0ff", textAlign: "center", letterSpacing: -0.5, marginBottom: 10 },
  questionSub:   { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  timerWrap:     { alignItems: "center", marginBottom: 32 },
  timerNum:      { fontSize: 48, fontWeight: "700", color: "#f0f0ff", letterSpacing: -1 },
  timerLabel:    { fontSize: 12, color: "#555", marginTop: 2 },
  timerNote:     { fontSize: 11, color: "#ef4444", marginTop: 6, opacity: 0.7 },
  resultWrap:    { borderRadius: 14, padding: 16, marginBottom: 32, width: "100%", alignItems: "center" },
  resultText:    { fontSize: 14, color: "#f0f0ff", textAlign: "center", lineHeight: 22 },
  btnRow:        { flexDirection: "row", gap: 14, width: "100%", marginBottom: 24 },
  noBtn:         { flex: 1, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 18, paddingVertical: 22, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(239,68,68,0.4)" },
  noBtnText:     { fontSize: 22, fontWeight: "700", color: "#ef4444", letterSpacing: 1 },
  noBtnSub:      { fontSize: 11, color: "#ef4444", opacity: 0.6, marginTop: 4 },
  yesBtn:        { flex: 1, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 18, paddingVertical: 22, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(34,197,94,0.4)" },
  yesBtnText:    { fontSize: 22, fontWeight: "700", color: "#22c55e", letterSpacing: 1 },
  yesBtnSub:     { fontSize: 11, color: "#22c55e", opacity: 0.6, marginTop: 4 },
  bottomNote:    { fontSize: 12, color: "#333", textAlign: "center", lineHeight: 20 },
});
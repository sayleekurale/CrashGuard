// screens/CountdownScreen.js — FINAL CORRECT VERSION

import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Vibration, StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics  from "expo-haptics";
import * as Location from "expo-location";
import { sendCrashAlert }       from "../services/alertService";
import {
  startVoiceSnapshot,
  stopAndUploadSnapshot,
  cancelVoiceSnapshot,
} from "../services/VoiceSnapshotService";
import { getBuffer, clearBuffer } from "../services/CrashDataBuffer";
import { doc, updateDoc }       from "firebase/firestore";
import { db }                   from "../config/firebaseConfig";
import { useTheme }             from "../context/ThemeContext";

const SECONDS        = 30;
const RECORDING_SECS = 10;

export default function CountdownScreen({ navigation, route }) {
  const { theme: t } = useTheme();
  const { crashData } = route.params || {
    crashData: { gForce: "3.0", severity: "minor" },
  };

  const [secs,      setSecs]      = useState(SECONDS);
  const [sent,      setSent]      = useState(false);
  const [sending,   setSending]   = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorded,  setRecorded]  = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const ringOpacity  = useRef(new Animated.Value(0.3)).current;
  const sentRef      = useRef(false);
  const recordingRef = useRef(false);
  const recTimerRef  = useRef(null);

  const sevColor = {
    severe:   "#ef4444",
    moderate: "#f97316",
    minor:    "#f59e0b",
  }[crashData.severity] || "#ef4444";

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim,  { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim,  { toValue: 1.0,  duration: 700, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringOpacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    startVoiceSnapshot().then((started) => {
      if (started) {
        recordingRef.current = true;
        setRecording(true);
        recTimerRef.current = setTimeout(() => {
          if (recordingRef.current) {
            recordingRef.current = false;
            setRecording(false);
            setRecorded(true);
          }
        }, RECORDING_SECS * 1000);
      }
    });
    return () => {
      Vibration.cancel();
      if (recTimerRef.current) clearTimeout(recTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (sent) return;
    const interval = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) { clearInterval(interval); fireAlert(); return 0; }
        if (prev === 10) Vibration.vibrate(300);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sent]);

  const fireAlert = async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSending(true);
    if (recordingRef.current) {
      recordingRef.current = false;
      setRecording(false);
      if (recTimerRef.current) clearTimeout(recTimerRef.current);
    }
    const replayData = getBuffer();
    const peakG = replayData.length > 0 ? Math.max(...replayData) : parseFloat(crashData.gForce) || 3;
    clearBuffer();
    setStatusMsg("Getting your location...");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let loc = { lat: 18.5204, lng: 73.8567 };
      if (status === "granted") {
        setStatusMsg("Locating...");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      setStatusMsg("Sending alert...");
      const alertId = await sendCrashAlert({
        location: loc, severity: crashData.severity, gForce: crashData.gForce,
      });
      if (replayData.length > 0) {
        await updateDoc(doc(db, "alerts", alertId), { replayData, peakG });
      }
      setStatusMsg("Uploading scene audio...");
      const audioUrl = await stopAndUploadSnapshot(alertId);
      if (audioUrl) {
        await updateDoc(doc(db, "alerts", alertId), { audioUrl, hasAudio: true });
      }
      Vibration.cancel();
      setSent(true);
      setSending(false);
      navigation.replace("ConsciousnessCheck", {
        alertId, severity: crashData.severity, location: loc, audioUrl, replayData, peakG,
      });
    } catch (err) {
      console.log("Alert error:", err.message);
      setStatusMsg("Retrying...");
      sentRef.current = false;
      setSending(false);
    }
  };

  const cancel = async () => {
    Vibration.cancel();
    setSent(true);
    recordingRef.current = false;
    if (recTimerRef.current) clearTimeout(recTimerRef.current);
    await cancelVoiceSnapshot();
    clearBuffer();
    navigation.replace("UserHome", { restart: true });
  };

  const progressPct = ((SECONDS - secs) / SECONDS) * 100;

  return (
    <View style={[s.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />

      {/* Top severity bar */}
      <View style={[s.topBar, {
        backgroundColor: sevColor + "15",
        borderBottomColor: sevColor + "30",
      }]}>
        <View style={[s.sevDot, { backgroundColor: sevColor }]} />
        <Text style={[s.sevText, { color: sevColor }]}>
          {(crashData.severity || "UNKNOWN").toUpperCase()} CRASH DETECTED
        </Text>
        {crashData.gForce !== "manual" && (
          <Text style={[s.gText, { color: sevColor + "99" }]}>
            {crashData.gForce}G
          </Text>
        )}
      </View>

      <View style={s.body}>

        {/* Icon + ring */}
        <View style={s.ringWrap}>
          <Animated.View style={[s.outerRing, { borderColor: sevColor, opacity: ringOpacity }]} />
          <View style={[s.innerRing, { borderColor: sevColor + "60" }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialCommunityIcons name="car-emergency" size={48} color={sevColor} />
            </Animated.View>
          </View>
        </View>

        {/* Countdown */}
        <Text style={[s.countNum, { color: t.text }]}>{secs}</Text>
        <Text style={[s.countLabel, { color: t.textMuted }]}>
          {sending ? statusMsg : "seconds to alert"}
        </Text>

        {/* Progress bar */}
        <View style={[s.progressBg, { backgroundColor: t.border }]}>
          <View style={[s.progressFill, { width: `${progressPct}%`, backgroundColor: sevColor }]} />
        </View>

        {/* Recording status */}
        {recording && (
          <View style={[s.statusRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <View style={s.recDot} />
            <Ionicons name="mic" size={14} color="#ef4444" />
            <Text style={[s.statusText, { color: "#ef4444" }]}>
              Recording scene audio ({RECORDING_SECS}s)
            </Text>
          </View>
        )}
        {recorded && !recording && (
          <View style={[s.statusRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Ionicons name="mic" size={14} color={t.green} />
            <Text style={[s.statusText, { color: t.green }]}>Scene audio captured</Text>
            <Ionicons name="checkmark-circle" size={14} color={t.green} />
          </View>
        )}

        {/* Info card */}
        {!sent && !sending && (
          <View style={[s.infoCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[s.infoTitle, { color: t.textDim }]}>WHEN TIMER ENDS</Text>
            {[
              { icon: "car-emergency",  text: "Nearest responder dispatched" },
              { icon: "message-text",   text: "Family SMS with live location" },
              { icon: "waveform",       text: "Scene audio sent to responder" },
              { icon: "chart-timeline", text: "Crash black box data recorded" },
            ].map((item, i) => (
              <View key={i} style={s.infoRow}>
                <MaterialCommunityIcons name={item.icon} size={15} color={t.textMuted} />
                <Text style={[s.infoText, { color: t.textSub }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cancel button */}
        {!sent && (
          <TouchableOpacity
            style={[s.cancelBtn, { borderColor: t.green, backgroundColor: t.greenBg }]}
            onPress={cancel}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={20} color={t.green} />
            <View>
              <Text style={[s.cancelText, { color: t.green }]}>I'M OKAY — CANCEL</Text>
              <Text style={[s.cancelSub, { color: t.textMuted }]}>Tap to stop the alert</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  topBar:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 0.5 },
  sevDot:      { width: 8, height: 8, borderRadius: 4 },
  sevText:     { fontSize: 12, fontWeight: "700", letterSpacing: 1, flex: 1 },
  gText:       { fontSize: 12, fontWeight: "600" },
  body:        { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  ringWrap:    { width: 200, height: 200, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  outerRing:   { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 1.5 },
  innerRing:   { width: 150, height: 150, borderRadius: 75, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  countNum:    { fontSize: 72, fontWeight: "700", letterSpacing: -2, lineHeight: 80 },
  countLabel:  { fontSize: 13, marginTop: 4, marginBottom: 16, textAlign: "center" },
  progressBg:  { width: "100%", height: 3, borderRadius: 2, marginBottom: 16, overflow: "hidden" },
  progressFill:{ height: "100%", borderRadius: 2 },
  statusRow:   { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, borderWidth: 0.5 },
  recDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  statusText:  { fontSize: 12, fontWeight: "500" },
  infoCard:    { width: "100%", borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 0.5 },
  infoTitle:   { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10 },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  infoText:    { fontSize: 13, lineHeight: 20 },
  cancelBtn:   { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 18, paddingVertical: 18, borderWidth: 2 },
  cancelText:  { fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  cancelSub:   { fontSize: 11, marginTop: 2 },
});
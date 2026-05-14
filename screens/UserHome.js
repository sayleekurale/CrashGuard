// screens/UserHome.js — WITH BACKGROUND DETECTION
// Replaces direct Accelerometer calls with BackgroundDetection service

import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Animated, Image, Dimensions, Platform, Vibration, AppState,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Accelerometer } from "expo-sensors";
import { addReading } from "../services/CrashDataBuffer";
import {
  startBackgroundDetection,
  stopBackgroundDetection,
  restartBackgroundDetection,
  isDetectionRunning,
} from "../services/BackgroundDetection";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const CITY_IMAGE = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80";

export default function UserHome({ navigation, route }) {
  const { theme: t } = useTheme();
  const [monitoring,  setMonitoring]  = useState(false);
  const [gForce,      setGForce]      = useState(0);
  const [userName,    setUserName]    = useState("");
  const [alertCount,  setAlertCount]  = useState(0);
  const [activeTab,   setActiveTab]   = useState("home");
  const [appState,    setAppState]    = useState(AppState.currentState);

  // Live G-force display (foreground only)
  const gSubRef    = useRef(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseLoop  = useRef(null);
  const gBarAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUser();
    handleStartMonitoring();

    // Listen for app state changes (foreground ↔ background)
    const sub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      sub.remove();
      stopAllMonitoring();
    };
  }, []);

  useEffect(() => {
    if (route.params?.restart) {
      restartBackgroundDetection(handleCrashDetected);
      setTimeout(() => startLiveGForce(), 2000);
    }
  }, [route.params?.restart]);

  // ── App state change handler ────────────────────────────
  // When app goes to background — stop live G-force display
  // Background detection service keeps running via notification
  const handleAppStateChange = (nextState) => {
    setAppState(nextState);
    if (nextState === "background" || nextState === "inactive") {
      stopLiveGForce(); // stop updating UI (saves battery)
      // BackgroundDetection keeps the accelerometer running
    } else if (nextState === "active") {
      startLiveGForce(); // resume UI updates when app comes back
    }
  };

  const loadUser = async () => {
    try {
      const uid  = auth.currentUser?.uid;
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserName(d.name?.split(" ")[0] || "");
        const q     = query(collection(db, "alerts"), where("userId","==",uid));
        const aSnap = await getDocs(q);
        setAlertCount(aSnap.size);
      }
    } catch (e) {}
  };

  // ── Crash detected callback ─────────────────────────────
  const handleCrashDetected = (crashData) => {
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    navigation.navigate("Countdown", { crashData });
  };

  // ── Start full monitoring ───────────────────────────────
  const handleStartMonitoring = async () => {
    await startBackgroundDetection(handleCrashDetected);
    startLiveGForce();
    setMonitoring(true);
    startPulse();
  };

  // ── Stop full monitoring ────────────────────────────────
  const stopAllMonitoring = async () => {
    stopLiveGForce();
    await stopBackgroundDetection();
    stopPulse();
    setMonitoring(false);
    setGForce(0);
  };

  // ── Live G-force display (UI only) ─────────────────────
  // Separate from detection — just for showing the number on screen
  const startLiveGForce = () => {
    if (gSubRef.current) return;
    Accelerometer.setUpdateInterval(100);
    gSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const g = parseFloat(Math.sqrt(x*x+y*y+z*z).toFixed(2));
      setGForce(g);
      Animated.timing(gBarAnim, {
        toValue: Math.min(g / 8, 1), duration: 80, useNativeDriver: false,
      }).start();
    });
  };

  const stopLiveGForce = () => {
    gSubRef.current?.remove();
    gSubRef.current = null;
  };

  // ── Pulse animation ─────────────────────────────────────
  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.7, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };
  const stopPulse = () => { pulseLoop.current?.stop(); pulseAnim.setValue(1); };

  const manualSOS = async () => {
    Vibration.vibrate([0, 300, 100, 300, 100, 300, 100, 500]);
    await stopAllMonitoring();
    navigation.navigate("Countdown", {
      crashData: { gForce: "manual", severity: "severe" },
    });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const gColor = gForce > 4 ? "#ef4444" : gForce > 2.5 ? "#f97316" : "#22c55e";

  const handleTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "map")     navigation.navigate("Heatmap");
    if (tabId === "history") navigation.navigate("History");
    if (tabId === "profile") navigation.navigate("Profile");
  };

  return (
    <View style={[s.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero */}
        <View style={s.heroWrap}>
          <Image source={{ uri: CITY_IMAGE }} style={s.heroImg} resizeMode="cover" />
          <View style={[s.heroOverlay, { backgroundColor: t.heroOverlay }]} />
          <View style={s.heroTopBar}>
            <View>
              <Text style={s.heroGreeting}>{greeting()}</Text>
              <Text style={s.heroName}>
                {userName || auth.currentUser?.email?.split("@")[0]}
              </Text>
            </View>
            <TouchableOpacity
              style={s.signOutBtn}
              onPress={async () => { await stopAllMonitoring(); await signOut(auth); navigation.replace("Login"); }}
            >
              <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Monitoring badge */}
          <View style={[s.monBadge, {
            backgroundColor: monitoring ? "rgba(34,197,94,0.15)" : "rgba(80,80,80,0.2)",
            borderColor: monitoring ? "rgba(34,197,94,0.3)" : "rgba(100,100,100,0.2)",
          }]}>
            <Animated.View style={[s.monDot, {
              backgroundColor: monitoring ? "#22c55e" : "#555",
              transform: [{ scale: monitoring ? pulseAnim : 1 }],
            }]} />
            <Text style={[s.monText, { color: monitoring ? "#22c55e" : "#666" }]}>
              {monitoring
                ? appState === "active" ? "Monitoring active" : "Monitoring in background"
                : "Monitoring paused"}
            </Text>
          </View>
        </View>

        {/* Background detection info banner */}
        {monitoring && appState !== "active" && (
          <View style={[s.bgBanner, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#22c55e" />
            <Text style={[s.bgBannerText, { color: t.textSub }]}>
              CrashGuard is monitoring in the background
            </Text>
          </View>
        )}

        {/* Metrics */}
        <View style={[s.metricsRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={s.metric}>
            <Text style={[s.metricNum, { color: gColor }]}>{gForce.toFixed(1)}</Text>
            <Text style={[s.metricUnit, { color: t.textMuted }]}>G-force</Text>
            <View style={[s.metricBar, { backgroundColor: t.border }]}>
              <Animated.View style={[s.metricFill, {
                width: gBarAnim.interpolate({ inputRange:[0,1], outputRange:["0%","100%"] }),
                backgroundColor: gColor,
              }]} />
            </View>
          </View>
          <View style={[s.metricDivider, { backgroundColor: t.border }]} />
          <View style={s.metric}>
            <Text style={[s.metricNum, { color: t.text }]}>2.5</Text>
            <Text style={[s.metricUnit, { color: t.textMuted }]}>Threshold</Text>
            <View style={[s.metricBar, { backgroundColor: t.border }]}>
              <View style={[s.metricFill, { width:"31%", backgroundColor:"#f97316" }]} />
            </View>
          </View>
          <View style={[s.metricDivider, { backgroundColor: t.border }]} />
          <View style={s.metric}>
            <Text style={[s.metricNum, { color: t.text }]}>{alertCount}</Text>
            <Text style={[s.metricUnit, { color: t.textMuted }]}>Alerts</Text>
            <View style={[s.metricBar, { backgroundColor: t.border }]}>
              <View style={[s.metricFill, { width: alertCount > 0 ? "80%" : "5%", backgroundColor:"#6366f1" }]} />
            </View>
          </View>
        </View>

        {/* Status card */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.statusCard, { backgroundColor: t.bgCard, borderColor: monitoring ? "rgba(34,197,94,0.2)" : t.border }]}
            onPress={monitoring ? stopAllMonitoring : handleStartMonitoring}
            activeOpacity={0.85}
          >
            <View style={s.statusLeft}>
              <Text style={[s.statusTitle, { color: t.text }]}>
                {monitoring ? "Crash detection active" : "Detection paused"}
              </Text>
              <Text style={[s.statusSub, { color: t.textMuted }]}>
                {monitoring
                  ? "Runs in background when app is minimized"
                  : "Tap to resume protection"}
              </Text>
            </View>
            <View style={[s.statusIconWrap, {
              backgroundColor: monitoring ? "rgba(34,197,94,0.1)" : t.bgCard2,
            }]}>
              <MaterialCommunityIcons
                name={monitoring ? "shield-check" : "shield-off"}
                size={22}
                color={monitoring ? "#22c55e" : t.textMuted}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: t.textMuted }]}>How it works</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {[
              { icon:"wifi",              step:"01", title:"Detects",     desc:"G-force above 2.5G" },
              { icon:"analytics",         step:"02", title:"Classifies",  desc:"AI rates severity" },
              { icon:"timer-outline",     step:"03", title:"30s window",  desc:"Cancel if false alarm" },
              { icon:"car-sport",         step:"04", title:"Dispatches",  desc:"Nearest responder" },
              { icon:"chatbubble-outline",step:"05", title:"Notifies",    desc:"Family gets SMS" },
            ].map((item) => (
              <View key={item.step} style={[s.howCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={s.howStep}>{item.step}</Text>
                <Ionicons name={item.icon} size={20} color="#6366f1" style={{ marginBottom: 8 }} />
                <Text style={[s.howTitle, { color: t.text }]}>{item.title}</Text>
                <Text style={[s.howDesc, { color: t.textMuted }]}>{item.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* SOS */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.sosBtn, { backgroundColor: t.bgCard, borderColor: "rgba(239,68,68,0.3)" }]}
            onPress={manualSOS}
            activeOpacity={0.88}
          >
            <View style={s.sosInner}>
              <View style={s.sosIconWrap}>
                <Ionicons name="warning" size={24} color="#fff" />
              </View>
              <View style={s.sosTextWrap}>
                <Text style={s.sosTitle}>MANUAL SOS</Text>
                <Text style={[s.sosSub, { color: t.textMuted }]}>Send emergency alert now</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#ef4444" style={{ opacity: 0.7 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Heatmap */}
        <View style={[s.section, { marginBottom: 100 }]}>
          <TouchableOpacity
            style={[s.heatmapBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
            onPress={() => navigation.navigate("Heatmap")}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={22} color="#6366f1" />
            <View style={{ flex: 1 }}>
              <Text style={[s.heatmapTitle, { color: t.text }]}>Accident heatmap</Text>
              <Text style={[s.heatmapSub, { color: t.textMuted }]}>
                View crash hotspots in your area
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textDim} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Tab bar */}
      <View style={[s.tabBar, { backgroundColor: t.tabBar, borderTopColor: t.tabBarBorder }]}>
        {[
          { id:"home",    icon:"shield-checkmark-outline", iconOn:"shield-checkmark", label:"Home"    },
          { id:"map",     icon:"map-outline",              iconOn:"map",              label:"Map"     },
          { id:"history", icon:"time-outline",             iconOn:"time",             label:"History" },
          { id:"profile", icon:"person-outline",           iconOn:"person",           label:"Profile" },
        ].map((tab) => (
          <TouchableOpacity key={tab.id} style={s.tabItem} onPress={() => handleTab(tab.id)}>
            <Ionicons
              name={activeTab === tab.id ? tab.iconOn : tab.icon}
              size={22}
              color={activeTab === tab.id ? "#ef4444" : t.textDim}
            />
            <Text style={[s.tabLabel, { color: activeTab === tab.id ? "#ef4444" : t.textDim }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1 },
  heroWrap:       { height: 210, position: "relative", overflow: "hidden" },
  heroImg:        { width, height: 210, position: "absolute" },
  heroOverlay:    { position: "absolute", width, height: 210 },
  heroTopBar:     { position: "absolute", top: 52, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroGreeting:   { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  heroName:       { fontSize: 24, fontWeight: "700", color: "#fff", letterSpacing: -0.5, marginTop: 2 },
  signOutBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  monBadge:       { position: "absolute", bottom: 14, left: 20, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5 },
  monDot:         { width: 7, height: 7, borderRadius: 4 },
  monText:        { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  bgBanner:       { marginHorizontal: 16, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12, borderWidth: 0.5 },
  bgBannerText:   { fontSize: 13, fontWeight: "500" },
  metricsRow:     { flexDirection: "row", marginHorizontal: 16, marginTop: 14, borderRadius: 18, padding: 16, borderWidth: 0.5 },
  metric:         { flex: 1, alignItems: "center" },
  metricNum:      { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  metricUnit:     { fontSize: 10, marginTop: 3, marginBottom: 8 },
  metricBar:      { width: "80%", height: 3, borderRadius: 2, overflow: "hidden" },
  metricFill:     { height: "100%", borderRadius: 2 },
  metricDivider:  { width: 0.5, marginVertical: 4 },
  section:        { paddingHorizontal: 16, marginTop: 14 },
  sectionTitle:   { fontSize: 12, fontWeight: "600", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  statusCard:     { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 16, borderWidth: 0.5, gap: 14 },
  statusLeft:     { flex: 1 },
  statusTitle:    { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  statusSub:      { fontSize: 12, lineHeight: 18 },
  statusIconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  howCard:        { width: 92, borderRadius: 14, padding: 12, borderWidth: 0.5 },
  howStep:        { fontSize: 9, fontWeight: "700", color: "#ef4444", letterSpacing: 1, marginBottom: 8 },
  howTitle:       { fontSize: 12, fontWeight: "600", marginBottom: 3 },
  howDesc:        { fontSize: 10, lineHeight: 14 },
  sosBtn:         { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  sosInner:       { flexDirection: "row", alignItems: "center", padding: 18, gap: 14, backgroundColor: "rgba(239,68,68,0.04)" },
  sosIconWrap:    { width: 48, height: 48, borderRadius: 15, backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center" },
  sosTextWrap:    { flex: 1 },
  sosTitle:       { fontSize: 16, fontWeight: "700", color: "#ef4444", letterSpacing: 0.5 },
  sosSub:         { fontSize: 12, marginTop: 3 },
  heatmapBtn:     { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 16, borderWidth: 0.5 },
  heatmapTitle:   { fontSize: 14, fontWeight: "600" },
  heatmapSub:     { fontSize: 11, marginTop: 2 },
  tabBar:         { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", borderTopWidth: 0.5, paddingBottom: Platform.OS === "ios" ? 28 : 12, paddingTop: 10 },
  tabItem:        { flex: 1, alignItems: "center", gap: 3 },
  tabLabel:       { fontSize: 10, fontWeight: "500" },
});
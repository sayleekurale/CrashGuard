// screens/ResponderHome.js — FIXED + Working tabs + Profile + ETA

import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, StatusBar, Linking, Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import {
  collection, onSnapshot, query, where,
  orderBy, doc, updateDoc, getDoc,
} from "firebase/firestore";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { auth, db } from "../config/firebaseConfig";
import AudioPlayer from "../components/AudioPlayer";
import { registerForNotifications } from "../services/NotificationService";
import { calculateAndSaveETA } from "../services/etaService";

export default function ResponderHome({ navigation }) {
  const [alerts,    setAlerts]    = useState([]);
  const [myAlerts,  setMyAlerts]  = useState([]);
  const [available, setAvailable] = useState(true);
  const [tab,       setTab]       = useState("active");
  const [activeNav, setActiveNav] = useState("alerts");

  const uid = auth.currentUser?.uid;

  useEffect(() => { registerForNotifications(); }, []);

  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, async (snap) => {
      const newAlerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      snap.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const alert = change.doc.data();

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🚨 New ${alert.severity?.toUpperCase()} Crash Alert`,
              body: `${alert.userName} needs help. Tap to respond.`,
              sound: "default",
              data: { alertId: change.doc.id },
            },
            trigger: null,
          });
        }
      });

      setAlerts(newAlerts);
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("responderId", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) =>
      setMyAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [uid]);

  // ── Accept alert + calculate ETA ─────────────────────────
  const acceptAlert = async (item) => {
    try {
      // Update Firestore first
      await updateDoc(doc(db, "alerts", item.id), {
        status:        "accepted",
        responderId:   uid,
        responderName: auth.currentUser?.email,
        acceptedAt:    new Date().toISOString(),
      });

      setTab("mine");

      // Calculate ETA using location (non-blocking)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (item.location?.lat && item.location?.lng) {
            await calculateAndSaveETA({
              alertId:      item.id,
              responderLat: pos.coords.latitude,
              responderLng: pos.coords.longitude,
              victimLat:    item.location.lat,
              victimLng:    item.location.lng,
            });
          }
        }
      } catch (locErr) {
        // Location failed — ETA just won't show, not critical
        console.log("Location for ETA failed:", locErr.message);
      }

      Alert.alert("Accepted", "Navigate to the victim's location.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const updateStatus = async (alertId, newStatus) => {
    try {
      await updateDoc(doc(db, "alerts", alertId), {
        status: newStatus, updatedAt: new Date().toISOString(),
      });
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const navigate = (lat, lng) => {
    if (!lat || !lng) { Alert.alert("No location available"); return; }
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    );
  };

  const toggleAvailability = async () => {
    const next = !available;
    setAvailable(next);
    try {
      await updateDoc(doc(db, "users", uid), {
        status: next ? "available" : "busy",
      });
    } catch (e) {}
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  const sevConfig = {
    severe:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
    moderate: { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    minor:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  };

  // ── Render single alert card ──────────────────────────────
  const renderAlert = ({ item }) => {
    const sev    = sevConfig[item.severity] || sevConfig.severe;
    const isMine = item.responderId === uid;

    return (
      <View style={[s.alertCard, { borderLeftColor: sev.color }]}>

        {/* Strip */}
        <View style={[s.alertStrip, { backgroundColor: sev.bg }]}>
          <View style={s.stripLeft}>
            <View style={[s.sevDot, { backgroundColor: sev.color }]} />
            <Text style={[s.sevLabel, { color: sev.color }]}>
              {(item.severity || "unknown").toUpperCase()} CRASH
            </Text>
          </View>
          <Text style={s.timeAgo}>{timeAgo(item.createdAt)}</Text>
        </View>

        <View style={s.alertBody}>
          {/* Victim */}
          <View style={s.victimRow}>
            <View style={s.victimAvatar}>
              <Text style={s.victimInitial}>
                {((item.userName || item.userEmail || "U")[0]).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.victimName}>{item.userName || item.userEmail || "Unknown"}</Text>
              <Text style={s.victimSub}>
                {item.gForce && item.gForce !== "manual"
                  ? `${item.gForce}G impact`
                  : "Manual SOS"}
              </Text>
            </View>
            {/* ETA badge */}
            {item.etaMinutes && (
              <View style={s.etaBadge}>
                <Text style={s.etaNum}>{item.etaMinutes}m</Text>
                <Text style={s.etaLabel}>ETA</Text>
              </View>
            )}
          </View>

          {/* Location */}
          {item.location?.lat && (
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={13} color="#555" />
              <Text style={s.infoText}>
                {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                {item.etaDistance ? `  ·  ${item.etaDistance}km` : ""}
              </Text>
            </View>
          )}

          {/* Consciousness */}
          {item.consciousnessCheck && (
            <View style={[s.consciousBadge, {
              backgroundColor:
                item.consciousnessCheck === "conscious"
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
            }]}>
              <Text style={[s.consciousText, {
                color: item.consciousnessCheck === "conscious" ? "#22c55e" : "#ef4444",
              }]}>
                {item.consciousnessCheck === "conscious"
                  ? "Victim conscious"
                  : item.consciousnessCheck === "unconscious"
                  ? "Victim unconscious — URGENT"
                  : "No response to check"}
              </Text>
            </View>
          )}

          {/* Status */}
          <View style={s.statusRow}>
            <View style={[s.statusDot, {
              backgroundColor:
                item.status === "active"    ? "#ef4444" :
                item.status === "accepted"  ? "#f59e0b" :
                item.status === "en-route"  ? "#6366f1" :
                item.status === "arrived"   ? "#22c55e" : "#555",
            }]} />
            <Text style={s.statusText}>{(item.status || "").toUpperCase()}</Text>
          </View>

          {/* Crash replay */}
          {item.replayData && item.replayData.length > 0 && (
            <View style={s.replayWrap}>
              <Text style={s.replayLabel}>CRASH REPLAY — BLACK BOX</Text>
              <View style={s.replayChart}>
                {item.replayData.slice(-50).map((g, i) => {
                  const barH = Math.min((g / 8) * 32, 32);
                  const col  = g > 4 ? "#ef4444" : g > 2.5 ? "#f97316" : "#22c55e";
                  return (
                    <View
                      key={i}
                      style={[s.replayBar, { height: barH, backgroundColor: col }]}
                    />
                  );
                })}
              </View>
              <View style={s.replayFooter}>
                <Text style={s.replayTime}>-10s</Text>
                <Text style={[s.replayTime, { color: "#ef4444" }]}>
                  Peak: {item.peakG ? parseFloat(item.peakG).toFixed(1) : "?"}G
                </Text>
                <Text style={s.replayTime}>Impact</Text>
              </View>
            </View>
          )}

          {/* Audio player */}
          {item.audioUrl && <AudioPlayer audioUrl={item.audioUrl} />}

          {/* Action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => navigate(item.location?.lat, item.location?.lng)}
            >
              <Ionicons name="navigate-outline" size={14} color="#888" />
              <Text style={s.navBtnText}>Navigate</Text>
            </TouchableOpacity>

            {item.status === "active" && !isMine && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#ef4444" }]}
                onPress={() => acceptAlert(item)}
              >
                <Text style={s.actionBtnText}>Accept</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}
            {isMine && item.status === "accepted" && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#6366f1" }]}
                onPress={() => updateStatus(item.id, "en-route")}
              >
                <Text style={s.actionBtnText}>En Route</Text>
              </TouchableOpacity>
            )}
            {isMine && item.status === "en-route" && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#22c55e" }]}
                onPress={() => updateStatus(item.id, "arrived")}
              >
                <Text style={s.actionBtnText}>Arrived</Text>
              </TouchableOpacity>
            )}
            {isMine && item.status === "arrived" && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#555" }]}
                onPress={() => updateStatus(item.id, "resolved")}
              >
                <Text style={s.actionBtnText}>Resolve</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const displayData = tab === "active" ? alerts : myAlerts;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Responder</Text>
          <Text style={s.headerSub}>{auth.currentUser?.email}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={[s.availBtn, { borderColor: available ? "rgba(34,197,94,0.4)" : "#2a2a3a" }]}
            onPress={toggleAvailability}
          >
            <View style={[s.availDot, { backgroundColor: available ? "#22c55e" : "#555" }]} />
            <Text style={[s.availText, { color: available ? "#22c55e" : "#888" }]}>
              {available ? "Available" : "Busy"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statNum}>{alerts.length}</Text>
          <Text style={s.statLabel}>Active</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statNum}>
            {myAlerts.filter((a) => a.status !== "resolved").length}
          </Text>
          <Text style={s.statLabel}>Assigned</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statNum}>
            {myAlerts.filter((a) => a.status === "resolved").length}
          </Text>
          <Text style={s.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tabBtn, tab === "active" && s.tabBtnOn]}
          onPress={() => setTab("active")}
        >
          <Text style={[s.tabBtnText, tab === "active" && s.tabBtnTextOn]}>
            Incoming {alerts.length > 0 ? `(${alerts.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === "mine" && s.tabBtnOn]}
          onPress={() => setTab("mine")}
        >
          <Text style={[s.tabBtnText, tab === "mine" && s.tabBtnTextOn]}>
            My Cases {myAlerts.length > 0 ? `(${myAlerts.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alert list */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={renderAlert}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons
              name={tab === "active" ? "check-circle-outline" : "clipboard-list-outline"}
              size={48} color="#222"
            />
            <Text style={s.emptyTitle}>
              {tab === "active" ? "All clear" : "No cases yet"}
            </Text>
            <Text style={s.emptyText}>
              {tab === "active"
                ? "No active alerts right now"
                : "Cases you accept appear here"}
            </Text>
          </View>
        }
      />

      {/* Bottom tab bar */}
      <View style={s.bottomNav}>
        {[
          { id: "alerts",  icon: "alert-circle-outline",  iconOn: "alert-circle",  label: "Alerts"  },
          { id: "cases",   icon: "clipboard-list-outline", iconOn: "clipboard-list-outline", label: "Cases"   },
          { id: "heatmap", icon: "map-outline",            iconOn: "map",           label: "Heatmap" },
          { id: "profile", icon: "person-outline",         iconOn: "person",        label: "Profile" },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={s.navItem}
            onPress={() => {
              setActiveNav(t.id);
              if (t.id === "cases")   setTab("mine");
              if (t.id === "alerts")  setTab("active");
              if (t.id === "heatmap") navigation.navigate("Heatmap");
              if (t.id === "profile") navigation.navigate("ResponderProfile");
            }}
          >
            <Ionicons
              name={activeNav === t.id ? t.iconOn : t.icon}
              size={22}
              color={activeNav === t.id ? "#ef4444" : "#444"}
            />
            <Text style={[s.navLabel, activeNav === t.id && s.navLabelOn]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#080810" },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  headerTitle:    { fontSize: 22, fontWeight: "700", color: "#f0f0ff", letterSpacing: -0.3 },
  headerSub:      { fontSize: 11, color: "#3f3f5a", marginTop: 2 },
  headerRight:    { alignItems: "flex-end" },
  availBtn:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#10101a", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  availDot:       { width: 6, height: 6, borderRadius: 3 },
  availText:      { fontSize: 11, fontWeight: "600" },

  statsRow:       { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#10101a", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: "#1e1e2e" },
  stat:           { flex: 1, alignItems: "center" },
  statNum:        { fontSize: 22, fontWeight: "700", color: "#f0f0ff" },
  statLabel:      { fontSize: 10, color: "#555", marginTop: 2 },
  statDivider:    { width: 0.5, backgroundColor: "#1e1e2e", marginVertical: 4 },

  tabs:           { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#10101a", borderRadius: 12, padding: 3, marginBottom: 12, borderWidth: 0.5, borderColor: "#1e1e2e" },
  tabBtn:         { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  tabBtnOn:       { backgroundColor: "#ef4444" },
  tabBtnText:     { fontSize: 13, fontWeight: "600", color: "#555" },
  tabBtnTextOn:   { color: "#fff" },

  list:           { paddingHorizontal: 16, paddingBottom: 90 },

  alertCard:      { backgroundColor: "#10101a", borderRadius: 18, marginBottom: 12, overflow: "hidden", borderWidth: 0.5, borderColor: "#1e1e2e", borderLeftWidth: 3 },
  alertStrip:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9 },
  stripLeft:      { flexDirection: "row", alignItems: "center", gap: 7 },
  sevDot:         { width: 7, height: 7, borderRadius: 4 },
  sevLabel:       { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  timeAgo:        { fontSize: 10, color: "#444" },

  alertBody:      { padding: 14 },
  victimRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  victimAvatar:   { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(99,102,241,0.15)", justifyContent: "center", alignItems: "center" },
  victimInitial:  { fontSize: 16, fontWeight: "700", color: "#818cf8" },
  victimName:     { fontSize: 15, fontWeight: "600", color: "#f0f0ff" },
  victimSub:      { fontSize: 11, color: "#555", marginTop: 2 },

  etaBadge:       { backgroundColor: "rgba(99,102,241,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", borderWidth: 0.5, borderColor: "rgba(99,102,241,0.3)" },
  etaNum:         { fontSize: 16, fontWeight: "700", color: "#818cf8" },
  etaLabel:       { fontSize: 9, color: "#555", marginTop: 1 },

  infoRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoText:       { fontSize: 12, color: "#555" },

  consciousBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  consciousText:  { fontSize: 12, fontWeight: "600" },

  statusRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  statusDot:      { width: 7, height: 7, borderRadius: 4 },
  statusText:     { fontSize: 10, fontWeight: "700", color: "#555", letterSpacing: 0.5 },

  replayWrap:     { backgroundColor: "#0a0a14", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: "#1e1e2e" },
  replayLabel:    { fontSize: 9, fontWeight: "700", color: "#444", letterSpacing: 0.8, marginBottom: 8 },
  replayChart:    { flexDirection: "row", alignItems: "flex-end", height: 36, gap: 1, marginBottom: 4 },
  replayBar:      { flex: 1, borderRadius: 1, minHeight: 2 },
  replayFooter:   { flexDirection: "row", justifyContent: "space-between" },
  replayTime:     { fontSize: 9, color: "#444" },

  actionRow:      { flexDirection: "row", gap: 8, marginTop: 4 },
  navBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#1a1a28", borderRadius: 11, paddingVertical: 11, borderWidth: 0.5, borderColor: "#2a2a3a" },
  navBtnText:     { fontSize: 13, color: "#888", fontWeight: "500" },
  actionBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 11, paddingVertical: 11 },
  actionBtnText:  { fontSize: 13, color: "#fff", fontWeight: "700" },

  empty:          { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle:     { fontSize: 18, fontWeight: "700", color: "#2a2a3a" },
  emptyText:      { fontSize: 13, color: "#333" },

  bottomNav:      { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", backgroundColor: "#080810", borderTopWidth: 0.5, borderTopColor: "#1a1a28", paddingBottom: Platform.OS === "ios" ? 28 : 12, paddingTop: 10 },
  navItem:        { flex: 1, alignItems: "center", gap: 3 },
  navLabel:       { fontSize: 10, fontWeight: "500", color: "#444" },
  navLabelOn:     { color: "#ef4444" },
});

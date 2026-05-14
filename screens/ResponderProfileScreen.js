// screens/ResponderProfileScreen.js

import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Alert, Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";

export default function ResponderProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({});
  const [available, setAvailable] = useState(true);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const snap = await getDoc(doc(db, "users", auth.currentUser?.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setAvailable(d.status === "available");
      }
    } catch (e) {}
  };

  const toggleAvail = async (val) => {
    setAvailable(val);
    try {
      await updateDoc(doc(db, "users", auth.currentUser?.uid), {
        status: val ? "available" : "busy",
      });
    } catch (e) {}
  };

  const handleSignOut = async () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await signOut(auth); navigation.replace("Login");
      }},
    ]);
  };

  const initial = (userData.name || auth.currentUser?.email || "R")[0].toUpperCase();
  const totalCases = userData.totalCases || 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#f0f0ff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={s.avatarName}>{userData.name || "Responder"}</Text>
          <Text style={s.avatarEmail}>{auth.currentUser?.email}</Text>
          <View style={s.roleBadge}>
            <MaterialCommunityIcons name="ambulance" size={12} color="#6366f1" />
            <Text style={s.roleText}>RESPONDER</Text>
          </View>
        </View>

        {/* Status */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Availability</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.statusDot, { backgroundColor: available ? "#22c55e" : "#555" }]} />
              <Text style={[s.rowLabel, { flex: 1 }]}>
                {available ? "Available for alerts" : "Currently busy"}
              </Text>
              <Switch
                value={available}
                onValueChange={toggleAvail}
                trackColor={{ false: "#1e1e2e", true: "rgba(34,197,94,0.4)" }}
                thumbColor={available ? "#22c55e" : "#555"}
              />
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="person-outline" size={16} color="#555" />
              <Text style={s.rowLabel}>Name</Text>
              <Text style={s.rowValue}>{userData.name || "—"}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <Ionicons name="mail-outline" size={16} color="#555" />
              <Text style={s.rowLabel}>Email</Text>
              <Text style={s.rowValue}>{auth.currentUser?.email}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <MaterialCommunityIcons name="shield-account" size={16} color="#555" />
              <Text style={s.rowLabel}>Role</Text>
              <Text style={s.rowValue}>Responder</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Actions</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate("RoleScreen")}>
              <MaterialCommunityIcons name="account-switch-outline" size={16} color="#555" />
              <Text style={[s.rowLabel, { flex: 1 }]}>Switch to user mode</Text>
              <Ionicons name="chevron-forward" size={14} color="#333" />
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate("Heatmap")}>
              <Ionicons name="map-outline" size={16} color="#555" />
              <Text style={[s.rowLabel, { flex: 1 }]}>View accident heatmap</Text>
              <Ionicons name="chevron-forward" size={14} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out */}
        <View style={[s.section, { marginBottom: 40 }]}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#080810" },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: "#1a1a28" },
  headerTitle:   { fontSize: 18, fontWeight: "700", color: "#f0f0ff" },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(99,102,241,0.15)", borderWidth: 1.5, borderColor: "rgba(99,102,241,0.3)", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText:    { fontSize: 32, fontWeight: "700", color: "#6366f1" },
  avatarName:    { fontSize: 20, fontWeight: "700", color: "#f0f0ff", marginBottom: 4 },
  avatarEmail:   { fontSize: 13, color: "#555", marginBottom: 12 },
  roleBadge:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  roleText:      { fontSize: 11, fontWeight: "700", color: "#6366f1", letterSpacing: 0.5 },
  section:       { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel:  { fontSize: 11, fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  card:          { backgroundColor: "#10101a", borderRadius: 16, borderWidth: 0.5, borderColor: "#1e1e2e" },
  row:           { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowLabel:      { fontSize: 13, color: "#888", width: 80 },
  rowValue:      { flex: 1, fontSize: 13, color: "#f0f0ff", textAlign: "right" },
  divider:       { height: 0.5, backgroundColor: "#1a1a28", marginHorizontal: 14 },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  signOutBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  signOutText:   { fontSize: 15, fontWeight: "600", color: "#ef4444" },
});
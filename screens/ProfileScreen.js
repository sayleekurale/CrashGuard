// screens/ProfileScreen.js — With working dark/light toggle

import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, TextInput, Alert, Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function ProfileScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const t = theme; // shorthand

  const [userData,    setUserData]    = useState({});
  const [editing,     setEditing]     = useState(false);
  const [familyPhone, setFamilyPhone] = useState("");
  const [name,        setName]        = useState("");

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const snap = await getDoc(doc(db, "users", auth.currentUser?.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setFamilyPhone(d.familyPhone || "");
        setName(d.name || "");
      }
    } catch (e) {}
  };

  const saveProfile = async () => {
    try {
      await updateDoc(doc(db, "users", auth.currentUser?.uid), {
        name: name.trim(), familyPhone: familyPhone.trim(),
        updatedAt: new Date().toISOString(),
      });
      setUserData((p) => ({ ...p, name: name.trim(), familyPhone: familyPhone.trim() }));
      setEditing(false);
      Alert.alert("Saved", "Profile updated.");
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await signOut(auth); navigation.replace("Login");
      }},
    ]);
  };

  const initial = (userData.name || auth.currentUser?.email || "U")[0].toUpperCase();

  const s = makeStyles(t);

  return (
    <View style={s.container}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => editing ? saveProfile() : setEditing(true)}>
          <Text style={s.editBtn}>{editing ? "Save" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={s.avatarName}>{userData.name || "User"}</Text>
          <Text style={s.avatarEmail}>{auth.currentUser?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>
              {userData.role === "responder" ? "RESPONDER" : "USER"}
            </Text>
          </View>
        </View>

        {/* Personal info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Personal info</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="person-outline" size={16} color={t.textMuted} />
              <Text style={s.rowLabel}>Name</Text>
              {editing
                ? <TextInput style={s.rowInput} value={name} onChangeText={setName} placeholderTextColor={t.textDim} />
                : <Text style={s.rowValue}>{userData.name || "—"}</Text>
              }
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <Ionicons name="mail-outline" size={16} color={t.textMuted} />
              <Text style={s.rowLabel}>Email</Text>
              <Text style={s.rowValue}>{auth.currentUser?.email}</Text>
            </View>
          </View>
        </View>

        {/* Emergency contact */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Emergency contact</Text>
          <View style={s.card}>
            <View style={s.row}>
              <MaterialCommunityIcons name="phone-alert" size={16} color={t.accent} />
              <Text style={s.rowLabel}>Family no.</Text>
              {editing
                ? <TextInput style={s.rowInput} value={familyPhone} onChangeText={setFamilyPhone} keyboardType="phone-pad" placeholderTextColor={t.textDim} />
                : <Text style={s.rowValue}>{userData.familyPhone || "Not set"}</Text>
              }
            </View>
            <View style={s.divider} />
            <View style={s.infoRow}>
              <Ionicons name="information-circle-outline" size={14} color={t.textMuted} />
              <Text style={s.infoText}>
                This person gets an SMS with your location when a crash is detected
              </Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Appearance</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={16}
                color={isDark ? "#6366f1" : "#f59e0b"}
              />
              <Text style={[s.rowLabel, { flex: 1 }]}>
                {isDark ? "Dark mode" : "Light mode"}
              </Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#e5e5ea", true: "rgba(99,102,241,0.4)" }}
                thumbColor={isDark ? "#6366f1" : "#f59e0b"}
              />
            </View>
            <View style={s.divider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => navigation.navigate("RoleScreen")}
            >
              <MaterialCommunityIcons name="account-switch-outline" size={16} color={t.textMuted} />
              <Text style={[s.rowLabel, { flex: 1 }]}>Switch role</Text>
              <Ionicons name="chevron-forward" size={14} color={t.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out */}
        <View style={[s.section, { marginBottom: 40 }]}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={t.accent} />
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: t.bg },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: t.border },
  headerTitle:   { fontSize: 18, fontWeight: "700", color: t.text },
  editBtn:       { fontSize: 14, color: t.accent, fontWeight: "600" },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: t.accentSub, borderWidth: 1.5, borderColor: t.accentBorder, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText:    { fontSize: 32, fontWeight: "700", color: t.accent },
  avatarName:    { fontSize: 20, fontWeight: "700", color: t.text, marginBottom: 4 },
  avatarEmail:   { fontSize: 13, color: t.textMuted, marginBottom: 12 },
  roleBadge:     { backgroundColor: t.accentSub, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  roleText:      { fontSize: 11, fontWeight: "700", color: t.accent, letterSpacing: 0.5 },
  section:       { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel:  { fontSize: 11, fontWeight: "600", color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  card:          { backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 0.5, borderColor: t.border, overflow: "hidden" },
  row:           { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowLabel:      { fontSize: 13, color: t.textMuted, width: 80 },
  rowValue:      { flex: 1, fontSize: 13, color: t.text, textAlign: "right" },
  rowInput:      { flex: 1, fontSize: 13, color: t.text, textAlign: "right", borderBottomWidth: 0.5, borderBottomColor: t.accent, paddingVertical: 2 },
  divider:       { height: 0.5, backgroundColor: t.border, marginHorizontal: 14 },
  infoRow:       { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, paddingTop: 8 },
  infoText:      { flex: 1, fontSize: 12, color: t.textMuted, lineHeight: 18 },
  signOutBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: t.accentSub, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.accentBorder },
  signOutText:   { fontSize: 15, fontWeight: "600", color: t.accent },
});
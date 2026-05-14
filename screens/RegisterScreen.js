// screens/RegisterScreen.js — CrashGuard Registration
// Collects name, email, password + emergency contact number

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

export default function RegisterScreen({ navigation }) {
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [phone,       setPhone]       = useState("");
  // phone = emergency contact (family member) number
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!name.trim())   { Alert.alert("Required", "Please enter your name."); return; }
    if (!email.trim())  { Alert.alert("Required", "Please enter your email."); return; }
    if (password.length < 6) { Alert.alert("Weak password", "Minimum 6 characters."); return; }
    if (!phone.trim() || phone.replace(/\D/g,"").length < 10) {
      Alert.alert("Required", "Enter emergency contact with country code.\nExample: +917558349714"); return;
    }

    setLoading(true);
    try {
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Save profile to Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        uid:          cred.user.uid,
        name:         name.trim(),
        email:        email.trim(),
        familyPhone:  phone.trim(),
        role:         null,           // set on RoleScreen
        status:       "available",    // for responders
        location:     null,
        fcmToken:     null,
        createdAt:    new Date().toISOString(),
      });

      navigation.replace("RoleScreen");
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "This email is already registered. Please sign in.",
        "auth/invalid-email":        "Please enter a valid email address.",
        "auth/weak-password":        "Password must be at least 6 characters.",
      };
      Alert.alert("Registration failed", msgs[err.code] || err.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.sub}>Set up your emergency profile</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>

          {/* Name */}
          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.icon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Saylee Kurale"
              placeholderTextColor="#3f3f5a"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.icon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#3f3f5a"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.icon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor="#3f3f5a"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Text style={styles.showBtn}>{showPass ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency contact — KEY FEATURE */}
          <View style={styles.emergencyHeader}>
            <Text style={styles.label}>Emergency contact number</Text>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>🚨 Important</Text>
            </View>
          </View>
          <View style={[styles.inputWrap, styles.emergencyWrap]}>
            <Text style={styles.icon}>📱</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#3f3f5a"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>

          {/* What this does */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens when crash is detected?</Text>
            <Text style={styles.infoItem}>📍  This person gets an SMS with your live location</Text>
            <Text style={styles.infoItem}>🚑  Nearest responder is auto-assigned to you</Text>
            <Text style={styles.infoItem}>⏱️  You have 30 seconds to cancel a false alarm</Text>
          </View>

          {/* Register button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnOff]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create account →</Text>
            }
          </TouchableOpacity>

        </View>

        {/* Login link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.replace("Login")}>
            <Text style={styles.bottomLink}> Sign in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#0a0a0f" },
  scroll:         { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  back:           { marginBottom: 24 },
  backText:       { fontSize: 14, color: "#6366f1", fontWeight: "500" },
  header:         { marginBottom: 28 },
  title:          { fontSize: 28, fontWeight: "700", color: "#f0f0ff", marginBottom: 6 },
  sub:            { fontSize: 14, color: "#6b6b8a" },
  card:           { backgroundColor: "#12121f", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "#1e1e35", marginBottom: 20 },
  label:          { fontSize: 11, fontWeight: "600", color: "#6b6b8a", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  inputWrap:      { flexDirection: "row", alignItems: "center", backgroundColor: "#0a0a0f", borderWidth: 1, borderColor: "#1e1e35", borderRadius: 14, paddingHorizontal: 14, marginBottom: 18 },
  icon:           { fontSize: 15, marginRight: 10 },
  input:          { flex: 1, paddingVertical: 14, fontSize: 15, color: "#f0f0ff" },
  showBtn:        { fontSize: 12, color: "#6366f1", fontWeight: "600", paddingLeft: 8 },
  emergencyHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  urgentBadge:    { backgroundColor: "#ef444415", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#ef444430" },
  urgentText:     { fontSize: 11, color: "#ef4444", fontWeight: "600" },
  emergencyWrap:  { borderColor: "#ef444440", borderWidth: 1.5 },
  infoBox:        { backgroundColor: "#0a1628", borderRadius: 12, padding: 14, marginBottom: 22, borderLeftWidth: 3, borderLeftColor: "#6366f1" },
  infoTitle:      { fontSize: 12, fontWeight: "600", color: "#6366f1", marginBottom: 10 },
  infoItem:       { fontSize: 12, color: "#6b6b8a", marginBottom: 6, lineHeight: 18 },
  btn:            { backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnOff:         { opacity: 0.5 },
  btnText:        { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  bottomRow:      { flexDirection: "row", justifyContent: "center" },
  bottomText:     { fontSize: 13, color: "#6b6b8a" },
  bottomLink:     { fontSize: 13, color: "#6366f1", fontWeight: "600" },
});
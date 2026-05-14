// screens/LoginScreen.js — THEMED
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Image, Animated, Dimensions,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const HERO_IMAGE = "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80";

export default function LoginScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert("Missing fields", "Enter email and password."); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.exists()) {
        const role = snap.data().role;
        if (role === "user")           navigation.replace("UserHome");
        else if (role === "responder") navigation.replace("ResponderHome");
        else                           navigation.replace("RoleScreen");
      } else { navigation.replace("RoleScreen"); }
    } catch (err) {
      const msgs = {
        "auth/user-not-found":     "No account found. Please register.",
        "auth/wrong-password":     "Wrong password.",
        "auth/invalid-credential": "Wrong email or password.",
        "auth/invalid-email":      "Enter a valid email.",
      };
      Alert.alert("Login failed", msgs[err.code] || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Image source={{ uri: HERO_IMAGE }} style={{ position:"absolute", width, height: height * 0.65, top: 0 }} resizeMode="cover" />
      <View style={{ position:"absolute", width, height: height * 0.65, top: 0, backgroundColor:"rgba(0,0,0,0.5)" }} />

      <Animated.View style={{ position:"absolute", top: 80, width, alignItems:"center", opacity: fadeAnim, transform:[{ translateY: slideAnim }] }}>
        <View style={{ width:64, height:64, borderRadius:20, backgroundColor:"rgba(239,68,68,0.2)", borderWidth:1, borderColor:"rgba(239,68,68,0.4)", justifyContent:"center", alignItems:"center", marginBottom:12 }}>
          <Text style={{ fontSize:28 }}>⚡</Text>
        </View>
        <Text style={{ fontSize:32, fontWeight:"700", color:"#fff", letterSpacing:-0.5 }}>CrashGuard</Text>
        <Text style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:4 }}>AI-powered emergency response</Text>
      </Animated.View>

      <KeyboardAvoidingView
  style={{ position: "absolute", bottom: 0, width }}
  behavior={Platform.OS === "ios" ? "padding" : "position"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -200}
>
  <Animated.View style={{
    backgroundColor: t.bgCard,
    borderRadius: 28,
    borderTopWidth: 0.5,
    borderColor: t.border,
    padding: 24,
    paddingBottom: 40,
    opacity: fadeAnim,
  }}>
    <View style={{ width:36, height:4, backgroundColor: t.border2, borderRadius:2, alignSelf:"center", marginBottom:20 }} />
    <Text style={{ fontSize:22, fontWeight:"700", color: t.text, marginBottom:4, letterSpacing:-0.3 }}>Welcome back</Text>
    <Text style={{ fontSize:13, color: t.textMuted, marginBottom:24 }}>Sign in to stay protected</Text>

          <View style={{ flexDirection:"row", alignItems:"center", backgroundColor: t.inputBg, borderWidth:0.5, borderColor: t.border, borderRadius:14, paddingHorizontal:14, marginBottom:12 }}>
            <Text style={{ fontSize:15, marginRight:10, opacity:0.6 }}>✉️</Text>
            <TextInput style={{ flex:1, paddingVertical:14, fontSize:15, color: t.text }} placeholder="Email address" placeholderTextColor={t.textDim} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>

          <View style={{ flexDirection:"row", alignItems:"center", backgroundColor: t.inputBg, borderWidth:0.5, borderColor: t.border, borderRadius:14, paddingHorizontal:14, marginBottom:16 }}>
            <Text style={{ fontSize:15, marginRight:10, opacity:0.6 }}>🔒</Text>
            <TextInput style={{ flex:1, paddingVertical:14, fontSize:15, color: t.text }} placeholder="Password" placeholderTextColor={t.textDim} value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Text style={{ fontSize:12, color:"#ef4444", fontWeight:"600" }}>{showPass ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ backgroundColor:"#ef4444", borderRadius:14, paddingVertical:16, alignItems:"center", opacity: loading ? 0.5 : 1 }} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff", fontSize:16, fontWeight:"700" }}>Sign in  →</Text>}
          </TouchableOpacity>

          <View style={{ flexDirection:"row", justifyContent:"center", marginTop:20 }}>
            <Text style={{ fontSize:13, color: t.textMuted }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={{ fontSize:13, color:"#ef4444", fontWeight:"600" }}>Create one</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
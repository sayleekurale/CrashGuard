// screens/RoleScreen.js — THEMED
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function RoleScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const confirm = async () => {
    if (!selected) { Alert.alert("Select a role first"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { role: selected });
      navigation.replace(selected === "user" ? "UserHome" : "ResponderHome");
    } catch (e) { Alert.alert("Error", e.message); }
    setLoading(false);
  };

  const roles = [
    { id:"user",      icon:"shield-checkmark", lib:"Ionicons",         title:"Regular User",  desc:"App monitors for crashes and alerts on your behalf", color:"#ef4444" },
    { id:"responder", icon:"ambulance",         lib:"MaterialCommunity", title:"Responder",     desc:"Receive crash alerts as ambulance, hospital or police", color:"#6366f1" },
  ];

  return (
    <View style={{ flex:1, backgroundColor: t.bg, paddingHorizontal:24, paddingTop:80 }}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />
      <Text style={{ fontSize:28, fontWeight:"700", color: t.text, marginBottom:8, letterSpacing:-0.5 }}>Who are you?</Text>
      <Text style={{ fontSize:14, color: t.textMuted, marginBottom:36, lineHeight:22 }}>This sets which features you see. You can change this later.</Text>

      {roles.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={{ flexDirection:"row", alignItems:"center", backgroundColor: t.bgCard, borderRadius:20, padding:20, marginBottom:14, borderWidth:1.5, borderColor: selected===r.id ? r.color : t.border, gap:14 }}
          onPress={() => setSelected(r.id)}
          activeOpacity={0.8}
        >
          <View style={{ width:48, height:48, borderRadius:15, backgroundColor: selected===r.id ? r.color+"20" : t.bgCard2, justifyContent:"center", alignItems:"center" }}>
            {r.lib === "Ionicons"
              ? <Ionicons name={r.icon} size={22} color={selected===r.id ? r.color : t.textMuted} />
              : <MaterialCommunityIcons name={r.icon} size={22} color={selected===r.id ? r.color : t.textMuted} />
            }
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:16, fontWeight:"600", color: t.text, marginBottom:4 }}>{r.title}</Text>
            <Text style={{ fontSize:12, color: t.textMuted, lineHeight:18 }}>{r.desc}</Text>
          </View>
          {selected===r.id && (
            <View style={{ width:24, height:24, borderRadius:12, backgroundColor: r.color, justifyContent:"center", alignItems:"center" }}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={{ backgroundColor: selected ? "#ef4444" : t.border, borderRadius:14, paddingVertical:16, alignItems:"center", marginTop:12, opacity: (!selected||loading) ? 0.5 : 1 }}
        onPress={confirm} disabled={!selected||loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff", fontSize:16, fontWeight:"700" }}>Continue  →</Text>}
      </TouchableOpacity>
    </View>
  );
}
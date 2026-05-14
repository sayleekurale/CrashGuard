// screens/HistoryScreen.js — THEMED
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function HistoryScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q    = query(collection(db,"alerts"), where("userId","==",auth.currentUser?.uid), orderBy("createdAt","desc"));
        const snap = await getDocs(q);
        setAlerts(snap.docs.map((d) => ({ id:d.id, ...d.data() })));
      } catch(e) { console.log(e.message); }
      setLoading(false);
    };
    fetch();
  }, []);

  const sevColor = { severe:"#ef4444", moderate:"#f97316", minor:"#f59e0b" };
  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

  const renderItem = ({ item }) => (
    <View style={{ backgroundColor: t.bgCard, borderRadius:16, padding:16, marginBottom:10, borderWidth:0.5, borderColor: t.border }}>
      <View style={{ flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 }}>
        <View style={{ width:8, height:8, borderRadius:4, backgroundColor: sevColor[item.severity]||"#888" }} />
        <Text style={{ fontSize:11, fontWeight:"700", color: sevColor[item.severity]||"#888", flex:1, letterSpacing:0.5 }}>{(item.severity||"").toUpperCase()}</Text>
        <Text style={{ fontSize:11, color: t.textMuted }}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginBottom:5 }}>
        <Ionicons name="location-outline" size={13} color={t.textMuted} />
        <Text style={{ fontSize:12, color: t.textMuted }}>{item.location?.lat?.toFixed(4)}, {item.location?.lng?.toFixed(4)}</Text>
      </View>
      <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginBottom:8 }}>
        <MaterialCommunityIcons name="lightning-bolt" size={13} color={t.textMuted} />
        <Text style={{ fontSize:12, color: t.textMuted }}>{item.gForce!=="manual" ? `${item.gForce}G impact` : "Manual SOS"}</Text>
      </View>
      <View style={{ alignSelf:"flex-start", backgroundColor: item.status==="resolved" ? t.greenBg : t.bgCard2, borderRadius:6, paddingHorizontal:10, paddingVertical:4 }}>
        <Text style={{ fontSize:10, fontWeight:"700", letterSpacing:0.5, color: item.status==="resolved" ? t.green : t.textMuted }}>{(item.status||"").toUpperCase()}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex:1, backgroundColor: t.bg }}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />
      <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:20, paddingTop:54, paddingBottom:16, borderBottomWidth:0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontSize:18, fontWeight:"700", color: t.text }}>Alert History</Text>
        <Text style={{ fontSize:13, color: t.textMuted }}>{alerts.length} total</Text>
      </View>

      {loading ? (
        <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
          <Text style={{ color: t.textMuted }}>Loading...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={{ flex:1, alignItems:"center", justifyContent:"center", gap:10 }}>
          <MaterialCommunityIcons name="history" size={48} color={t.border2} />
          <Text style={{ fontSize:18, fontWeight:"700", color: t.text }}>No alerts yet</Text>
          <Text style={{ fontSize:13, color: t.textMuted }}>Your alert history appears here</Text>
        </View>
      ) : (
        <FlatList data={alerts} keyExtractor={(i)=>i.id} renderItem={renderItem} contentContainerStyle={{ padding:16 }} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}
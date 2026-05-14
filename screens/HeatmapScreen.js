// screens/HeatmapScreen.js — THEMED
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";

const darkMap = [
  { elementType:"geometry",         stylers:[{ color:"#212121" }] },
  { elementType:"labels.text.fill", stylers:[{ color:"#757575" }] },
  { featureType:"road",             elementType:"geometry", stylers:[{ color:"#383838" }] },
  { featureType:"water",            elementType:"geometry", stylers:[{ color:"#000000" }] },
  { featureType:"poi",              stylers:[{ visibility:"off" }] },
];

export default function HeatmapScreen({ navigation }) {
  const { theme: t, isDark } = useTheme();
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    getDocs(query(collection(db,"alerts"), orderBy("createdAt","desc"))).then((snap) => {
      setAlerts(snap.docs.map((d)=>({ id:d.id, ...d.data() })).filter((a)=>a.location?.lat&&a.location?.lng));
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const filtered = filter==="all" ? alerts : alerts.filter((a)=>a.severity===filter);
  const sevStyle = { severe:{color:"#ef4444",radius:120}, moderate:{color:"#f97316",radius:90}, minor:{color:"#f59e0b",radius:60} };
  const stats = { total:alerts.length, severe:alerts.filter(a=>a.severity==="severe").length, moderate:alerts.filter(a=>a.severity==="moderate").length, minor:alerts.filter(a=>a.severity==="minor").length };
  const center = alerts[0]?.location ? { latitude:alerts[0].location.lat, longitude:alerts[0].location.lng } : { latitude:18.5204, longitude:73.8567 };

  return (
    <View style={{ flex:1, backgroundColor: t.bg }}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.bg} />

      <View style={{ paddingHorizontal:20, paddingTop:54, paddingBottom:12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom:10 }}>
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontSize:22, fontWeight:"700", color: t.text, letterSpacing:-0.3 }}>Accident Heatmap</Text>
        <Text style={{ fontSize:12, color: t.textMuted, marginTop:2 }}>All crash locations</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection:"row", marginHorizontal:16, backgroundColor: t.bgCard, borderRadius:14, padding:14, marginBottom:10, borderWidth:0.5, borderColor: t.border }}>
        {[["total","Total",t.text],["severe","Severe","#ef4444"],["moderate","Moderate","#f97316"],["minor","Minor","#f59e0b"]].map(([key,label,color],i)=>(
          <React.Fragment key={key}>
            {i>0 && <View style={{ width:0.5, backgroundColor: t.border, marginVertical:4 }} />}
            <View style={{ flex:1, alignItems:"center" }}>
              <Text style={{ fontSize:22, fontWeight:"700", color }}>{stats[key]}</Text>
              <Text style={{ fontSize:10, color: t.textMuted, marginTop:2 }}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight:44, marginBottom:10 }} contentContainerStyle={{ paddingHorizontal:16, gap:8 }}>
        {["all","severe","moderate","minor"].map((f)=>(
          <TouchableOpacity key={f} style={{ paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor: filter===f ? "#ef4444" : t.bgCard, borderWidth:0.5, borderColor: filter===f ? "#ef4444" : t.border }} onPress={()=>setFilter(f)}>
            <Text style={{ fontSize:13, color: filter===f ? "#fff" : t.textMuted, fontWeight:"600" }}>{f.charAt(0).toUpperCase()+f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
          <Text style={{ color: t.textMuted }}>Loading crash data...</Text>
        </View>
      ) : (
        <MapView
          style={{ flex:1 }}
          initialRegion={{ ...center, latitudeDelta:0.05, longitudeDelta:0.05 }}
          customMapStyle={isDark ? darkMap : []}
        >
          {filtered.map((alert) => {
            const sv = sevStyle[alert.severity] || sevStyle.minor;
            return (
              <React.Fragment key={alert.id}>
                <Circle center={{ latitude:alert.location.lat, longitude:alert.location.lng }} radius={sv.radius} fillColor={sv.color+"40"} strokeColor={sv.color+"80"} strokeWidth={1} />
                <Marker coordinate={{ latitude:alert.location.lat, longitude:alert.location.lng }} title={alert.userName||"Unknown"} description={`${(alert.severity||"").toUpperCase()} · ${new Date(alert.createdAt).toLocaleDateString()}`} pinColor={sv.color} />
              </React.Fragment>
            );
          })}
        </MapView>
      )}

      <View style={{ backgroundColor: t.bgCard, paddingHorizontal:20, paddingVertical:12, borderTopWidth:0.5, borderTopColor: t.border }}>
        <Text style={{ fontSize:10, fontWeight:"700", color: t.textMuted, letterSpacing:1, marginBottom:8 }}>LEGEND</Text>
        <View style={{ flexDirection:"row", alignItems:"center", gap:14 }}>
          {[["#ef4444","Severe"],["#f97316","Moderate"],["#f59e0b","Minor"]].map(([color,label])=>(
            <View key={label} style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
              <View style={{ width:10, height:10, borderRadius:5, backgroundColor:color }} />
              <Text style={{ fontSize:12, color: t.textMuted }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
// components/AudioPlayer.js — Uses expo-av (stable)

import React, { useEffect, useRef, useState } from "react";
import {
  TouchableOpacity, Text, StyleSheet,
  View, ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

export default function AudioPlayer({ audioUrl }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const togglePlay = async () => {
    if (playing) {
      try {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      } catch (e) {}
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS:       true,
        allowsRecordingIOS:         false,
        shouldDuckAndroid:          false,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      setPlaying(true);
      setLoading(false);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setPlaying(false);
        }
      });

    } catch (err) {
      console.log("Play error:", err.message);
      setLoading(false);
      setPlaying(false);
    }
  };

  if (!audioUrl) return null;

  return (
    <TouchableOpacity
      style={[s.btn, playing && s.btnPlaying]}
      onPress={togglePlay}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#6366f1" />
      ) : (
        <>
          <View style={[s.iconWrap, { backgroundColor: playing ? "#6366f1" : "#1e1e35" }]}>
            <Ionicons
              name={playing ? "stop" : "play"}
              size={12}
              color="#fff"
            />
          </View>
          <View>
            <Text style={[s.text, playing && s.textPlaying]}>
              {playing ? "Stop audio" : "Play crash audio"}
            </Text>
            <Text style={s.subText}>10s scene recording</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn:         { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#10101a", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 0.5, borderColor: "#2a2a3a", marginTop: 10 },
  btnPlaying:  { borderColor: "#6366f1" },
  iconWrap:    { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  text:        { fontSize: 13, color: "#888", fontWeight: "600" },
  textPlaying: { color: "#6366f1" },
  subText:     { fontSize: 10, color: "#444", marginTop: 2 },
});
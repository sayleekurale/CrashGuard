// services/VoiceSnapshotService.js — Uses expo-av (stable and working)

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://lhebnbamhmpbmbmtqwdh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoZWJuYmFtaG1wYm1ibXRxd2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Mzg1OTAsImV4cCI6MjA5MzExNDU5MH0.yLoR7JnoZaNe2uyrkexuOJWRz9EXLG6mmiO6IYGsf4o"; // ← paste your real key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

let recording = null;

export const startVoiceSnapshot = async () => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Mic permission denied");
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS:         true,
      playsInSilentModeIOS:       true,
      shouldDuckAndroid:          true,
      playThroughEarpieceAndroid: false,
    });

    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = rec;
    console.log("🎙️ Voice snapshot started");
    return true;
  } catch (err) {
    console.log("Start recording error:", err.message);
    return false;
  }
};

export const stopAndUploadSnapshot = async (alertId) => {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording  = null;

    if (!uri) return null;
    console.log("🎙️ Recording stopped, uploading...");

    const fileName = `crash_${alertId}_${Date.now()}.m4a`;
    const formData = new FormData();
    formData.append("file", { uri, name: fileName, type: "audio/m4a" });

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/crash-audio/${fileName}`,
      {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "Content-Type":  "multipart/form-data",
          "x-upsert":      "false",
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      console.log("Upload failed:", err);
      return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/crash-audio/${fileName}`;
    console.log("✅ Voice snapshot URL:", publicUrl);
    return publicUrl;

  } catch (err) {
    console.log("Upload error:", err.message);
    recording = null;
    return null;
  }
};

export const cancelVoiceSnapshot = async () => {
  if (recording) {
    try { await recording.stopAndUnloadAsync(); } catch (e) {}
    recording = null;
  }
};
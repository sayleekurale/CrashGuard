// services/etaService.js
// Calculates ETA when responder accepts alert
// Uses Haversine distance ÷ 40km/h city speed
// No Maps API billing needed

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

const CITY_SPEED_KMH = 40; // average city ambulance speed

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const calculateAndSaveETA = async ({
  alertId,
  responderLat, responderLng,
  victimLat, victimLng,
}) => {
  try {
    const dist    = distanceKm(responderLat, responderLng, victimLat, victimLng);
    const minutes = Math.max(1, Math.ceil((dist / CITY_SPEED_KMH) * 60));

    await updateDoc(doc(db, "alerts", alertId), {
      etaMinutes:  minutes,
      etaDistance: dist.toFixed(1),
      etaUpdatedAt: new Date().toISOString(),
    });

    console.log(`ETA calculated: ${minutes} mins (${dist.toFixed(1)} km)`);
    return minutes;
  } catch (e) {
    console.log("ETA error:", e.message);
    return null;
  }
};
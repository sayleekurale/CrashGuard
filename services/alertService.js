// services/alertService.js — FIXED
// Removes responderId from initial save so Accept button always shows

import {
  collection, addDoc, getDocs,
  query, where, doc, getDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

export const BACKEND_URL = "https://crashguard-backend-ecq8.onrender.com";

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

export const sendCrashAlert = async ({ location, severity, gForce }) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  // Get user profile
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const userName    = userData.name        || "CrashGuard User";
  const familyPhone = userData.familyPhone || null;

  // Find nearest responder
  const respSnap = await getDocs(
    query(
      collection(db, "users"),
      where("role",   "==", "responder"),
      where("status", "==", "available")
    )
  );

  let nearest = null;
  let minDist = Infinity;

  respSnap.forEach((d) => {
    const r = d.data();
    // Only use distance if responder has valid location
    if (r.location?.lat && r.location?.lng) {
      const dist = distanceKm(
        location.lat, location.lng,
        r.location.lat, r.location.lng
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = { id: d.id, ...r };
      }
    }
  });

  // If no responder has location, pick first available
  // but DON'T assign them — let them Accept manually
  let fcmToken = null;
  if (nearest) {
    fcmToken = nearest.fcmToken || null;
    console.log(`Nearest responder: ${nearest.name || nearest.email} (${minDist.toFixed(1)}km)`);
  } else if (respSnap.docs.length > 0) {
    // Has responders but no location — get their FCM token for notification
    fcmToken = respSnap.docs[0].data().fcmToken || null;
    console.log("Responders found but no location data");
  }

  // Save alert — NO responderId so ALL responders see Accept button
  const alertRef = await addDoc(collection(db, "alerts"), {
    userId:       user.uid,
    userName:     userName,
    userEmail:    user.email,
    familyPhone:  familyPhone,
    location:     location,
    severity:     severity,
    gForce:       gForce,
    status:       "active",
    responderId:  null,   // ← always null on creation
    responderName:null,   // ← always null on creation
    createdAt:    new Date().toISOString(),
  });

  console.log("Alert saved:", alertRef.id);

  // Call backend for SMS + FCM
  fetch(`${BACKEND_URL}/crash-alert`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alertId:           alertRef.id,
      severity,
      gForce:            String(gForce),
      location,
      userName,
      familyPhone,
      responderFcmToken: fcmToken,
    }),
  })
    .then((r) => r.json())
    .then((res) => console.log("Backend result:", JSON.stringify(res.results)))
    .catch((e) => console.log("Backend call failed:", e.message));

  return alertRef.id;
};
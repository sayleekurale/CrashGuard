// services/BackgroundDetection.js
// Uses expo-location foreground service to keep process alive
// Then runs accelerometer alongside it

import * as TaskManager   from "expo-task-manager";
import * as Location      from "expo-location";
import * as Notifications from "expo-notifications";
import { Accelerometer }  from "expo-sensors";
import { addReading }     from "./CrashDataBuffer";

export const CRASH_DETECTION_TASK = "CRASHGUARD_CRASH_DETECTION";
export const LOCATION_TASK        = "CRASHGUARD_LOCATION_TASK";

const G_THRESHOLD    = 2.5;
const CRASH_DURATION = 300;
const SAMPLE_MS      = 100;

let accelSub   = null;
let spikeStart = null;
let onCrashCb  = null;
let isRunning  = false;

// ── Define location background task ──────────────────────
// This keeps the process alive in background
TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) { console.log("Location task error:", error); return; }
  // Location updates keep our process alive
  // Accelerometer detection runs in the same process
  console.log("Background location tick — detection active");
});

// ── Define crash detection task ───────────────────────────
TaskManager.defineTask(CRASH_DETECTION_TASK, async ({ data, error }) => {
  if (error) console.log("Crash task error:", error);
});

// ── Show crash notification ───────────────────────────────
const showCrashNotification = async (severity, gForce) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `CRASH DETECTED — ${(severity || "").toUpperCase()}`,
        body:  `${gForce}G impact detected. Open CrashGuard — alert fires in 30 seconds!`,
        data:  { type: "CRASH_DETECTED", severity, gForce },
        sound: "default",
        priority: "max",
      },
      trigger: null,
    });
  } catch (e) {
    console.log("Crash notification error:", e.message);
  }
};

// ── Show monitoring notification ──────────────────────────
const showMonitoringNotification = async () => {
  try {
    await Notifications.setNotificationChannelAsync("crashguard_monitoring", {
      name:       "CrashGuard Monitoring",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound:      null,
    });
    await Notifications.scheduleNotificationAsync({
      identifier: "crashguard_monitoring",
      content: {
        title:       "CrashGuard — Monitoring Active",
        body:        "Crash detection is running in the background",
        data:        { type: "monitoring" },
        autoDismiss: false,
        sticky:      true,
        sound:       null,
      },
      trigger: null,
    });
  } catch (e) {
    console.log("Monitoring notification error:", e.message);
  }
};

const hideMonitoringNotification = async () => {
  try {
    await Notifications.dismissNotificationAsync("crashguard_monitoring");
  } catch (e) {}
};

// ── Start background detection ────────────────────────────
export const startBackgroundDetection = async (onCrash) => {
  if (isRunning) return;
  isRunning = true;
  onCrashCb = onCrash;
  spikeStart = null;

  // Request notification permission
  const { status: notifStatus } = await Notifications.requestPermissionsAsync();
  console.log("Notification permission:", notifStatus);

  // Request background location permission (keeps process alive)
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus === "granted") {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus === "granted") {
      // Start location task — this is what keeps Android from killing the process
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
      if (!isRegistered) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy:               Location.Accuracy.Balanced,
          timeInterval:           10000,  // every 10 seconds
          distanceInterval:       0,
          foregroundService: {
            notificationTitle:   "CrashGuard Active",
            notificationBody:    "Monitoring for crashes in background",
            notificationColor:   "#ef4444",
          },
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
        });
        console.log("Location foreground service started");
      }
    }
  }

  // Show monitoring notification
  await showMonitoringNotification();

  // Start accelerometer
  Accelerometer.setUpdateInterval(SAMPLE_MS);
  accelSub = Accelerometer.addListener(({ x, y, z }) => {
    const g = Math.sqrt(x * x + y * y + z * z);
    addReading(g);

    if (g > G_THRESHOLD) {
      if (!spikeStart) {
        spikeStart = Date.now();
      } else if (Date.now() - spikeStart >= CRASH_DURATION) {
        const severity = g >= 6.0 ? "severe" : g >= 4.0 ? "moderate" : "minor";

        // Stop detection to prevent double trigger
        stopBackgroundDetection();

        // Show notification (works even when app is closed)
        showCrashNotification(severity, g.toFixed(2));

        // Call callback if app is in foreground
        if (onCrashCb) {
          onCrashCb({ gForce: g.toFixed(2), severity });
        }
      }
    } else {
      spikeStart = null;
    }
  });

  console.log("CrashGuard background detection started");
};

// ── Stop background detection ─────────────────────────────
export const stopBackgroundDetection = async () => {
  if (accelSub) {
    accelSub.remove();
    accelSub = null;
  }
  isRunning  = false;
  spikeStart = null;

  // Stop location task
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (e) {}

  await hideMonitoringNotification();
  console.log("CrashGuard detection stopped");
};

export const restartBackgroundDetection = (onCrash) => {
  stopBackgroundDetection().then(() => {
    setTimeout(() => startBackgroundDetection(onCrash), 2000);
  });
};

export const isDetectionRunning = () => isRunning;
// services/NotificationService.js
// Registers device for FCM push notifications
// Call registerForNotifications() after user logs in

import * as Notifications from "expo-notifications";
import * as Device        from "expo-device";
import { Platform }       from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db }       from "../config/firebaseConfig";

// Show notification banner even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export const registerForNotifications = async () => {
  // Only works on real devices
  if (!Device.isDevice) {
    console.log("Push notifications need a real device");
    return null;
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Notification permission denied");
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("crashguard_alerts", {
      name:             "CrashGuard Alerts",
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       "#6366f1",
      sound:            "default",
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  console.log("FCM token:", token);

  // Save to Firestore
  const user = auth.currentUser;
  if (user && token) {
    await updateDoc(doc(db, "users", user.uid), {
      fcmToken: token,
      platform: Platform.OS,
    });
    console.log("FCM token saved to Firestore");
  }

  return token;
};

// Listen for notifications when app is open
export const addNotificationListener = (onNotification) => {
  const sub = Notifications.addNotificationReceivedListener(onNotification);
  return () => sub.remove();
};

// Listen for notification taps
export const addNotificationTapListener = (onTap) => {
  const sub = Notifications.addNotificationResponseReceivedListener(
    (response) => onTap(response.notification.request.content.data)
  );
  return () => sub.remove();
};
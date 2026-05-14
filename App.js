// App.js — Final version with font loading + all screens

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "./config/firebaseConfig";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// Screens
import LoginScreen            from "./screens/LoginScreen";
import RegisterScreen         from "./screens/RegisterScreen";
import RoleScreen             from "./screens/RoleScreen";
import UserHome               from "./screens/UserHome";
import ResponderHome          from "./screens/ResponderHome";
import CountdownScreen        from "./screens/CountdownScreen";
import AlertSentScreen        from "./screens/AlertSentScreen";
import ConsciousnessScreen    from "./screens/ConsciousnessScreen";
import HeatmapScreen          from "./screens/HeatmapScreen";
import HistoryScreen          from "./screens/HistoryScreen";
import ProfileScreen          from "./screens/ProfileScreen";
import ResponderProfileScreen from "./screens/ResponderProfileScreen";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme: t } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const [fontsLoaded,  setFontsLoaded]  = useState(false);

  // Load vector icon fonts
  useEffect(() => {
    Font.loadAsync({
      ...Ionicons.font,
      ...MaterialCommunityIcons.font,
    }).then(() => {
      setFontsLoaded(true);
    }).catch((e) => {
      console.log("Font load error:", e);
      setFontsLoaded(true); // continue even if fonts fail
    });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const role = snap.data().role;
            if (role === "user")           setInitialRoute("UserHome");
            else if (role === "responder") setInitialRoute("ResponderHome");
            else                           setInitialRoute("RoleScreen");
          } else {
            setInitialRoute("RoleScreen");
          }
        } catch (e) { setInitialRoute("Login"); }
      } else {
        setInitialRoute("Login");
      }
    });
    return unsub;
  }, []);

  if (!initialRoute || !fontsLoaded) {
    return (
      <View style={[styles.loader, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="Login"             component={LoginScreen} />
        <Stack.Screen name="Register"          component={RegisterScreen} />
        <Stack.Screen name="RoleScreen"        component={RoleScreen} />
        <Stack.Screen name="UserHome"          component={UserHome} />
        <Stack.Screen name="ResponderHome"     component={ResponderHome} />
        <Stack.Screen name="Countdown"         component={CountdownScreen} />
        <Stack.Screen name="AlertSent"         component={AlertSentScreen} />
        <Stack.Screen name="ConsciousnessCheck" component={ConsciousnessScreen} />
        <Stack.Screen name="Heatmap"           component={HeatmapScreen} />
        <Stack.Screen name="History"           component={HistoryScreen} />
        <Stack.Screen name="Profile"           component={ProfileScreen} />
        <Stack.Screen name="ResponderProfile"  component={ResponderProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
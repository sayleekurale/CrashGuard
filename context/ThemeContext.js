// context/ThemeContext.js
// Global theme system — dark/light mode across entire app
// Persisted to AsyncStorage so it remembers after app restart

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Color tokens ──────────────────────────────────────────────
const darkTheme = {
  dark: true,
  bg:           "#080810",
  bgCard:       "#10101a",
  bgCard2:      "#0d0d18",
  border:       "#1e1e2e",
  border2:      "#2a2a3a",
  text:         "#f0f0ff",
  textSub:      "#888",
  textMuted:    "#555",
  textDim:      "#333",
  accent:       "#ef4444",
  accentSub:    "rgba(239,68,68,0.1)",
  accentBorder: "rgba(239,68,68,0.25)",
  indigo:       "#6366f1",
  indigoBg:     "rgba(99,102,241,0.1)",
  green:        "#22c55e",
  greenBg:      "rgba(34,197,94,0.1)",
  orange:       "#f97316",
  amber:        "#f59e0b",
  heroOverlay:  "rgba(0,0,0,0.55)",
  tabBar:       "#080810",
  tabBarBorder: "#1a1a28",
  statusBar:    "light-content",
  inputBg:      "#080810",
};

const lightTheme = {
  dark: false,
  bg:           "#f5f5f7",
  bgCard:       "#ffffff",
  bgCard2:      "#f0f0f5",
  border:       "#e5e5ea",
  border2:      "#d1d1d6",
  text:         "#1c1c1e",
  textSub:      "#636366",
  textMuted:    "#8e8e93",
  textDim:      "#c7c7cc",
  accent:       "#ef4444",
  accentSub:    "rgba(239,68,68,0.08)",
  accentBorder: "rgba(239,68,68,0.2)",
  indigo:       "#6366f1",
  indigoBg:     "rgba(99,102,241,0.08)",
  green:        "#22c55e",
  greenBg:      "rgba(34,197,94,0.08)",
  orange:       "#f97316",
  amber:        "#f59e0b",
  heroOverlay:  "rgba(0,0,0,0.35)",
  tabBar:       "#ffffff",
  tabBarBorder: "#e5e5ea",
  statusBar:    "dark-content",
  inputBg:      "#f5f5f7",
};

const ThemeContext = createContext({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Load saved preference
    AsyncStorage.getItem("crashguard_theme").then((val) => {
      if (val === "light") setIsDark(false);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem("crashguard_theme", next ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: isDark ? darkTheme : lightTheme,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Hook — use this in every screen
export const useTheme = () => useContext(ThemeContext);
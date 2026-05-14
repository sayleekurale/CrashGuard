// index.js — Root entry point
// Background task MUST be registered here before anything else

import { registerRootComponent } from "expo";

// Register background task at root level — required by expo-task-manager
import "./services/BackgroundDetection";

import App from "./App";
registerRootComponent(App);
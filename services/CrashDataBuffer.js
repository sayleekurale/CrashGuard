// services/CrashDataBuffer.js
// Keeps a rolling 10-second buffer of G-force readings
// When crash fires, we have the full replay data ready

const BUFFER_SIZE = 100; // 10 seconds at 100ms intervals
let buffer = [];

export const addReading = (gForce) => {
  buffer.push(parseFloat(gForce.toFixed(2)));
  if (buffer.length > BUFFER_SIZE) buffer.shift(); // keep last 100 readings
};

export const getBuffer = () => [...buffer]; // return a copy

export const clearBuffer = () => { buffer = []; };
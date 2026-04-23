// routes/sensors.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { data } = require("../state");

const DATA_DIR = path.join(__dirname, "..", "data");
const CSV_FILE = path.join(DATA_DIR, "temp_humid_training_data.csv");

// Get sensor data for React
router.get("/sensors", (req, res) => {
  const userId = req.query.userId;
  if (userId && data.sensors[userId]) {
    return res.json(data.sensors[userId]);
  }
  res.json(data.sensors["1"]);
});

// ESP32 Hardware Data Receiver
router.post("/sensors/update", (req, res) => {
  const { temperature, humidity } = req.body;
  
  const now = new Date();
  const timestamp = now.getFullYear() + "/" +
    String(now.getMonth() + 1).padStart(2, "0") + "/" +
    String(now.getDate()).padStart(2, "0") + " " +
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0") + ":" +
    String(now.getSeconds()).padStart(2, "0");
  
  console.log(`[${timestamp}] [ESP32] Temp: ${temperature}, Hum: ${humidity}`);
  
  const row = `${timestamp},${temperature},${humidity}\n`;
  fs.appendFile(CSV_FILE, row, (err) => {
    if (err) console.error("[Backend] Failed to save sensor data:", err);
  });

  res.json({ status: "success", message: "Data received and stored" });
});

module.exports = router;    
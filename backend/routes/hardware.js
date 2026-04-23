// routes/hardware.js
const express = require("express");
const router = express.Router();
const { devices } = require("../state");

// Get all devices
router.get("/devices", (req, res) => {
  const userId = req.query.userId;
  if (userId) {
    return res.json(devices.filter((d) => d.userId === parseInt(userId)));
  }
  res.json(devices);
});

// THE MASTER WEB ADAPTER
router.post("/devices/:id/update", (req, res) => {
  const id = parseInt(req.params.id);
  const device = devices.find((d) => d.id === id);

  if (!device) {
    return res.status(404).json({ message: "Không tìm thấy thiết bị" });
  }

  const { status, value, swing, sleep } = req.body;
  if (status !== undefined) device.status = status;
  if (value !== undefined) device.value = value;
  if (swing !== undefined) device.swing = swing;
  if (sleep !== undefined) device.sleep = sleep;

  console.log(`[Web UI] Device ${id} -> Power: ${device.status}, Speed: ${device.value}, Swing: ${device.swing}`);
  res.json(device);
});

// UPGRADED HARDWARE ADAPTER: Python Camera Override
router.post('/fan/state', (req, res) => {
    const { power, speed, swing } = req.body;
    const fanDevice = devices.find(d => d.type === "fan");
    
    if (fanDevice) {
        fanDevice.status = power;
        fanDevice.value = speed;
        fanDevice.swing = swing; 
        console.log(`📹🟢 [CAMERA] Fan updated to Power:${power}, Speed:${speed}, Swing:${swing}`); 
    } else {
        console.log("🔴 CRITICAL BUG: Could not find the fan in the devices array!");
    }

    res.status(200).send({ message: "Hardware state merged successfully" });
});

module.exports = router;
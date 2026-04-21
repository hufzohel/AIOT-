const express = require("express");
const cors = require("cors");
const data = require("./data_raw.json");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let devices = JSON.parse(JSON.stringify(data.devices));
let systemLogs = JSON.parse(JSON.stringify(data.systemLogs));

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  const { password: _, ...userInfo } = user;
  res.json({ user: userInfo, token: `mock-token-${user.id}` });
});

app.get("/api/sensors", (req, res) => {
  const userId = req.query.userId;
  if (userId && data.sensors[userId]) {
    return res.json(data.sensors[userId]);
  }
  res.json(data.sensors["1"]);
});

app.get("/api/devices", (req, res) => {
  const userId = req.query.userId;
  if (userId) {
    return res.json(devices.filter((d) => d.userId === parseInt(userId)));
  }
  res.json(devices);
});

// THE MASTER WEB ADAPTER: Handles Power, Speed, and Swing in one route!
app.post("/api/devices/:id/update", (req, res) => {
  const id = parseInt(req.params.id);
  const device = devices.find((d) => d.id === id);

  if (!device) {
    return res.status(404).json({ message: "Không tìm thấy thiết bị" });
  }

  // Extract EVERYTHING the React app might send
  const { status, value, swing, sleep } = req.body;

  // Update only the variables that were actually included in the request
  if (status !== undefined) device.status = status;
  if (value !== undefined) device.value = value;
  if (swing !== undefined) device.swing = swing;
  if (sleep !== undefined) device.sleep = sleep;

  console.log(`Web Update Device ${id} -> Power: ${device.status}, Speed: ${device.value}, Swing: ${device.swing}, Sleep: ${device.sleep}`);

  res.json(device);
});


// UPGRADED HARDWARE ADAPTER: Python uses this to push physical gestures to the web
app.post('/api/fan/state', (req, res) => {
    // 1. Extract the exact payload sent by gesture_fan_control.py
    const { power, speed, swing } = req.body;
    
    // 2. Find the fan in the master database array
    const fanDevice = devices.find(d => d.type === "fan");
    
    if (fanDevice) {
        // 3. Translate Python's variables into the Database's format
        fanDevice.status = power;
        fanDevice.value = speed;
        fanDevice.swing = swing; 
        
        console.log(`📹🟢 CAMERA OVERRIDE: Fan updated to Power:${power}, Speed:${speed}, Swing:${swing}`); 
    } else {
        console.log("🔴 CRITICAL BUG: Could not find the fan in the devices array!");
    }

    res.status(200).send({ message: "Hardware state merged successfully" });
});

// 2. React uses this to READ the state
// app.get('/api/fan/state', (req, res) => {
//     res.status(200).json(currentFanState);
// });

app.get("/api/users", (req, res) => {
  const users = data.users
    .filter((u) => u.role === "USER")
    .map(({ password, ...u }) => {
      const userDevices = devices.filter((d) => d.userId === u.id);
      const activeCount = userDevices.filter((d) => d.status).length;
      return {
        ...u,
        deviceCount: userDevices.length,
        activeDeviceCount: activeCount,
      };
    });
  res.json(users);
});

app.get("/api/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const user = data.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  const { password, ...userInfo } = user;
  res.json(userInfo);
});

app.get("/api/logs", (req, res) => {
  res.json(systemLogs);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



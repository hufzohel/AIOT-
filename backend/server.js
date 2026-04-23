// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// 1. Import Shared State
const { data, devices, systemLogs } = require("./state");

// 2. Import Modular Routers
const hardwareRoutes = require("./routes/hardware");
const sensorRoutes = require("./routes/sensors");

const app = express();
const PORT = 5000;

// 3. Ensure CSV Data Directory Exists
const DATA_DIR = path.join(__dirname, "data");
const CSV_FILE = path.join(DATA_DIR, "temp_humid_training_data.csv");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(CSV_FILE)) fs.writeFileSync(CSV_FILE, "timestamp,temperature,humidity\n");

app.use(cors());
app.use(express.json());

// 4. Mount the Routers
// This means a request to /api/devices will hit hardwareRoutes
app.use("/api", hardwareRoutes);
app.use("/api", sensorRoutes);


// --- CORE ROUTES (Auth & Users) ---
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = data.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  
  const { password: _, ...userInfo } = user;
  res.json({ user: userInfo, token: `mock-token-${user.id}` });
});

app.get("/api/users", (req, res) => {
  const users = data.users
    .filter((u) => u.role === "USER")
    .map(({ password, ...u }) => {
      const userDevices = devices.filter((d) => d.userId === u.id);
      return {
        ...u,
        deviceCount: userDevices.length,
        activeDeviceCount: userDevices.filter((d) => d.status).length,
      };
    });
  res.json(users);
});

app.get("/api/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const user = data.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
  
  const { password, ...userInfo } = user;
  res.json(userInfo);
});

app.get("/api/logs", (req, res) => {
  res.json(systemLogs);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
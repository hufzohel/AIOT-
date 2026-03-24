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

app.post("/api/devices/:id/toggle", (req, res) => {
  const id = parseInt(req.params.id);
  const device = devices.find((d) => d.id === id);

  if (!device) {
    return res.status(404).json({ message: "Không tìm thấy thiết bị" });
  }

  device.status = !device.status;
  if (!device.status) {
    device.value = 0;
  } else {
    if (device.type === "light") device.value = 80;
    if (device.type === "fan") device.value = 3;
    if (device.type === "ac") device.value = 24;
  }

  const newLog = {
    id: systemLogs.length + 1,
    timestamp: new Date().toISOString(),
    user: "User",
    action: `${device.status ? "Bật" : "Tắt"} ${device.name}`,
    level: "info",
  };
  systemLogs.unshift(newLog);

  res.json(device);
});

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

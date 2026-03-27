const express = require("express");
const cors = require("cors");
const data = require("./data_raw.json");

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const users = JSON.parse(JSON.stringify(data.users));
const devices = JSON.parse(JSON.stringify(data.devices));
const systemLogs = JSON.parse(JSON.stringify(data.systemLogs || []));

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function appendLog({ user, action, level = "info" }) {
  const newLog = {
    id: systemLogs.length + 1,
    timestamp: new Date().toISOString(),
    user,
    action,
    level,
  };
  systemLogs.unshift(newLog);
}

function getAllowedDevicesForUser(user) {
  if (!user) return [];

  if (user.role === "ADMIN") return devices;
  if (user.role !== "MEMBER") return [];

  const allowedTypes = user.permissions?.deviceTypes || [];
  const allowedIds = user.permissions?.deviceIds || [];

  return devices.filter(
    (device) =>
      allowedTypes.includes(device.type) || allowedIds.includes(device.id)
  );
}

function buildMemberSummary(user) {
  const allowedDevices = getAllowedDevicesForUser(user);
  const activeCount = allowedDevices.filter((d) => d.power).length;

  return {
    ...sanitizeUser(user),
    deviceCount: allowedDevices.length,
    activeDeviceCount: activeCount,
  };
}

function setDevicePower(device, nextPower) {
  device.power = nextPower;

  if (!nextPower) {
    device.value = 0;
    return;
  }

  if (device.type === "light") device.value = 80;
  if (device.type === "fan") device.value = 3;
  if (device.type === "ac") device.value = 24;
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  appendLog({
    user: user.name,
    action: "Đăng nhập bằng mật khẩu",
    level: "info",
  });

  return res.json({
    user: sanitizeUser(user),
    token: `mock-token-${user.id}`,
  });
});

app.get("/api/sensors", (req, res) => {
  const userId = req.query.userId;
  if (userId && data.sensors[userId]) {
    return res.json(data.sensors[userId]);
  }
  return res.json(data.sensors["1"]);
});

app.get("/api/devices", (req, res) => {
  const userId = req.query.userId;

  if (userId) {
    const targetUser = users.find((u) => u.id === parseInt(userId, 10));
    if (!targetUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    return res.json(getAllowedDevicesForUser(targetUser));
  }

  return res.json(devices);
});

app.post("/api/devices/:id/toggle", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const actorId = req.body?.actorId ? parseInt(req.body.actorId, 10) : null;

  const actor = actorId ? users.find((u) => u.id === actorId) : null;
  const device = devices.find((d) => d.id === id);

  if (!device) {
    return res.status(404).json({ message: "Không tìm thấy thiết bị" });
  }

  if (!device.online) {
    return res.status(400).json({ message: "Thiết bị đang offline, không thể bật/tắt." });
  }

  if (actor && actor.role === "MEMBER") {
    const allowedDevices = getAllowedDevicesForUser(actor);
    const canUse = allowedDevices.some((item) => item.id === id);

    if (!canUse) {
      return res.status(403).json({ message: "Bạn không có quyền điều khiển thiết bị này" });
    }
  }

  const nextPower = !device.power;
  setDevicePower(device, nextPower);

  appendLog({
    user: actor?.name || "System",
    action: `${nextPower ? "Bật" : "Tắt"} ${device.name}`,
    level: "info",
  });

  return res.json(device);
});

app.post("/api/devices/bulk-power", (req, res) => {
  const actorId = req.body?.actorId ? parseInt(req.body.actorId, 10) : null;
  const power = Boolean(req.body?.power);

  const actor = actorId ? users.find((u) => u.id === actorId) : null;
  if (!actor || actor.role !== "ADMIN") {
    return res.status(403).json({ message: "Chỉ ADMIN mới được phép điều khiển tất cả thiết bị." });
  }

  devices.forEach((device) => {
    if (device.online) {
      setDevicePower(device, power);
    }
  });

  appendLog({
    user: actor.name,
    action: `${power ? "Bật" : "Tắt"} toàn bộ thiết bị online`,
    level: "info",
  });

  return res.json({ devices });
});

app.get("/api/users", (req, res) => {
  const members = users.filter((u) => u.role === "MEMBER").map(buildMemberSummary);
  return res.json(members);
});

app.get("/api/users/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  if (user.role === "MEMBER") {
    return res.json(buildMemberSummary(user));
  }

  return res.json(sanitizeUser(user));
});

app.patch("/api/users/:id/permissions", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  if (user.role !== "MEMBER") {
    return res.status(400).json({ message: "Chỉ có thể phân quyền cho tài khoản MEMBER" });
  }

  const rawDeviceTypes = Array.isArray(req.body?.deviceTypes) ? req.body.deviceTypes : [];
  const rawDeviceIds = Array.isArray(req.body?.deviceIds) ? req.body.deviceIds : [];

  const validTypes = [...new Set(devices.map((device) => device.type))];
  const deviceTypes = [...new Set(rawDeviceTypes)].filter((type) => validTypes.includes(type));

  const validDeviceIds = new Set(devices.map((device) => device.id));
  const deviceIds = [...new Set(rawDeviceIds.map(Number))].filter((idValue) =>
    validDeviceIds.has(idValue)
  );

  user.permissions = { deviceTypes, deviceIds };

  appendLog({
    user: "Admin",
    action: `Cập nhật phân quyền cho ${user.name}`,
    level: "success",
  });

  return res.json({
    message: "Phân quyền thành công",
    user: buildMemberSummary(user),
  });
});

app.get("/api/logs", (req, res) => {
  return res.json(systemLogs);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
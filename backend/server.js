const express = require("express");
const cors = require("cors");
const seed = require("./data_raw.json");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const clone = (value) => JSON.parse(JSON.stringify(value));

let users = seed.users.map((user) => ({
  ...user,
  role: user.role === "USER" ? "MEMBER" : user.role,
  faceAuthEnabled: Boolean(user.faceAuthEnabled),
  faceEmbedding: Array.isArray(user.faceEmbedding) ? user.faceEmbedding : null,
  faceRegisteredAt: user.faceRegisteredAt || null,
}));
let devices = clone(seed.devices).map((device) => ({
  ...device,
  online: typeof device.online === "boolean" ? device.online : true,
  power: typeof device.power === "boolean" ? device.power : Boolean(device.status),
}));
let systemLogs = clone(seed.systemLogs);

const getSafeUser = (user) => {
  const { password, faceEmbedding, ...safeUser } = user;
  return safeUser;
};

const getDefaultRoute = (user) => (user.role === "ADMIN" ? "/users" : "/dashboard");

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => Number((value / magnitude).toFixed(8)));
};

const averageEmbeddings = (embeddings) => {
  if (!Array.isArray(embeddings) || embeddings.length === 0) return null;
  const dimension = embeddings[0].length;
  const avg = new Array(dimension).fill(0);

  embeddings.forEach((embedding) => {
    if (!Array.isArray(embedding) || embedding.length !== dimension) {
      throw new Error("Embedding không hợp lệ");
    }
    embedding.forEach((value, index) => {
      avg[index] += Number(value || 0);
    });
  });

  return normalizeVector(avg.map((value) => value / embeddings.length));
};

const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const createLog = (userName, action, level = "info") => {
  const entry = {
    id: systemLogs.length + 1,
    timestamp: new Date().toISOString(),
    user: userName,
    action,
    level,
  };
  systemLogs.unshift(entry);
};

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((candidate) => candidate.email === email && candidate.password === password);

  if (!user) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  }

  const safeUser = getSafeUser(user);
  createLog(user.name, "Đăng nhập bằng mật khẩu");
  return res.json({
    user: { ...safeUser, defaultRoute: getDefaultRoute(safeUser) },
    token: `mock-token-${user.id}`,
  });
});

app.get("/api/me", (req, res) => {
  const userId = Number(req.query.userId);
  const user = users.find((candidate) => candidate.id === userId);
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  return res.json({ ...getSafeUser(user), defaultRoute: getDefaultRoute(user) });
});

app.post("/api/face/register", (req, res) => {
  const { userId, embeddings } = req.body;
  const user = users.find((candidate) => candidate.id === Number(userId));
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  if (!Array.isArray(embeddings) || embeddings.length < 5) {
    return res.status(400).json({ message: "Cần đủ 5 ảnh mẫu để đăng ký khuôn mặt" });
  }

  try {
    user.faceEmbedding = averageEmbeddings(embeddings);
    user.faceAuthEnabled = true;
    user.faceRegisteredAt = new Date().toISOString();
    createLog(user.name, "Đăng ký khuôn mặt trong hồ sơ");
    return res.json({
      message: "Đăng ký khuôn mặt thành công",
      user: { ...getSafeUser(user), defaultRoute: getDefaultRoute(user) },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Không thể xử lý ảnh khuôn mặt" });
  }
});

app.post("/api/face/update", (req, res) => {
  const { userId, embeddings } = req.body;
  const user = users.find((candidate) => candidate.id === Number(userId));
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  if (!Array.isArray(embeddings) || embeddings.length < 5) {
    return res.status(400).json({ message: "Cần đủ 5 ảnh mẫu để cập nhật khuôn mặt" });
  }

  try {
    user.faceEmbedding = averageEmbeddings(embeddings);
    user.faceAuthEnabled = true;
    user.faceRegisteredAt = new Date().toISOString();
    createLog(user.name, "Cập nhật khuôn mặt trong hồ sơ");
    return res.json({
      message: "Cập nhật khuôn mặt thành công",
      user: { ...getSafeUser(user), defaultRoute: getDefaultRoute(user) },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Không thể cập nhật khuôn mặt" });
  }
});

app.post("/api/face/disable", (req, res) => {
  const { userId } = req.body;
  const user = users.find((candidate) => candidate.id === Number(userId));
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  user.faceAuthEnabled = false;
  user.faceEmbedding = null;
  user.faceRegisteredAt = null;
  createLog(user.name, "Tắt đăng nhập bằng khuôn mặt");
  return res.json({
    message: "Đã tắt đăng nhập bằng khuôn mặt",
    user: { ...getSafeUser(user), defaultRoute: getDefaultRoute(user) },
  });
});

app.post("/api/face/login", (req, res) => {
  const { embedding } = req.body;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return res.status(400).json({ message: "Không nhận được dữ liệu khuôn mặt" });
  }

  const normalized = normalizeVector(embedding.map((value) => Number(value || 0)));
  const threshold = 0.94;

  const matches = users
    .filter((user) => user.faceAuthEnabled && Array.isArray(user.faceEmbedding))
    .map((user) => ({ user, score: cosineSimilarity(normalized, user.faceEmbedding) }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = matches[0];
  if (!bestMatch || bestMatch.score < threshold) {
    return res.status(401).json({
      message: "Không khớp với khuôn mặt đã đăng ký. Bạn có thể tắt camera hoặc thử lại.",
    });
  }

  createLog(bestMatch.user.name, `Đăng nhập bằng khuôn mặt (score=${bestMatch.score.toFixed(3)})`);
  return res.json({
    user: { ...getSafeUser(bestMatch.user), defaultRoute: getDefaultRoute(bestMatch.user) },
    token: `mock-face-token-${bestMatch.user.id}`,
    score: Number(bestMatch.score.toFixed(4)),
  });
});

app.get("/api/sensors", (req, res) => {
  const userId = req.query.userId;
  if (userId && seed.sensors[userId]) {
    return res.json(seed.sensors[userId]);
  }
  return res.json(seed.sensors["1"]);
});

app.get("/api/devices", (req, res) => {
  const userId = Number(req.query.userId);
  if (userId) {
    return res.json(devices.filter((device) => device.userId === userId));
  }
  return res.json(devices);
});

app.post("/api/devices/:id/toggle", (req, res) => {
  const id = Number(req.params.id);
  const device = devices.find((candidate) => candidate.id === id);

  if (!device) {
    return res.status(404).json({ message: "Không tìm thấy thiết bị" });
  }

  device.power = !device.power;
  device.status = device.power;
  if (!device.power) {
    device.value = 0;
  } else {
    if (device.type === "light") device.value = 80;
    if (device.type === "fan") device.value = 3;
    if (device.type === "ac") device.value = 24;
  }

  createLog("System", `${device.power ? "Bật" : "Tắt"} ${device.name}`);
  return res.json(device);
});

app.get("/api/users", (req, res) => {
  const members = users
    .filter((user) => user.role === "MEMBER")
    .map((user) => {
      const userDevices = devices.filter((device) => device.userId === user.id);
      const activeCount = userDevices.filter((device) => device.power).length;
      return {
        ...getSafeUser(user),
        deviceCount: userDevices.length,
        activeDeviceCount: activeCount,
      };
    });
  return res.json(members);
});

app.get("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((candidate) => candidate.id === id);
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  return res.json({ ...getSafeUser(user), defaultRoute: getDefaultRoute(user) });
});

app.get("/api/logs", (req, res) => {
  return res.json(systemLogs);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
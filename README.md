# AIoT Smart Home

Hệ thống quản lý nhà thông minh tích hợp trí tuệ nhân tạo và IoT.
Backend FastAPI + PostgreSQL, Frontend React/Vite.

## Kiến trúc

| Thành phần | Công nghệ | Port |
|---|---|---|
| **Backend** | FastAPI + asyncpg + PostgreSQL | `localhost:8000` |
| **Frontend** | React + Vite + Tailwind CSS | `localhost:3000` |
| **Database** | PostgreSQL 15+ | `localhost:5432` |
| **AI Engine** | Gesture + Face + Temp Prediction | `localhost:8000` |

## Tài khoản demo

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `admin@smarthome.com` | `admin123` | ADMIN |
| `member1@smarthome.com` | `password123` | MEMBER |
| `member2@smarthome.com` | `password456` | MEMBER |

## Cài đặt và chạy

### 1. Database (PostgreSQL)

**Cách A — Docker (khuyên dùng):**
```bash
docker run -d --name smarthome-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=smart_home \
  -p 5432:5432 \
  postgres:15
```

**Cách B — PostgreSQL đã cài sẵn:**
```bash
psql -U postgres -c "CREATE DATABASE smart_home;"
```

**Import schema + data:**
```bash
psql -U postgres -d smart_home -f db/backup.sql
```

### 2. Backend (AIEngine + AI Models)

```bash
# Activate venv từ gesture_fan_mediapipe
cd gesture_fan_mediapipe
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Cài dependencies AI
cd ../AIEngine
pip install -r requirements.txt

# Cấu hình database (sửa tuỳ thuộc vào URL sử dụng)
# File AIEngine/.env — mặc định:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_home

# (Tùy chọn) Tải models cho Face Detection
cd ../AIEngine/tools
python download_models.py
cd ..

# Chạy FastAPI server
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

## Cấu trúc thư mục

```
AIOT/
├── AIEngine/                    # FastAPI backend + AI models
│   ├── main.py                  # FastAPI app — tất cả API endpoints
│   ├── database.py              # Kết nối PostgreSQL (asyncpg pool)
│   ├── face_engine.py           # OpenCV face detection/recognition (YuNet)
│   ├── gesture_engine.py        # MediaPipe gesture detection
│   ├── gesture_recognizer.task  # MediaPipe config
│   ├── hud_engine.py            # YOLO object detection cho devices
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # DATABASE_URL config
│   ├── models/                  # AI models (YuNet, SFace)
│   └── tools/
│       └── download_models.py   # Tải models face detection
├── db/                          # Database
│   └── backup.sql               # Schema + seed data cho PostgreSQL
├── gesture_fan_mediapipe/       # Virtual environment + gesture control
│   ├── .venv/                   # Python venv (PHẢI giữ lại)
│   └── gesture_fan_control.py
├── temperature_prediction/      # GRU model dự báo nhiệt độ
│   ├── gru_model.py
│   ├── temperature_prediction.py
│   └── dataset.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js       # Vite config + proxy /api → backend
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # Routes + Auth guards
│       ├── index.css         # Tailwind CSS v4
│       ├── lib/
│       │   └── api.js        # Axios instance
│       ├── contexts/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── Sidebar.jsx
│       │   ├── StatCard.jsx
│       │   ├── DeviceCard.jsx
│       │   ├── SensorChart.jsx
│       │   ├── LightChart.jsx
│       │   ├── MemberPermissionsPanel.jsx
│       │   └── Toast.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── DevicesPage.jsx
│           ├── UsersPage.jsx
│           ├── UserDetailPage.jsx
│           ├── LogsPage.jsx
│           └── ProfilePage.jsx
├── .gitignore
└── README.md
```

## API Endpoints

### Auth
| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/login` | Đăng nhập bằng email/password |

### Devices & Control
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/devices?userId=X` | Thiết bị được cấp quyền cho user |
| POST | `/api/devices/:id/toggle` | Bật/tắt thiết bị |
| PATCH | `/api/devices/:id` | Cập nhật giá trị thiết bị (temperature, fan speed) |
| GET | `/api/sensors?userId=X` | Dữ liệu cảm biến (temp, humidity, light) |

### AI Detection (Real-time từ webcam)
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/gesture/detect` | Phát hiện gesture (WebSocket) |
| GET | `/api/face/detect` | Phát hiện khuôn mặt (WebSocket) |
| POST | `/api/temperature/predict` | Dự báo nhiệt độ |

### Users
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/users` | Danh sách MEMBER |
| GET | `/api/users/:id` | Chi tiết user |
| PATCH | `/api/users/:id/permissions` | Phân quyền thiết bị (ADMIN only) |

### System
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/logs` | Nhật ký hệ thống |
| GET | `/api/health` | Health check |

## Phân quyền

- **ADMIN** — xem danh sách MEMBER, xem dashboard/thiết bị từng MEMBER, phân quyền, điều khiển toàn bộ thiết bị, xem logs
- **MEMBER** — chỉ thấy và điều khiển thiết bị được cấp quyền, tự quản lý Face ID

## Cấu hình

Tất cả config nằm trong `AIEngine/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_home
```

Sửa thông số cho phù hợp với môi trường của bạn.

## Tính năng AI

### 1. Gesture Detection (Gesture Control)
- **MediaPipe hand tracking** phát hiện cử chỉ từ webcam
- Kiểm soát thiết bị (quạt, đèn) bằng cử chỉ mở tay
- Endpoint WebSocket: `GET /api/gesture/detect`
- Venv nằm tại: `gesture_fan_mediapipe/.venv` (PHẢI giữ lại)

### 2. Face Detection & Recognition
- **OpenCV YuNet + SFace** phát hiện khuôn mặt real-time
- Tùy chọn: Đăng nhập bằng Face ID
- Models được tải qua: `AIEngine/tools/download_models.py`
- Endpoint WebSocket: `GET /api/face/detect`

### 3. Temperature Prediction
- **GRU Neural Network** dự báo nhiệt độ dựa trên lịch sử
- Folder: `temperature_prediction/`
- Endpoint: `POST /api/temperature/predict`

## Ghi chú quan trọng

- **Venv location**: Nằm tại `gesture_fan_mediapipe/.venv` — PHẢI giữ lại, xóa sẽ làm hỏng project
- **Database import**: Sử dụng `db/backup.sql` ở thư mục gốc, KHÔNG phải `backend/db/`
- **Port FastAPI**: Chạy trên port 8000, frontend proxy tự động route `/api/*`
- **Models AI**: Face detection models tải qua `AIEngine/tools/download_models.py`
- **Camera**: Hoạt động tốt nhất trên `localhost` (HTTPS required cho domain khác)
- Nếu gesture detection không hoạt động, kiểm tra webcam permissions
- Nếu face detection báo lỗi, chạy: `cd AIEngine && python tools/download_models.py`

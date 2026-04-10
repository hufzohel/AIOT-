# AIoT Smart Home

Hệ thống quản lý nhà thông minh tích hợp trí tuệ nhân tạo và IoT.
Backend FastAPI + PostgreSQL, Frontend React/Vite.

## Kiến trúc

| Thành phần | Công nghệ | Port |
|---|---|---|
| **Backend** | FastAPI + asyncpg + PostgreSQL | `localhost:5000` |
| **Frontend** | React + Vite + Tailwind CSS | `localhost:3000` |
| **Database** | PostgreSQL 15+ | `localhost:5432` |
| **Face ID** | OpenCV YuNet + SFace (tùy chọn) | — |

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
psql -U postgres -d smart_home -f backend/db/backup.sql
```

### 2. Backend

```bash
cd backend

# Tạo virtual environment (khuyên dùng)
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Cài dependencies
pip install -r requirements.txt

# Cấu hình database (sửa tuỳ thuộc vào URL sử dụng)
# File backend/.env — mặc định:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_home

# (Tùy chọn) Tải models cho Face ID
python tools/download_models.py

# Chạy server
uvicorn main:app --reload --port 5000
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
smart_home/
├── backend/
│   ├── main.py              # FastAPI app — tất cả API endpoints
│   ├── database.py          # Kết nối PostgreSQL (asyncpg pool)
│   ├── face_engine.py       # OpenCV face detection/recognition
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # DATABASE_URL config
│   ├── data_seed.json       # Dữ liệu mẫu (backup, không dùng runtime)
│   ├── db/
│   │   └── backup.sql       # Schema + seed data cho PostgreSQL
│   ├── models/              # AI models (gitignored, tải qua script)
│   └── tools/
│       └── download_models.py
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

### Sensors
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/sensors?userId=X` | Dữ liệu cảm biến (temp, humidity, light) |

### Devices
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/devices` | Tất cả thiết bị (ADMIN) |
| GET | `/api/devices?userId=X` | Thiết bị được cấp quyền cho user |
| POST | `/api/devices/:id/toggle` | Bật/tắt thiết bị |
| POST | `/api/devices/bulk-power` | Bật/tắt tất cả (ADMIN only) |

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

### Face ID (tùy chọn)
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/face/health` | Kiểm tra model sẵn sàng |
| POST | `/api/face/register` | Đăng ký Face ID (5 ảnh) |
| POST | `/api/face/update` | Cập nhật Face ID |
| POST | `/api/face/disable` | Tắt Face ID |
| POST | `/api/face/login` | Đăng nhập bằng Face ID |

## Phân quyền

- **ADMIN** — xem danh sách MEMBER, xem dashboard/thiết bị từng MEMBER, phân quyền, điều khiển toàn bộ thiết bị, xem logs
- **MEMBER** — chỉ thấy và điều khiển thiết bị được cấp quyền, tự quản lý Face ID

## Cấu hình

Tất cả config nằm trong `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_home
```

Sửa thông số cho phù hợp với môi trường của bạn.

## Ghi chú

- Face ID là tính năng tùy chọn — người dùng luôn có thể đăng nhập bằng mật khẩu
- Nếu `GET /api/face/health` báo lỗi model, chạy: `python tools/download_models.py`
- Camera hoạt động tốt nhất trên `localhost` (HTTPS required cho domain khác)
- `data_seed.json` chỉ là bản backup dữ liệu mẫu, backend không dùng file này khi chạy

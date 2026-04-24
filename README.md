# AIoT Smart Home - Unified FastAPI Edition

Đây là bản triển khai **1 backend FastAPI + 1 frontend Vite/React** cho webapp nhà thông minh.

## Kiến trúc chính

- **Backend duy nhất:** FastAPI chạy tại `http://localhost:4000`
- **Frontend:** React + Vite chạy tại `http://localhost:3000`
- **Face recognition:** OpenCV `FaceDetectorYN` (YuNet) + `FaceRecognizerSF` (SFace)

## Luồng chính của web

### 1. Đăng nhập bằng mật khẩu
- Mở webapp tại `http://localhost:3000`
- Chọn tab **Mật khẩu**
- Đăng nhập với một tài khoản demo
  - `admin@smarthome.com / admin123`
  - `member1@smarthome.com / password123`
  - `member2@smarthome.com / password456`

### 2. Đăng ký Face ID
- Người dùng đăng nhập lần đầu bằng mật khẩu
- Vào menu **Hồ sơ**
- Bật camera
- Chụp đủ **5 ảnh mẫu**
- Nhấn **Đăng ký Face ID** hoặc **Cập nhật Face ID**

### 3. Đăng nhập bằng Face ID
- Quay lại màn hình đăng nhập
- Chọn tab **Face ID**
- Bật camera và nhìn thẳng vào webcam
- Nhấn **Xác thực ngay**
- Nếu khớp, hệ thống sẽ đăng nhập trực tiếp

### 4. Phân quyền ADMIN / MEMBER
- **ADMIN**
  - xem danh sách MEMBER
  - xem dashboard, thiết bị được cấp của từng MEMBER
  - cấp quyền theo **loại thiết bị** hoặc **thiết bị cụ thể**
  - điều khiển **toàn bộ thiết bị** tại tab **Thiết bị**
- **MEMBER**
  - chỉ thấy và điều khiển các thiết bị được cấp quyền
  - tự đăng ký / cập nhật Face ID trong **Hồ sơ**

## Chạy project

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate     # Windows
pip install -r requirements.txt
python tools/download_models.py
uvicorn main:app --reload --port 4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Cấu trúc

```text
smarthome_fastapi_unified/
├── backend/
│   ├── main.py
│   ├── face_engine.py
│   ├── data_seed.json
│   ├── data_store.json
│   ├── requirements.txt
│   ├── models/
│   └── tools/download_models.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── README.md
```

## Reset dữ liệu demo

Nếu muốn đưa dữ liệu về trạng thái ban đầu, xóa file `backend/data_store.json`. Backend sẽ tự copy lại từ `backend/data_seed.json` trong lần chạy kế tiếp.

## Ghi chú

- Camera hoạt động tốt nhất trên `localhost`
- Nếu `GET /api/face/health` báo lỗi model, hãy chạy lại:
  ```bash
  python tools/download_models.py
  ```
- Face ID là tính năng tùy chọn. Người dùng vẫn luôn có thể đăng nhập bằng mật khẩu.

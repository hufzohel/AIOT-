# Smart Home Dashboard with Face Recognition (OpenCV)

## Giới thiệu

Đây là hệ thống web quản lý thiết bị Smart Home với các tính năng:

- Quản lý thiết bị (bật/tắt, trạng thái online/offline) bằng cử chỉ
- Phân quyền người dùng (Admin / Member)
- Đăng nhập bằng mật khẩu
- Đăng nhập bằng **xác thực khuôn mặt (Face Recognition)**

Hệ thống sử dụng:
- **Frontend:** React (Vite)
- **Backend:** FastAPI (Python)
- **Computer Vision:** OpenCV (YuNet + SFace)

---

## Tính năng chính

### Người dùng
- Đăng nhập bằng email/password
- Đăng nhập bằng khuôn mặt
- Cập nhật khuôn mặt (chụp 5 ảnh mẫu)

### Phân quyền
- **Admin:** toàn quyền quản lý
- **Member:** chỉ sử dụng thiết bị được cấp

### Thiết bị
- Hiển thị trạng thái:
  - Online / Offline
  - ON / OFF (badge riêng)

---

## Cài đặt & chạy project

### 1. Clone project

```bash
git clone <your-repo>
cd project
```

#### Backend (FastAPI + OpenCV)

```bash
cd backend

# tạo venv
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate   # Windows

# cài thư viện
pip install -r requirements.txt

# tải model OpenCV
python tools/download_models.py

# Mở 2 Terminal chạy như bên dưới
# Terminal backend1 - Chạy Face Recognition - Port 4000
uvicorn main:app --reload --port 4000

# Terminal backend2 - Chạy Data Service - Port 4001
npm start
```

#### Frontend (React + Vite)

```bash
cd frontend

npm install
npm run dev
```

# Gesture Fan Control (MediaPipe + Webcam)

Tính năng này chỉ làm một việc: dùng **webcam laptop** để nhận diện cử chỉ tay và **bật/tắt quạt**.

## Cử chỉ
| Cử chỉ                     | Mô tả                       | Chức năng                       |
| -------------------------- | --------------------------- | ------------------------------- |
| ✋ `Open_Palm`             | Mở bàn tay                  | **BẬT quạt**                    |
| ✊ `Closed_Fist`           | Nắm tay                     | **TẮT quạt**                    |
| 👍 `Thumb_Up`              | Ngón cái hướng lên          | **Bật chế độ quay (SWING ON)**  |
| 👎 `Thumb_Down`            | Ngón cái hướng xuống        | **Tắt chế độ quay (SWING OFF)** |
| ☝️ `Index`                 | 1 ngón trỏ                  | **Speed 1**                     |
| ✌️ `Index + Middle`        | 2 ngón (trỏ + giữa)         | **Speed 2**                     |
| 🤟 `Index + Middle + Ring` | 3 ngón (trỏ + giữa + áp út) | **Speed 3**                     |

*Lưu ý*: Khi chỉnh SPEED thì phải giữ nguyên và hướng mu bàn tay về webcam

## Yêu cầu
- Python 3.11 hoặc 3.12
- Webcam hoạt động bình thường

## Cài đặt
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## Chạy
```bash
python gesture_fan_control.py --auto-download-model
```

## Tùy chọn
```bash
python gesture_fan_control.py --camera-id 0 --stable-frames 5 --min-score 0.6 --auto-download-model
```

## Thoát
- Nhấn `Q` hoặc `ESC`

## Ghi chú
- Script sẽ tự tải file model `gesture_recognizer.task` vào thư mục `models/` nếu chưa có và bạn bật cờ `--auto-download-model`.
- Đây là bản **standalone**, chưa nối vào phần cứng thật. Để điều khiển quạt thật, thay phần `FanController.apply()` bằng lệnh serial, HTTP, MQTT hoặc GPIO tùy phần cứng của bạn.

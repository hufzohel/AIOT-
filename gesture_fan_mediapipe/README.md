# Gesture Fan Control (MediaPipe + Webcam)

Tính năng này chỉ làm một việc: dùng **webcam laptop** để nhận diện cử chỉ tay và **bật/tắt quạt**.

## Cử chỉ
| Gestures                  | Actions                   |
| `Open_Palm`               | BẬT quạt                  |
| `Closed_Fist`             | TẮT quạt                  |
| `Thumb_Up`                | Bật chế độ quay của quạt  |
| `Thumb_Down`              | Tắt chế độ quay của quạt  |
| `index`                   | Speed 1                   |
| `index + middle`          | Speed 2                   |
| `index + middle + ring`   | Speed 3                   |
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

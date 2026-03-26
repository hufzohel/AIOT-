import os
import time
from dataclasses import dataclass

import cv2
import mediapipe as mp
import requests


MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
MODEL_PATH = "gesture_recognizer.task"

# ===== Tunable parameters =====
GESTURE_CONFIDENCE_THRESHOLD = 0.65
STABLE_FRAMES_THRESHOLD = 6
COOLDOWN_SECONDS = 1.0


@dataclass
class FanState:
    power: bool = False
    speed: int = 0
    swing: bool = False


class FanController:
    def __init__(self):
        self.state = FanState()

    def fan_on(self) -> str:
        self.state.power = True
        if self.state.speed == 0:
            self.state.speed = 1
        return "FAN ON"

    def fan_off(self) -> str:
        self.state.power = False
        self.state.speed = 0
        return "FAN OFF"

    def set_speed(self, speed: int) -> str:
        self.state.power = True
        self.state.speed = speed
        return f"SPEED {speed}"

    def set_swing(self, enabled: bool) -> str:
        self.state.swing = enabled
        return f"SWING {'ON' if enabled else 'OFF'}"


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("Downloading gesture_recognizer.task ...")
    r = requests.get(MODEL_URL, timeout=60)
    r.raise_for_status()
    with open(MODEL_PATH, "wb") as f:
        f.write(r.content)
    print("Downloaded:", MODEL_PATH)


def normalized_to_pixel(lm, width, height):
    return int(lm.x * width), int(lm.y * height)


def draw_hand_landmarks(frame, hand_landmarks):
    h, w = frame.shape[:2]
    connections = [
        (0, 1), (1, 2), (2, 3), (3, 4),
        (0, 5), (5, 6), (6, 7), (7, 8),
        (5, 9), (9, 10), (10, 11), (11, 12),
        (9, 13), (13, 14), (14, 15), (15, 16),
        (13, 17), (17, 18), (18, 19), (19, 20),
        (0, 17),
    ]

    for a, b in connections:
        xa, ya = normalized_to_pixel(hand_landmarks[a], w, h)
        xb, yb = normalized_to_pixel(hand_landmarks[b], w, h)
        cv2.line(frame, (xa, ya), (xb, yb), (255, 180, 0), 2)

    for lm in hand_landmarks:
        x, y = normalized_to_pixel(lm, w, h)
        cv2.circle(frame, (x, y), 4, (0, 0, 255), -1)


def is_thumb_open(hand_landmarks, handedness_label: str) -> bool:
    thumb_tip = hand_landmarks[4]
    thumb_ip = hand_landmarks[3]

    if handedness_label == "Right":
        return thumb_tip.x < thumb_ip.x
    return thumb_tip.x > thumb_ip.x


def get_finger_states(hand_landmarks, handedness_label: str):
    """
    Return:
        {
            'thumb': bool,
            'index': bool,
            'middle': bool,
            'ring': bool,
            'pinky': bool
        }
    """
    thumb_open = is_thumb_open(hand_landmarks, handedness_label)
    index_open = hand_landmarks[8].y < hand_landmarks[6].y
    middle_open = hand_landmarks[12].y < hand_landmarks[10].y
    ring_open = hand_landmarks[16].y < hand_landmarks[14].y
    pinky_open = hand_landmarks[20].y < hand_landmarks[18].y

    return {
        "thumb": thumb_open,
        "index": index_open,
        "middle": middle_open,
        "ring": ring_open,
        "pinky": pinky_open,
    }


def classify_speed_pattern(states: dict) -> int | None:
    """
    Speed rules:
    - SPEED 1: only index open
    - SPEED 2: index + middle open
    - SPEED 3: index + middle + ring open

    Thumb and pinky must be closed for speed commands.
    """
    thumb = states["thumb"]
    index = states["index"]
    middle = states["middle"]
    ring = states["ring"]
    pinky = states["pinky"]

    if index and not middle and not ring and not pinky and not thumb:
        return 1

    if index and middle and not ring and not pinky and not thumb:
        return 2

    if index and middle and ring and not pinky and not thumb:
        return 3

    return None


def draw_text_block(
    frame,
    controller: FanController,
    action_text: str,
    gesture_name: str,
    gesture_score: float,
    signal_text: str,
    finger_states: dict | None,
):
    lines = [
        f"Gesture : {gesture_name}",
        f"Score   : {gesture_score:.2f}",
        f"Signal  : {signal_text}",
        f"Power   : {'ON' if controller.state.power else 'OFF'}",
        f"Speed   : {controller.state.speed}",
        f"Swing   : {'ON' if controller.state.swing else 'OFF'}",
        f"Action  : {action_text}",
    ]

    if finger_states is not None:
        fs = (
            f"T:{int(finger_states['thumb'])} "
            f"I:{int(finger_states['index'])} "
            f"M:{int(finger_states['middle'])} "
            f"R:{int(finger_states['ring'])} "
            f"P:{int(finger_states['pinky'])}"
        )
        lines.append(f"Fingers : {fs}")

    lines.append("Press Q or ESC to quit")

    x, y = 20, 30
    for line in lines:
        cv2.putText(
            frame,
            line,
            (x, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.72,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )
        y += 30


def main():
    ensure_model()

    BaseOptions = mp.tasks.BaseOptions
    GestureRecognizer = mp.tasks.vision.GestureRecognizer
    GestureRecognizerOptions = mp.tasks.vision.GestureRecognizerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = GestureRecognizerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    controller = FanController()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Cannot open laptop webcam.")

    last_signal = None
    stable_frames = 0
    last_action_time = 0.0

    action_text = "READY"
    gesture_name = "None"
    gesture_score = 0.0
    signal_text = "None"
    current_finger_states = None

    with GestureRecognizer.create_from_options(options) as recognizer:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Cannot read frame from webcam.")
                break

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int(time.time() * 1000)
            result = recognizer.recognize_for_video(mp_image, timestamp_ms)

            current_signal = None
            gesture_name = "None"
            gesture_score = 0.0
            signal_text = "None"
            current_finger_states = None

            if result.hand_landmarks and result.handedness:
                hand_landmarks = result.hand_landmarks[0]
                handedness_label = result.handedness[0][0].category_name
                draw_hand_landmarks(frame, hand_landmarks)

                # ===== Read built-in gesture, but only keep allowed special gestures =====
                if result.gestures and len(result.gestures) > 0 and len(result.gestures[0]) > 0:
                    top_gesture = result.gestures[0][0]
                    gesture_name = top_gesture.category_name
                    gesture_score = float(top_gesture.score)
                else:
                    gesture_name = "None"
                    gesture_score = 0.0

                # ===== Finger-state analysis from landmarks =====
                current_finger_states = get_finger_states(hand_landmarks, handedness_label)
                speed_level = classify_speed_pattern(current_finger_states)

                # ===== Priority strategy =====
                # 1) Special gestures only: Open_Palm / Closed_Fist / Thumb_Up / Thumb_Down
                # 2) Ignore Pointing_Up and Victory completely
                # 3) If no valid special gesture, use exact finger pattern for speed
                if gesture_score >= GESTURE_CONFIDENCE_THRESHOLD:
                    if gesture_name == "Open_Palm":
                        current_signal = "FAN_ON"
                    elif gesture_name == "Closed_Fist":
                        current_signal = "FAN_OFF"
                    elif gesture_name == "Thumb_Up":
                        current_signal = "SWING_ON"
                    elif gesture_name == "Thumb_Down":
                        current_signal = "SWING_OFF"

                if current_signal is None and speed_level is not None:
                    if speed_level == 1:
                        current_signal = "SPEED_1"
                    elif speed_level == 2:
                        current_signal = "SPEED_2"
                    elif speed_level == 3:
                        current_signal = "SPEED_3"

                signal_text = current_signal if current_signal is not None else "None"

                # ===== Stable frames =====
                if current_signal == last_signal and current_signal is not None:
                    stable_frames += 1
                else:
                    stable_frames = 0
                    last_signal = current_signal

                # ===== Cooldown =====
                now = time.time()
                if (
                    current_signal is not None
                    and stable_frames >= STABLE_FRAMES_THRESHOLD
                    and (now - last_action_time) >= COOLDOWN_SECONDS
                ):
                    if current_signal == "FAN_ON":
                        action_text = controller.fan_on()
                    elif current_signal == "FAN_OFF":
                        action_text = controller.fan_off()
                    elif current_signal == "SWING_ON":
                        action_text = controller.set_swing(True)
                    elif current_signal == "SWING_OFF":
                        action_text = controller.set_swing(False)
                    elif current_signal == "SPEED_1":
                        action_text = controller.set_speed(1)
                    elif current_signal == "SPEED_2":
                        action_text = controller.set_speed(2)
                    elif current_signal == "SPEED_3":
                        action_text = controller.set_speed(3)

                    stable_frames = 0
                    last_action_time = now
            else:
                last_signal = None
                stable_frames = 0

            draw_text_block(
                frame,
                controller,
                action_text,
                gesture_name,
                gesture_score,
                signal_text,
                current_finger_states,
            )

            cv2.imshow("Fan Hand Control - MediaPipe", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
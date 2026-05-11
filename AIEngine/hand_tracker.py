import os
from pathlib import Path
from typing import Dict, Any
import cv2
import math
import mediapipe as mp
import requests

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"

class HandTracker:
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_path = self.model_dir / "gesture_recognizer.task"
        self._ensure_model()

        options = mp.tasks.vision.GestureRecognizerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(self.model_path)),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.75,
            min_hand_presence_confidence=0.75,
        )
        self.recognizer = mp.tasks.vision.GestureRecognizer.create_from_options(options)
        print("✅ Mediapipe Hand Tracker Online.")

    def _ensure_model(self):
        if not self.model_path.exists():
            print("Downloading gesture_recognizer.task (One time only)...")
            self.model_dir.mkdir(parents=True, exist_ok=True)
            r = requests.get(MODEL_URL, timeout=60)
            r.raise_for_status()
            with open(self.model_path, "wb") as f:
                f.write(r.content)

    def _get_extended_fingers(self, landmarks):
        """Rotation-Invariant check based on joint distances from the wrist (0)"""
        def dist(p1, p2): return math.hypot(p1.x - p2.x, p1.y - p2.y)
        
        # Is the tip further from the wrist than the PIP joint?
        i_ext = dist(landmarks[0], landmarks[8]) > dist(landmarks[0], landmarks[6])
        m_ext = dist(landmarks[0], landmarks[12]) > dist(landmarks[0], landmarks[10])
        r_ext = dist(landmarks[0], landmarks[16]) > dist(landmarks[0], landmarks[14])
        
        return i_ext, m_ext, r_ext

    def get_hand_state(self, frame) -> Dict[str, Any]:
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = self.recognizer.recognize(mp_image)

        state = {
            "detected": False, "gesture": None, 
            "is_pointing": False, "speed_level": None,
            "hand_center": None, "index_tip": None, "index_vector": None
        }

        if not result.hand_landmarks:
            return state

        state["detected"] = True
        landmarks = result.hand_landmarks[0]
        h, w, _ = frame.shape

        # 1. Base Gesture
        if result.gestures and len(result.gestures[0]) > 0:
            top_gesture = result.gestures[0][0]
            if top_gesture.score >= 0.50:
                state["gesture"] = top_gesture.category_name

        # 2. Extract Custom Finger States
        i_ext, m_ext, r_ext = self._get_extended_fingers(landmarks)

        # 3. Custom Pointing Logic
        state["is_pointing"] = i_ext and not m_ext and not r_ext

        # 4. Custom Speed Logic (Index=1, Index+Mid=2, Index+Mid+Ring=3)
        if i_ext and not m_ext and not r_ext: state["speed_level"] = 1
        elif i_ext and m_ext and not r_ext: state["speed_level"] = 2
        elif i_ext and m_ext and r_ext: state["speed_level"] = 3

        # Coordinates
        kx, ky = int(landmarks[5].x * w), int(landmarks[5].y * h) 
        tx, ty = int(landmarks[8].x * w), int(landmarks[8].y * h) 
        px, py = int(landmarks[9].x * w), int(landmarks[9].y * h) 

        state["hand_center"] = (px, py)
        state["index_tip"] = (tx, ty)
        state["index_vector"] = (tx - kx, ty - ky)

        return state
import base64
import os
from pathlib import Path
from typing import Dict, Any
import cv2
import mediapipe as mp
import numpy as np
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

    def _ensure_model(self):
        if not self.model_path.exists():
            print("Downloading gesture_recognizer.task ...")
            self.model_dir.mkdir(parents=True, exist_ok=True)
            r = requests.get(MODEL_URL, timeout=60)
            r.raise_for_status()
            with open(self.model_path, "wb") as f:
                f.write(r.content)

    def _decode_image(self, base64_image: str) -> np.ndarray:
        if "," in base64_image:
            _, encoded = base64_image.split(",", 1)
        else:
            encoded = base64_image
        arr = np.frombuffer(base64.b64decode(encoded), dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    def get_hand_state(self, base64_image: str) -> Dict[str, Any]:
        """
        Returns exactly what the hand is doing and where the laser is pointing.
        NO decision logic here.
        """
        rgb_image = self._decode_image(base64_image)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = self.recognizer.recognize(mp_image)

        state = {"detected": False, "gesture": None, "raycast_vector": None}

        if not result.hand_landmarks:
            return state

        state["detected"] = True
        landmarks = result.hand_landmarks[0]

        # 1. Get Gesture
        if result.gestures and len(result.gestures[0]) > 0:
            top_gesture = result.gestures[0][0]
            if top_gesture.score >= 0.65:
                state["gesture"] = top_gesture.category_name

        # 2. Calculate the Raycast (Laser Pointer) Vector
        knuckle = landmarks[5]
        tip = landmarks[8]

        dx = tip.x - knuckle.x
        dy = tip.y - knuckle.y

        # Define the ray as a start point and an end point (projected outward)
        start_point = (tip.x, tip.y)
        end_point = (tip.x + (dx * 10), tip.y + (dy * 10))

        state["raycast_vector"] = (start_point, end_point)

        return state
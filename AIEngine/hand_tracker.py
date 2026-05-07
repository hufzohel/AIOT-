import os
from pathlib import Path
from typing import Dict, Any
import cv2
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

    def get_hand_state(self, frame) -> Dict[str, Any]:
        """
        Takes a raw cv2 frame. Returns gesture and laser coordinates.
        """
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = self.recognizer.recognize(mp_image)

        state = {"detected": False, "gesture": None, "raycast_vector": None, "tip_coords": None}

        if not result.hand_landmarks:
            return state

        state["detected"] = True
        landmarks = result.hand_landmarks[0]
        h, w, _ = frame.shape

        # 1. Get Gesture
        if result.gestures and len(result.gestures[0]) > 0:
            top_gesture = result.gestures[0][0]
            if top_gesture.score >= 0.50:
                state["gesture"] = top_gesture.category_name

        # 2. Calculate the Raycast (Laser Pointer) if Pointing
        if state["gesture"] == "Pointing_Up":
            knuckle = landmarks[5] # Index finger base
            tip = landmarks[8]     # Index finger tip

            # Convert normalized coordinates to actual pixel coordinates
            kx, ky = int(knuckle.x * w), int(knuckle.y * h)
            tx, ty = int(tip.x * w), int(tip.y * h)
            
            state["tip_coords"] = (tx, ty)

            # Calculate direction vector
            dx = tx - kx
            dy = ty - ky

            # Project the laser 2000 pixels outward
            laser_end_x = tx + (dx * 2000)
            laser_end_y = ty + (dy * 2000)

            state["raycast_vector"] = ((tx, ty), (int(laser_end_x), int(laser_end_y)))

        return state
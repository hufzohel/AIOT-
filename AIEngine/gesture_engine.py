import base64
import os
from pathlib import Path
from typing import Dict, Optional, Any

import cv2
import mediapipe as mp
import numpy as np
import requests

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"

class GestureEngineError(RuntimeError):
    pass

class GestureEngine:
    def __init__(self, model_dir: Path):
        self.model_dir = Path(model_dir)
        self.model_path = self.model_dir / "gesture_recognizer.task"
        
        self._ensure_model()

        # Notice we changed this from VIDEO to IMAGE mode for API requests
        BaseOptions = mp.tasks.BaseOptions
        GestureRecognizer = mp.tasks.vision.GestureRecognizer
        GestureRecognizerOptions = mp.tasks.vision.GestureRecognizerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = GestureRecognizerOptions(
            base_options=BaseOptions(model_asset_path=str(self.model_path)),
            running_mode=VisionRunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.75,
            min_hand_presence_confidence=0.75,
        )
        self.recognizer = GestureRecognizer.create_from_options(options)

    def _ensure_model(self):
        if self.model_path.exists():
            return
        print("Downloading gesture_recognizer.task ...")
        self.model_dir.mkdir(parents=True, exist_ok=True)
        r = requests.get(MODEL_URL, timeout=60)
        r.raise_for_status()
        with open(self.model_path, "wb") as f:
            f.write(r.content)

    @staticmethod
    def decode_data_url(data: str) -> np.ndarray:
        if "," in data:
            _, encoded = data.split(",", 1)
        else:
            encoded = data
        try:
            raw = base64.b64decode(encoded)
        except Exception as exc:
            raise GestureEngineError("Invalid base64 image data") from exc
        arr = np.frombuffer(raw, dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise GestureEngineError("Cannot decode image")
        # MediaPipe expects RGB
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    def process_frame(self, base64_image: str) -> Dict[str, Any]:
        """
        Receives an image, runs your exact gesture logic, and returns the command.
        """
        rgb_image = self.decode_data_url(base64_image)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        # Run inference
        result = self.recognizer.recognize(mp_image)
        
        response = {
            "detected": False,
            "gesture_name": "None",
            "score": 0.0,
            "signal": None
        }

        if not result.hand_landmarks or not result.handedness:
            return response

        response["detected"] = True
        hand_landmarks = result.hand_landmarks[0]
        handedness_label = result.handedness[0][0].category_name

        # 1. Check special gestures
        if result.gestures and len(result.gestures[0]) > 0:
            top_gesture = result.gestures[0][0]
            response["gesture_name"] = top_gesture.category_name
            response["score"] = float(top_gesture.score)

        # 2. Extract your exact finger states
        finger_states = self._get_finger_states(hand_landmarks, handedness_label)
        speed_level = self._classify_speed_pattern(finger_states)

        # 3. Apply your priority logic
        if response["score"] >= 0.65: # Your GESTURE_CONFIDENCE_THRESHOLD
            if response["gesture_name"] == "Open_Palm":
                response["signal"] = "FAN_ON"
            elif response["gesture_name"] == "Closed_Fist":
                response["signal"] = "FAN_OFF"
            elif response["gesture_name"] == "Thumb_Up":
                response["signal"] = "SWING_ON"
            elif response["gesture_name"] == "Thumb_Down":
                response["signal"] = "SWING_OFF"

        if response["signal"] is None and speed_level is not None:
            response["signal"] = f"SPEED_{speed_level}"

        return response

    # --- Your exact math logic below, unchanged, just moved inside the class ---

    def _is_thumb_open(self, hand_landmarks, handedness_label: str) -> bool:
        thumb_tip = hand_landmarks[4]
        thumb_ip = hand_landmarks[3]
        if handedness_label == "Right":
            return thumb_tip.x < thumb_ip.x
        return thumb_tip.x > thumb_ip.x

    def _get_finger_states(self, hand_landmarks, handedness_label: str):
        return {
            "thumb": self._is_thumb_open(hand_landmarks, handedness_label),
            "index": hand_landmarks[8].y < hand_landmarks[6].y,
            "middle": hand_landmarks[12].y < hand_landmarks[10].y,
            "ring": hand_landmarks[16].y < hand_landmarks[14].y,
            "pinky": hand_landmarks[20].y < hand_landmarks[18].y,
        }

    def _classify_speed_pattern(self, states: dict) -> Optional[int]:
        if states["index"] and not states["middle"] and not states["ring"] and not states["pinky"] and not states["thumb"]:
            return 1
        if states["index"] and states["middle"] and not states["ring"] and not states["pinky"] and not states["thumb"]:
            return 2
        if states["index"] and states["middle"] and states["ring"] and not states["pinky"] and not states["thumb"]:
            return 3
        return None
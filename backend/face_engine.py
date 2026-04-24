from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


class FaceEngineError(RuntimeError):
    pass


@dataclass
class FaceMatchResult:
    cosine: float


class FaceEngine:
    def __init__(self, model_dir: Path):
        self.model_dir = Path(model_dir)
        self.fd_model = self.model_dir / "face_detection_yunet_2023mar.onnx"
        self.fr_model = self.model_dir / "face_recognition_sface_2021dec.onnx"

        if not self.fd_model.exists() or not self.fr_model.exists():
            raise FaceEngineError(
                "Không tìm thấy model OpenCV. Hãy chạy: python tools/download_models.py"
            )

        try:
            self.detector = cv2.FaceDetectorYN.create(
                str(self.fd_model),
                "",
                (320, 320),
                score_threshold=0.9,
                nms_threshold=0.3,
                top_k=5000,
            )
            self.recognizer = cv2.FaceRecognizerSF.create(str(self.fr_model), "")
        except Exception as exc:  # pragma: no cover
            raise FaceEngineError(f"Không thể load model OpenCV: {exc}") from exc

    @staticmethod
    def decode_data_url(data: str) -> np.ndarray:
        if "," in data:
            _, encoded = data.split(",", 1)
        else:
            encoded = data
        try:
            raw = base64.b64decode(encoded)
        except Exception as exc:  # pragma: no cover
            raise FaceEngineError("Ảnh gửi lên không đúng định dạng base64") from exc
        arr = np.frombuffer(raw, dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise FaceEngineError("Không thể giải mã ảnh khuôn mặt")
        return image

    def _detect_faces(self, image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        result = self.detector.detect(image)
        faces = result[1] if isinstance(result, tuple) else result
        if faces is None or len(faces) == 0:
            raise FaceEngineError("Không phát hiện được khuôn mặt trong ảnh")
        return faces

    def extract_embedding_from_image(self, image: np.ndarray) -> np.ndarray:
        faces = self._detect_faces(image)
        if len(faces) != 1:
            raise FaceEngineError("Cần đúng 1 khuôn mặt trong khung hình")
        face = faces[0]
        aligned = self.recognizer.alignCrop(image, face)
        feature = self.recognizer.feature(aligned).flatten().astype(np.float32)
        norm = np.linalg.norm(feature)
        if not norm:
            raise FaceEngineError("Không thể trích xuất đặc trưng khuôn mặt")
        return feature / norm

    def extract_embedding_from_data_url(self, data: str) -> np.ndarray:
        image = self.decode_data_url(data)
        return self.extract_embedding_from_image(image)

    @staticmethod
    def cosine_similarity(feature_a: np.ndarray, feature_b: np.ndarray) -> float:
        a = feature_a.astype(np.float32)
        b = feature_b.astype(np.float32)
        a_norm = np.linalg.norm(a)
        b_norm = np.linalg.norm(b)
        if not a_norm or not b_norm:
            return 0.0
        return float(np.dot(a / a_norm, b / b_norm))

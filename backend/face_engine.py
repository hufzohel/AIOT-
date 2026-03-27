from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple

import cv2
import numpy as np


class FaceEngineError(RuntimeError):
    pass


@dataclass
class FaceEngineHealth:
    ready: bool
    message: str
    detector_model: str | None = None
    recognizer_model: str | None = None
    threshold: float | None = None


class OpenCVFaceEngine:
    def __init__(self, models_dir: str | Path, threshold: float = 0.42, min_margin: float = 0.03):
        self.models_dir = Path(models_dir)
        self.threshold = float(os.getenv("FACE_MATCH_THRESHOLD", threshold))
        self.min_margin = float(os.getenv("FACE_MATCH_MIN_MARGIN", min_margin))
        self.detector_model = Path(
            os.getenv(
                "FACE_DETECTION_MODEL_PATH",
                self.models_dir / "face_detection_yunet_2023mar.onnx",
            )
        )
        self.recognizer_model = Path(
            os.getenv(
                "FACE_RECOGNITION_MODEL_PATH",
                self.models_dir / "face_recognition_sface_2021dec.onnx",
            )
        )
        self.detector = None
        self.recognizer = None
        self._load_error = None
        self._load_models()

    def _load_models(self) -> None:
        missing = [str(path) for path in [self.detector_model, self.recognizer_model] if not path.exists()]
        if missing:
            self._load_error = (
                "Thiếu model ONNX cho OpenCV face recognition. Hãy đặt file vào backend/models hoặc chạy python tools/download_models.py"
            )
            return
        try:
            self.detector = cv2.FaceDetectorYN_create(
                str(self.detector_model),
                "",
                (320, 320),
                0.9,
                0.3,
                5000,
            )
            self.recognizer = cv2.FaceRecognizerSF_create(str(self.recognizer_model), "")
            self._load_error = None
        except Exception as error:  # pragma: no cover - depends on OpenCV runtime
            self.detector = None
            self.recognizer = None
            self._load_error = f"Không thể load model OpenCV: {error}"

    def health(self) -> FaceEngineHealth:
        if self.detector is not None and self.recognizer is not None:
            return FaceEngineHealth(
                ready=True,
                message="OpenCV face engine is ready",
                detector_model=str(self.detector_model),
                recognizer_model=str(self.recognizer_model),
                threshold=self.threshold,
            )
        return FaceEngineHealth(
            ready=False,
            message=self._load_error or "Face engine chưa sẵn sàng",
            detector_model=str(self.detector_model),
            recognizer_model=str(self.recognizer_model),
            threshold=self.threshold,
        )

    def ensure_ready(self) -> None:
        if self.detector is None or self.recognizer is None:
            raise FaceEngineError(self.health().message)

    @staticmethod
    def decode_data_url(data_url: str) -> np.ndarray:
        payload = data_url.split(",", 1)[1] if "," in data_url else data_url
        try:
            binary = base64.b64decode(payload)
        except Exception as exc:
            raise FaceEngineError("Ảnh base64 không hợp lệ") from exc
        image = cv2.imdecode(np.frombuffer(binary, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise FaceEngineError("Không thể giải mã ảnh gửi lên")
        return image

    @staticmethod
    def _resize_for_detection(image: np.ndarray, max_side: int = 640) -> np.ndarray:
        height, width = image.shape[:2]
        longest_side = max(height, width)
        if longest_side <= max_side:
            return image
        scale = max_side / float(longest_side)
        new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
        return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)

    def _detect_one_face(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        self.ensure_ready()
        working = self._resize_for_detection(image)
        height, width = working.shape[:2]
        self.detector.setInputSize((width, height))
        _, faces = self.detector.detect(working)
        if faces is None or len(faces) == 0:
            raise FaceEngineError("Không phát hiện được khuôn mặt. Hãy nhìn thẳng vào camera và đảm bảo đủ sáng.")
        if len(faces) > 1:
            raise FaceEngineError("Phát hiện nhiều hơn 1 khuôn mặt. Hãy để một mình bạn xuất hiện trong khung hình.")
        return working, faces[0]

    @staticmethod
    def _normalize_feature(feature: np.ndarray) -> np.ndarray:
        vector = np.asarray(feature, dtype=np.float32).reshape(1, -1)
        norm = np.linalg.norm(vector)
        if norm == 0:
            raise FaceEngineError("Không thể chuẩn hóa đặc trưng khuôn mặt")
        return vector / norm

    def embedding_from_data_url(self, data_url: str) -> np.ndarray:
        image = self.decode_data_url(data_url)
        working, face = self._detect_one_face(image)
        aligned = self.recognizer.alignCrop(working, face)
        feature = self.recognizer.feature(aligned)
        return self._normalize_feature(feature)

    def build_template(self, images: Iterable[str]) -> np.ndarray:
        embeddings = [self.embedding_from_data_url(image) for image in images]
        if len(embeddings) != 5:
            raise FaceEngineError("Cần đúng 5 ảnh mẫu để tạo face template")
        stacked = np.vstack(embeddings).astype(np.float32)
        mean_embedding = np.mean(stacked, axis=0, keepdims=True)
        return self._normalize_feature(mean_embedding)

    def match_embedding(self, query_embedding: np.ndarray, stored_embedding: np.ndarray) -> float:
        return float(
            self.recognizer.match(
                query_embedding.astype(np.float32),
                stored_embedding.astype(np.float32),
                cv2.FaceRecognizerSF_FR_COSINE,
            )
        )

    def identify_best_match(self, query_embedding: np.ndarray, enrolled_users: List[Tuple[dict, np.ndarray]]) -> Tuple[dict, float, float]:
        if not enrolled_users:
            raise FaceEngineError("Chưa có người dùng nào đăng ký xác thực gương mặt")

        scored = []
        for user, embedding in enrolled_users:
            score = self.match_embedding(query_embedding, embedding)
            scored.append((user, score))
        scored.sort(key=lambda item: item[1], reverse=True)

        best_user, best_score = scored[0]
        second_score = scored[1][1] if len(scored) > 1 else -1.0

        if best_score < self.threshold:
            raise FaceEngineError("Khuôn mặt chưa khớp với mẫu đã đăng ký")
        if second_score >= 0 and best_score - second_score < self.min_margin:
            raise FaceEngineError("Kết quả nhận diện chưa đủ chắc chắn. Hãy thử lại với ánh sáng tốt hơn.")
        return best_user, best_score, second_score

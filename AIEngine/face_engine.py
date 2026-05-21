from __future__ import annotations
import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import cv2
import numpy as np
import faiss

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
            raise FaceEngineError("Không tìm thấy model OpenCV.")

        try:
            self.detector = cv2.FaceDetectorYN.create(
                str(self.fd_model), "", (320, 320),
                score_threshold=0.9, nms_threshold=0.3, top_k=5000,
            )
            self.recognizer = cv2.FaceRecognizerSF.create(str(self.fr_model), "")
            
            self.dimension = 128 
            self.base_index = faiss.IndexFlatIP(self.dimension)
            self.index = faiss.IndexIDMap(self.base_index)
        except Exception as exc:  
            raise FaceEngineError(f"Không thể load model: {exc}") from exc

    def add_or_update_face_in_db(self, user_id: int, embedding: np.ndarray):
        self.remove_face_from_db(user_id)
        vec = np.array([embedding], dtype=np.float32)
        idx = np.array([user_id], dtype=np.int64)
        self.index.add_with_ids(vec, idx)

    def remove_face_from_db(self, user_id: int):
        self.index.remove_ids(np.array([user_id], dtype=np.int64))

    def search_faiss(self, embedding: np.ndarray, top_k: int = 1) -> tuple[int, float]:
        if self.index.ntotal == 0:
            return -1, 0.0
        vec = np.array([embedding], dtype=np.float32)
        distances, indices = self.index.search(vec, top_k)
        return int(indices[0][0]), float(distances[0][0])

    @staticmethod
    def decode_data_url(data: str) -> np.ndarray:
        if "," in data:
            _, encoded = data.split(",", 1)
        else:
            encoded = data
        raw = base64.b64decode(encoded)
        arr = np.frombuffer(raw, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    def _detect_faces(self, image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        result = self.detector.detect(image)
        faces = result[1] if isinstance(result, tuple) else result
        if faces is None or len(faces) == 0:
            raise FaceEngineError("Không phát hiện được khuôn mặt")
        return faces

    def extract_embedding_from_image(self, image: np.ndarray) -> np.ndarray:
        faces = self._detect_faces(image)
        if len(faces) != 1:
            raise FaceEngineError("Cần đúng 1 khuôn mặt")
        face = faces[0]
        aligned = self.recognizer.alignCrop(image, face)
        feature = self.recognizer.feature(aligned).flatten().astype(np.float32)
        norm = np.linalg.norm(feature)
        if not norm:
            raise FaceEngineError("Lỗi trích xuất")
        return feature / norm

    def extract_embedding_from_data_url(self, data: str) -> np.ndarray:
        return self.extract_embedding_from_image(self.decode_data_url(data))

    # 🚀 NEW: Server-Side Rendering HUD
    def get_embedding_and_hud(self, data: str) -> tuple[Optional[np.ndarray], str]:
        image = self.decode_data_url(data)
        hud_image = image.copy()
        
        try:
            faces = self._detect_faces(image)
            if len(faces) != 1:
                raise FaceEngineError("Cần đúng 1 khuôn mặt")
            
            face = faces[0]
            # Draw YuNet Box (Cyan in BGR)
            bbox = [int(face[0]), int(face[1]), int(face[2]), int(face[3])]
            cv2.rectangle(hud_image, (bbox[0], bbox[1]), (bbox[0]+bbox[2], bbox[1]+bbox[3]), (255, 255, 0), 2)
            
            # Draw 5 Landmarks (Red in BGR)
            for i in range(4, 14, 2):
                cv2.circle(hud_image, (int(face[i]), int(face[i+1])), 4, (0, 0, 255), -1)
                
            aligned = self.recognizer.alignCrop(image, face)
            feature = self.recognizer.feature(aligned).flatten().astype(np.float32)
            norm = np.linalg.norm(feature)
            emb = feature / norm if norm else None
            
        except FaceEngineError:
            emb = None

        # Encode the drawn image back to Base64 to send to React
        _, buffer = cv2.imencode('.jpg', hud_image)
        hud_b64 = base64.b64encode(buffer).decode('utf-8')
        return emb, f"data:image/jpeg;base64,{hud_b64}"
from __future__ import annotations

import json
import secrets
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from face_engine import FaceEngineError, OpenCVFaceEngine

BASE_DIR = Path(__file__).resolve().parent
STORE_PATH = BASE_DIR / "data_store.json"
SEED_PATH = BASE_DIR / "data_seed.json"
MODELS_DIR = BASE_DIR / "models"

app = FastAPI(title="AIoT Smart Home API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


class ToggleDeviceRequest(BaseModel):
    userId: int | None = None


class FaceImagesRequest(BaseModel):
    userId: int
    images: list[str] = Field(default_factory=list)


class FaceLoginRequest(BaseModel):
    image: str


class FaceDisableRequest(BaseModel):
    userId: int


class DataStore:
    def __init__(self, store_path: Path, seed_path: Path):
        self.store_path = store_path
        self.seed_path = seed_path
        self.lock = RLock()
        self.data = self._load_initial_data()

    def _load_initial_data(self) -> dict[str, Any]:
        source = self.store_path if self.store_path.exists() else self.seed_path
        with source.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not self.store_path.exists():
            self._persist(data)
        return data

    def _persist(self, data: dict[str, Any] | None = None) -> None:
        payload = data if data is not None else self.data
        with self.store_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def save(self) -> None:
        with self.lock:
            self._persist()

    def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        return next((user for user in self.data["users"] if user["id"] == user_id), None)

    def get_user_by_credentials(self, email: str, password: str) -> dict[str, Any] | None:
        return next(
            (user for user in self.data["users"] if user["email"] == email and user["password"] == password),
            None,
        )

    def sanitize_user(self, user: dict[str, Any]) -> dict[str, Any]:
        payload = deepcopy(user)
        payload.pop("password", None)
        if payload.get("faceAuth"):
            payload["faceAuth"].pop("embedding", None)
        return payload

    def system_logs(self) -> list[dict[str, Any]]:
        return self.data["systemLogs"]

    def add_log(self, user: str, action: str, level: str = "info") -> None:
        new_log = {
            "id": max((item["id"] for item in self.data["systemLogs"]), default=0) + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": user,
            "action": action,
            "level": level,
        }
        self.data["systemLogs"].insert(0, new_log)
        self.save()


store = DataStore(STORE_PATH, SEED_PATH)
face_engine = OpenCVFaceEngine(MODELS_DIR)


def create_token(user_id: int) -> str:
    return f"mock-token-{user_id}-{secrets.token_hex(8)}"


def require_user(user_id: int) -> dict[str, Any]:
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


def parse_embedding(values: list[float]) -> np.ndarray:
    return np.asarray(values, dtype=np.float32).reshape(1, -1)


@app.get("/api/face/health")
def face_health():
    return face_engine.health().__dict__


@app.post("/api/login")
def login(payload: LoginRequest):
    user = store.get_user_by_credentials(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    store.add_log(user["name"], "Đăng nhập bằng mật khẩu", "info")
    return {"user": store.sanitize_user(user), "token": create_token(user["id"])}


@app.get("/api/me")
def me(userId: int):
    user = require_user(userId)
    return store.sanitize_user(user)


@app.get("/api/sensors")
def sensors(userId: int | None = None):
    target = str(userId or 1)
    return store.data["sensors"].get(target, store.data["sensors"]["1"])


@app.get("/api/devices")
def devices(userId: int | None = None):
    if userId is None:
        return store.data["devices"]
    return [device for device in store.data["devices"] if device["userId"] == int(userId)]


@app.post("/api/devices/{device_id}/toggle")
def toggle_device(device_id: int, payload: ToggleDeviceRequest):
    device = next((item for item in store.data["devices"] if item["id"] == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")

    device["status"] = not device["status"]
    if not device["status"]:
        device["value"] = 0
    else:
        if device["type"] == "light":
            device["value"] = 80
        if device["type"] == "fan":
            device["value"] = 3
        if device["type"] == "ac":
            device["value"] = 24

    actor_name = "User"
    if payload.userId:
        actor = store.get_user_by_id(payload.userId)
        if actor:
            actor_name = actor["name"]
    store.add_log(actor_name, f"{'Bật' if device['status'] else 'Tắt'} {device['name']}", "info")
    store.save()
    return device


@app.get("/api/users")
def users():
    users = []
    for user in store.data["users"]:
        if user["role"] != "MEMBER":
            continue
        user_devices = [device for device in store.data["devices"] if device["userId"] == user["id"]]
        active_count = sum(1 for device in user_devices if device["status"])
        users.append(
            {
                **store.sanitize_user(user),
                "deviceCount": len(user_devices),
                "activeDeviceCount": active_count,
            }
        )
    return users


@app.get("/api/users/{user_id}")
def user_detail(user_id: int):
    return store.sanitize_user(require_user(user_id))


@app.get("/api/logs")
def logs():
    return store.system_logs()


@app.post("/api/face/register")
def face_register(payload: FaceImagesRequest):
    user = require_user(payload.userId)
    if len(payload.images) != 5:
        raise HTTPException(status_code=400, detail="Cần đúng 5 ảnh mẫu để đăng ký khuôn mặt")
    try:
        template = face_engine.build_template(payload.images)
    except FaceEngineError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    face_auth = user.setdefault("faceAuth", {})
    timestamp = datetime.now(timezone.utc).isoformat()
    face_auth.update(
        {
            "enabled": True,
            "sampleCount": 5,
            "embedding": template.flatten().astype(float).tolist(),
            "threshold": face_engine.threshold,
            "registeredAt": face_auth.get("registeredAt") or timestamp,
            "updatedAt": timestamp,
        }
    )
    store.save()
    store.add_log(user["name"], "Đăng ký khuôn mặt (5 ảnh mẫu)", "success")
    return {
        "message": "Đã đăng ký khuôn mặt thành công",
        "user": store.sanitize_user(user),
    }


@app.post("/api/face/update")
def face_update(payload: FaceImagesRequest):
    user = require_user(payload.userId)
    if len(payload.images) != 5:
        raise HTTPException(status_code=400, detail="Cần đúng 5 ảnh mẫu để cập nhật khuôn mặt")
    try:
        template = face_engine.build_template(payload.images)
    except FaceEngineError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    face_auth = user.setdefault("faceAuth", {})
    timestamp = datetime.now(timezone.utc).isoformat()
    face_auth.update(
        {
            "enabled": True,
            "sampleCount": 5,
            "embedding": template.flatten().astype(float).tolist(),
            "threshold": face_engine.threshold,
            "registeredAt": face_auth.get("registeredAt") or timestamp,
            "updatedAt": timestamp,
        }
    )
    store.save()
    store.add_log(user["name"], "Cập nhật dữ liệu khuôn mặt", "success")
    return {
        "message": "Đã cập nhật dữ liệu khuôn mặt thành công",
        "user": store.sanitize_user(user),
    }


@app.post("/api/face/disable")
def face_disable(payload: FaceDisableRequest):
    user = require_user(payload.userId)
    user["faceAuth"] = {
        "enabled": False,
        "sampleCount": 0,
        "registeredAt": user.get("faceAuth", {}).get("registeredAt"),
        "threshold": face_engine.threshold,
        "embedding": [],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    store.save()
    store.add_log(user["name"], "Tắt đăng nhập bằng khuôn mặt", "warning")
    return {
        "message": "Đã tắt đăng nhập bằng khuôn mặt",
        "user": store.sanitize_user(user),
    }


@app.post("/api/face/login")
def face_login(payload: FaceLoginRequest):
    try:
        query_embedding = face_engine.embedding_from_data_url(payload.image)
    except FaceEngineError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    enrolled_users = []
    for user in store.data["users"]:
        face_auth = user.get("faceAuth") or {}
        embedding_values = face_auth.get("embedding") or []
        if face_auth.get("enabled") and embedding_values:
            enrolled_users.append((user, parse_embedding(embedding_values)))

    try:
        matched_user, score, second_score = face_engine.identify_best_match(query_embedding, enrolled_users)
    except FaceEngineError as error:
        store.add_log("System", f"Thử đăng nhập face thất bại: {error}", "warning")
        raise HTTPException(status_code=401, detail=str(error)) from error

    store.add_log(matched_user["name"], f"Đăng nhập bằng khuôn mặt (score={score:.4f})", "success")
    return {
        "message": "Xác thực khuôn mặt thành công",
        "score": round(score, 4),
        "secondScore": round(second_score, 4) if second_score >= 0 else None,
        "user": store.sanitize_user(matched_user),
        "token": create_token(matched_user["id"]),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)

from __future__ import annotations

import json
import shutil
import threading
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from face_engine import FaceEngine, FaceEngineError

BASE_DIR = Path(__file__).resolve().parent
SEED_PATH = BASE_DIR / "data_seed.json"
STORE_PATH = BASE_DIR / "data_store.json"
MODEL_DIR = BASE_DIR / "models"


class JsonStore:
    def __init__(self, seed_path: Path, store_path: Path):
        self.seed_path = seed_path
        self.store_path = store_path
        self.lock = threading.Lock()
        self.ensure_store()

    def ensure_store(self) -> None:
        if not self.store_path.exists():
            shutil.copy(self.seed_path, self.store_path)

    def load(self) -> Dict[str, Any]:
        with self.lock:
            self.ensure_store()
            return json.loads(self.store_path.read_text(encoding="utf-8"))

    def save(self, payload: Dict[str, Any]) -> None:
        with self.lock:
            tmp_path = self.store_path.with_suffix(".tmp")
            tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp_path.replace(self.store_path)


store = JsonStore(SEED_PATH, STORE_PATH)


_engine: Optional[FaceEngine] = None
_engine_error: Optional[str] = None


def get_face_engine() -> FaceEngine:
    global _engine, _engine_error
    if _engine is not None:
        return _engine
    try:
        _engine = FaceEngine(MODEL_DIR)
        _engine_error = None
        return _engine
    except FaceEngineError as exc:
        _engine_error = str(exc)
        raise


app = FastAPI(title="AIoT Smart Home Unified Backend", version="1.0.0")
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


class ToggleRequest(BaseModel):
    actorId: Optional[int] = None


class BulkPowerRequest(BaseModel):
    actorId: Optional[int] = None
    power: bool


class PermissionRequest(BaseModel):
    actorId: Optional[int] = None
    deviceTypes: List[str] = Field(default_factory=list)
    deviceIds: List[int] = Field(default_factory=list)


class FaceRegisterRequest(BaseModel):
    userId: int
    images: List[str] = Field(default_factory=list, min_length=1)


class FaceDisableRequest(BaseModel):
    userId: int


class FaceLoginRequest(BaseModel):
    image: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    payload = deepcopy(user)
    payload.pop("password", None)
    face_auth = payload.pop("faceAuth", {})
    payload["faceAuthEnabled"] = bool(face_auth.get("enabled"))
    payload["faceSampleCount"] = int(face_auth.get("sampleCount") or 0)
    payload["faceUpdatedAt"] = face_auth.get("updatedAt")
    payload["faceRegisteredAt"] = face_auth.get("registeredAt")
    payload["faceThreshold"] = face_auth.get("threshold", 0.42)
    payload.setdefault("permissions", {"deviceTypes": [], "deviceIds": []})
    return payload


def append_log(db: Dict[str, Any], *, user: str, action: str, level: str = "info") -> None:
    logs = db.setdefault("systemLogs", [])
    next_id = max((item["id"] for item in logs), default=0) + 1
    logs.insert(
        0,
        {
            "id": next_id,
            "timestamp": now_iso(),
            "user": user,
            "action": action,
            "level": level,
        },
    )


def get_user_by_id(db: Dict[str, Any], user_id: int) -> Dict[str, Any]:
    for user in db["users"]:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")


def get_allowed_devices_for_user(db: Dict[str, Any], user: Dict[str, Any]) -> List[Dict[str, Any]]:
    devices = db["devices"]
    if user["role"] == "ADMIN":
        return devices
    if user["role"] != "MEMBER":
        return []
    allowed_types = set(user.get("permissions", {}).get("deviceTypes", []))
    allowed_ids = set(user.get("permissions", {}).get("deviceIds", []))
    return [
        device
        for device in devices
        if device["type"] in allowed_types or device["id"] in allowed_ids
    ]


def build_member_summary(db: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    allowed_devices = get_allowed_devices_for_user(db, user)
    active_count = sum(1 for item in allowed_devices if item.get("power"))
    online_count = sum(1 for item in allowed_devices if item.get("online"))
    payload = sanitize_user(user)
    payload["deviceCount"] = len(allowed_devices)
    payload["activeDeviceCount"] = active_count
    payload["onlineDeviceCount"] = online_count
    return payload


def compute_device_default_value(device_type: str) -> int:
    if device_type == "light":
        return 80
    if device_type == "fan":
        return 3
    if device_type == "ac":
        return 24
    return 1


def set_device_power(device: Dict[str, Any], power: bool) -> None:
    device["power"] = power
    if power:
        device["value"] = compute_device_default_value(device["type"])
    else:
        device["value"] = 0


def average_embeddings(items: List[np.ndarray]) -> np.ndarray:
    merged = np.mean(np.stack(items, axis=0), axis=0)
    norm = np.linalg.norm(merged)
    if not norm:
        raise HTTPException(status_code=400, detail="Embedding khuôn mặt không hợp lệ")
    return merged / norm


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login")
def login(request: LoginRequest) -> Dict[str, Any]:
    db = store.load()
    user = next(
        (item for item in db["users"] if item["email"] == request.email and item["password"] == request.password),
        None,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    append_log(db, user=user["name"], action="Đăng nhập bằng mật khẩu", level="info")
    store.save(db)

    return {"user": sanitize_user(user), "token": f"mock-token-{user['id']}"}


@app.get("/api/sensors")
def sensors(userId: int = Query(..., alias="userId")) -> Dict[str, Any]:
    db = store.load()
    payload = db.get("sensors", {}).get(str(userId))
    if not payload:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu cảm biến")
    return payload


@app.get("/api/devices")
def list_devices(userId: Optional[int] = Query(None, alias="userId")) -> List[Dict[str, Any]]:
    db = store.load()
    if userId is None:
        return db["devices"]
    user = get_user_by_id(db, userId)
    return get_allowed_devices_for_user(db, user)


@app.post("/api/devices/{device_id}/toggle")
def toggle_device(device_id: int, request: ToggleRequest) -> Dict[str, Any]:
    db = store.load()
    actor = get_user_by_id(db, request.actorId) if request.actorId is not None else None
    device = next((item for item in db["devices"] if item["id"] == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
    if not device.get("online"):
        raise HTTPException(status_code=400, detail="Thiết bị đang offline, không thể bật/tắt")
    if actor and actor["role"] == "MEMBER":
        allowed_ids = {item["id"] for item in get_allowed_devices_for_user(db, actor)}
        if device_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Bạn không có quyền điều khiển thiết bị này")

    next_power = not bool(device.get("power"))
    set_device_power(device, next_power)
    append_log(
        db,
        user=actor["name"] if actor else "System",
        action=f"{'Bật' if next_power else 'Tắt'} {device['name']}",
        level="success" if next_power else "info",
    )
    store.save(db)
    return device


@app.post("/api/devices/bulk-power")
def bulk_power(request: BulkPowerRequest) -> Dict[str, Any]:
    db = store.load()
    if request.actorId is None:
        raise HTTPException(status_code=403, detail="Thiếu actorId")
    actor = get_user_by_id(db, request.actorId)
    if actor["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Chỉ ADMIN mới được điều khiển tất cả thiết bị")

    for device in db["devices"]:
        if device.get("online"):
            set_device_power(device, request.power)

    append_log(
        db,
        user=actor["name"],
        action=f"{'Bật' if request.power else 'Tắt'} tất cả thiết bị online",
        level="success",
    )
    store.save(db)
    return {"devices": db["devices"]}


@app.get("/api/users")
def list_users() -> List[Dict[str, Any]]:
    db = store.load()
    return [build_member_summary(db, user) for user in db["users"] if user["role"] == "MEMBER"]


@app.get("/api/users/{user_id}")
def get_user(user_id: int) -> Dict[str, Any]:
    db = store.load()
    user = get_user_by_id(db, user_id)
    if user["role"] == "MEMBER":
        return build_member_summary(db, user)
    return sanitize_user(user)


@app.patch("/api/users/{user_id}/permissions")
def update_permissions(user_id: int, request: PermissionRequest) -> Dict[str, Any]:
    db = store.load()
    target_user = get_user_by_id(db, user_id)
    if target_user["role"] != "MEMBER":
        raise HTTPException(status_code=400, detail="Chỉ có thể phân quyền cho tài khoản MEMBER")
    actor_name = "Admin"
    if request.actorId is not None:
        actor = get_user_by_id(db, request.actorId)
        if actor["role"] != "ADMIN":
            raise HTTPException(status_code=403, detail="Chỉ ADMIN mới được phép phân quyền")
        actor_name = actor["name"]

    valid_types = {device["type"] for device in db["devices"]}
    valid_ids = {device["id"] for device in db["devices"]}
    target_user["permissions"] = {
        "deviceTypes": [item for item in dict.fromkeys(request.deviceTypes) if item in valid_types],
        "deviceIds": [item for item in dict.fromkeys(request.deviceIds) if item in valid_ids],
    }

    append_log(db, user=actor_name, action=f"Cập nhật phân quyền cho {target_user['name']}", level="success")
    store.save(db)
    return {"message": "Phân quyền thành công", "user": build_member_summary(db, target_user)}


@app.get("/api/logs")
def logs() -> List[Dict[str, Any]]:
    db = store.load()
    return db.get("systemLogs", [])


@app.get("/api/face/health")
def face_health() -> Dict[str, Any]:
    try:
        get_face_engine()
        return {"available": True, "message": "Face recognition đã sẵn sàng"}
    except FaceEngineError as exc:
        return {"available": False, "message": str(exc)}


@app.post("/api/face/register")
def face_register(request: FaceRegisterRequest) -> Dict[str, Any]:
    if len(request.images) != 5:
        raise HTTPException(status_code=400, detail="Cần đúng 5 ảnh mẫu để đăng ký Face ID")
    db = store.load()
    user = get_user_by_id(db, request.userId)
    try:
        engine = get_face_engine()
        embeddings = [engine.extract_embedding_from_data_url(image) for image in request.images]
    except FaceEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    merged = average_embeddings(embeddings)
    face_auth = user.setdefault("faceAuth", {})
    face_auth["enabled"] = True
    face_auth["sampleCount"] = len(request.images)
    face_auth["registeredAt"] = face_auth.get("registeredAt") or now_iso()
    face_auth["updatedAt"] = now_iso()
    face_auth["threshold"] = 0.42
    face_auth["embedding"] = merged.tolist()

    append_log(db, user=user["name"], action="Đăng ký Face ID", level="success")
    store.save(db)
    return {"message": "Đăng ký Face ID thành công", "user": sanitize_user(user)}


@app.post("/api/face/update")
def face_update(request: FaceRegisterRequest) -> Dict[str, Any]:
    if len(request.images) != 5:
        raise HTTPException(status_code=400, detail="Cần đúng 5 ảnh mẫu để cập nhật Face ID")
    db = store.load()
    user = get_user_by_id(db, request.userId)
    try:
        engine = get_face_engine()
        embeddings = [engine.extract_embedding_from_data_url(image) for image in request.images]
    except FaceEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    merged = average_embeddings(embeddings)
    face_auth = user.setdefault("faceAuth", {})
    face_auth["enabled"] = True
    face_auth["sampleCount"] = len(request.images)
    face_auth["registeredAt"] = face_auth.get("registeredAt") or now_iso()
    face_auth["updatedAt"] = now_iso()
    face_auth["threshold"] = face_auth.get("threshold", 0.42)
    face_auth["embedding"] = merged.tolist()

    append_log(db, user=user["name"], action="Cập nhật Face ID", level="success")
    store.save(db)
    return {"message": "Cập nhật Face ID thành công", "user": sanitize_user(user)}


@app.post("/api/face/disable")
def face_disable(request: FaceDisableRequest) -> Dict[str, Any]:
    db = store.load()
    user = get_user_by_id(db, request.userId)
    face_auth = user.setdefault("faceAuth", {})
    face_auth["enabled"] = False
    face_auth["sampleCount"] = 0
    face_auth["updatedAt"] = now_iso()
    face_auth["embedding"] = []

    append_log(db, user=user["name"], action="Tắt Face ID", level="info")
    store.save(db)
    return {"message": "Đã tắt Face ID", "user": sanitize_user(user)}


@app.post("/api/face/login")
def face_login(request: FaceLoginRequest) -> Dict[str, Any]:
    db = store.load()
    try:
        engine = get_face_engine()
        incoming = engine.extract_embedding_from_data_url(request.image)
    except FaceEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    best_user: Optional[Dict[str, Any]] = None
    best_score = -1.0
    best_threshold = 0.42

    for user in db["users"]:
        face_auth = user.get("faceAuth", {})
        if not face_auth.get("enabled") or not face_auth.get("embedding"):
            continue
        stored = np.asarray(face_auth["embedding"], dtype=np.float32)
        score = engine.cosine_similarity(incoming, stored)
        threshold = float(face_auth.get("threshold", 0.42))
        if score >= threshold and score > best_score:
            best_score = score
            best_user = user
            best_threshold = threshold

    if not best_user:
        raise HTTPException(status_code=401, detail="Không khớp với bất kỳ Face ID đã đăng ký nào")

    append_log(
        db,
        user=best_user["name"],
        action=f"Đăng nhập bằng Face ID (score={best_score:.3f}, threshold={best_threshold:.2f})",
        level="success",
    )
    store.save(db)
    return {
        "message": "Xác thực khuôn mặt thành công",
        "user": sanitize_user(best_user),
        "token": f"mock-token-{best_user['id']}",
        "score": round(best_score, 4),
    }

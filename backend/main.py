from __future__ import annotations

import json
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import create_pool, close_pool, get_pool, record_to_dict, records_to_list
from face_engine import FaceEngine, FaceEngineError

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

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


@asynccontextmanager
async def lifespan(application: FastAPI):
    await create_pool()
    yield
    await close_pool()


app = FastAPI(title="AIoT Smart Home Unified Backend", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_permissions(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, str):
        return json.loads(raw)
    if isinstance(raw, dict):
        return raw
    return {"deviceTypes": [], "deviceIds": []}


def parse_face_auth(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, str):
        return json.loads(raw)
    if isinstance(raw, dict):
        return raw
    return {"enabled": False, "sampleCount": 0, "registeredAt": None, "updatedAt": None, "threshold": 0.42, "embedding": []}


def row_to_user(record) -> Dict[str, Any]:
    d = record_to_dict(record)
    d["permissions"] = parse_permissions(d.get("permissions"))
    d["faceAuth"] = parse_face_auth(d.pop("face_auth", None))
    d.pop("created_at", None)
    return d


def row_to_device(record) -> Dict[str, Any]:
    d = record_to_dict(record)
    d.pop("created_at", None)
    return d


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


def get_allowed_devices(user: Dict[str, Any], devices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if user["role"] == "ADMIN":
        return devices
    if user["role"] != "MEMBER":
        return []
    perms = user.get("permissions", {})
    allowed_types = set(perms.get("deviceTypes", []))
    allowed_ids = set(perms.get("deviceIds", []))
    return [d for d in devices if d["type"] in allowed_types or d["id"] in allowed_ids]


def build_member_summary(user: Dict[str, Any], devices: List[Dict[str, Any]]) -> Dict[str, Any]:
    allowed = get_allowed_devices(user, devices)
    payload = sanitize_user(user)
    payload["deviceCount"] = len(allowed)
    payload["activeDeviceCount"] = sum(1 for d in allowed if d.get("power"))
    payload["onlineDeviceCount"] = sum(1 for d in allowed if d.get("online"))
    return payload


def compute_device_default_value(device_type: str) -> int:
    if device_type == "light":
        return 80
    if device_type == "fan":
        return 3
    if device_type == "ac":
        return 24
    return 1


async def db_get_user_by_id(user_id: int) -> Dict[str, Any]:
    pool = get_pool()
    row = await pool.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return row_to_user(row)


async def db_get_all_devices() -> List[Dict[str, Any]]:
    pool = get_pool()
    rows = await pool.fetch("SELECT * FROM devices ORDER BY id")
    return [row_to_device(r) for r in rows]


async def db_append_log(*, user: str, action: str, level: str = "info") -> None:
    pool = get_pool()
    await pool.execute(
        'INSERT INTO system_logs ("user", action, level) VALUES ($1, $2, $3)',
        user, action, level,
    )


def average_embeddings(items: List[np.ndarray]) -> np.ndarray:
    merged = np.mean(np.stack(items, axis=0), axis=0)
    norm = np.linalg.norm(merged)
    if not norm:
        raise HTTPException(status_code=400, detail="Embedding khuôn mặt không hợp lệ")
    return merged / norm


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login")
async def login(request: LoginRequest) -> Dict[str, Any]:
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM users WHERE email = $1 AND password = $2",
        request.email, request.password,
    )
    if not row:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    user = row_to_user(row)
    await db_append_log(user=user["name"], action="Đăng nhập bằng mật khẩu", level="info")
    return {"user": sanitize_user(user), "token": f"mock-token-{user['id']}"}


@app.get("/api/sensors")
async def sensors(userId: int = Query(..., alias="userId")) -> Dict[str, Any]:
    pool = get_pool()
    rows = await pool.fetch(
        "SELECT time, temperature, humidity, light FROM sensor_data WHERE user_id = $1 ORDER BY time",
        userId,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu cảm biến")

    temperature = []
    humidity = []
    light = []
    for r in rows:
        temperature.append({"time": r["time"], "value": r["temperature"]})
        humidity.append({"time": r["time"], "value": r["humidity"]})
        light.append({"time": r["time"], "value": r["light"]})

    return {"temperature": temperature, "humidity": humidity, "light": light}


@app.get("/api/devices")
async def list_devices(userId: Optional[int] = Query(None, alias="userId")) -> List[Dict[str, Any]]:
    devices = await db_get_all_devices()
    if userId is None:
        return devices
    user = await db_get_user_by_id(userId)
    return get_allowed_devices(user, devices)


@app.post("/api/devices/{device_id}/toggle")
async def toggle_device(device_id: int, request: ToggleRequest) -> Dict[str, Any]:
    pool = get_pool()
    actor = await db_get_user_by_id(request.actorId) if request.actorId is not None else None

    row = await pool.fetchrow("SELECT * FROM devices WHERE id = $1", device_id)
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")

    device = row_to_device(row)
    if not device.get("online"):
        raise HTTPException(status_code=400, detail="Thiết bị đang offline, không thể bật/tắt")

    if actor and actor["role"] == "MEMBER":
        all_devices = await db_get_all_devices()
        allowed_ids = {d["id"] for d in get_allowed_devices(actor, all_devices)}
        if device_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Bạn không có quyền điều khiển thiết bị này")

    next_power = not bool(device.get("power"))
    next_value = compute_device_default_value(device["type"]) if next_power else 0

    updated = await pool.fetchrow(
        "UPDATE devices SET power = $1, value = $2 WHERE id = $3 RETURNING *",
        next_power, next_value, device_id,
    )

    actor_name = actor["name"] if actor else "System"
    await db_append_log(
        user=actor_name,
        action=f"{'Bật' if next_power else 'Tắt'} {device['name']}",
        level="success" if next_power else "info",
    )
    return row_to_device(updated)


@app.post("/api/devices/bulk-power")
async def bulk_power(request: BulkPowerRequest) -> Dict[str, Any]:
    if request.actorId is None:
        raise HTTPException(status_code=403, detail="Thiếu actorId")
    actor = await db_get_user_by_id(request.actorId)
    if actor["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Chỉ ADMIN mới được điều khiển tất cả thiết bị")

    pool = get_pool()
    for device in await db_get_all_devices():
        if device.get("online"):
            new_value = compute_device_default_value(device["type"]) if request.power else 0
            await pool.execute(
                "UPDATE devices SET power = $1, value = $2 WHERE id = $3",
                request.power, new_value, device["id"],
            )

    await db_append_log(
        user=actor["name"],
        action=f"{'Bật' if request.power else 'Tắt'} tất cả thiết bị online",
        level="success",
    )
    devices = await db_get_all_devices()
    return {"devices": devices}


@app.get("/api/users")
async def list_users() -> List[Dict[str, Any]]:
    pool = get_pool()
    rows = await pool.fetch("SELECT * FROM users WHERE role = 'MEMBER' ORDER BY id")
    users = [row_to_user(r) for r in rows]
    devices = await db_get_all_devices()
    return [build_member_summary(u, devices) for u in users]


@app.get("/api/users/{user_id}")
async def get_user(user_id: int) -> Dict[str, Any]:
    user = await db_get_user_by_id(user_id)
    if user["role"] == "MEMBER":
        devices = await db_get_all_devices()
        return build_member_summary(user, devices)
    return sanitize_user(user)


@app.patch("/api/users/{user_id}/permissions")
async def update_permissions(user_id: int, request: PermissionRequest) -> Dict[str, Any]:
    target_user = await db_get_user_by_id(user_id)
    if target_user["role"] != "MEMBER":
        raise HTTPException(status_code=400, detail="Chỉ có thể phân quyền cho tài khoản MEMBER")

    actor_name = "Admin"
    if request.actorId is not None:
        actor = await db_get_user_by_id(request.actorId)
        if actor["role"] != "ADMIN":
            raise HTTPException(status_code=403, detail="Chỉ ADMIN mới được phép phân quyền")
        actor_name = actor["name"]

    devices = await db_get_all_devices()
    valid_types = {d["type"] for d in devices}
    valid_ids = {d["id"] for d in devices}
    new_perms = {
        "deviceTypes": [t for t in dict.fromkeys(request.deviceTypes) if t in valid_types],
        "deviceIds": [i for i in dict.fromkeys(request.deviceIds) if i in valid_ids],
    }

    pool = get_pool()
    await pool.execute(
        "UPDATE users SET permissions = $1 WHERE id = $2",
        json.dumps(new_perms), user_id,
    )

    await db_append_log(user=actor_name, action=f"Cập nhật phân quyền cho {target_user['name']}", level="success")

    updated_user = await db_get_user_by_id(user_id)
    return {"message": "Phân quyền thành công", "user": build_member_summary(updated_user, devices)}


@app.get("/api/logs")
async def logs() -> List[Dict[str, Any]]:
    pool = get_pool()
    rows = await pool.fetch('SELECT id, "user", action, level, created_at AS timestamp FROM system_logs ORDER BY created_at DESC')
    result = []
    for r in rows:
        d = record_to_dict(r)
        if d.get("timestamp"):
            d["timestamp"] = d["timestamp"].isoformat() if hasattr(d["timestamp"], "isoformat") else str(d["timestamp"])
        result.append(d)
    return result


# ---------------------------------------------------------------------------
# Face ID endpoints
# ---------------------------------------------------------------------------

@app.get("/api/face/health")
async def face_health() -> Dict[str, Any]:
    try:
        get_face_engine()
        return {"available": True, "message": "Face recognition đã sẵn sàng"}
    except FaceEngineError as exc:
        return {"available": False, "message": str(exc)}


@app.post("/api/face/register")
async def face_register(request: FaceRegisterRequest) -> Dict[str, Any]:
    if len(request.images) != 5:
        raise HTTPException(status_code=400, detail="Cần đúng 5 ảnh mẫu để đăng ký Face ID")

    user = await db_get_user_by_id(request.userId)
    try:
        engine = get_face_engine()
        embeddings = [engine.extract_embedding_from_data_url(img) for img in request.images]
    except FaceEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    merged = average_embeddings(embeddings)
    now = now_iso()
    face_auth = user.get("faceAuth", {})
    new_face_auth = {
        "enabled": True,
        "sampleCount": len(request.images),
        "registeredAt": face_auth.get("registeredAt") or now,
        "updatedAt": now,
        "threshold": 0.42,
        "embedding": merged.tolist(),
    }

    pool = get_pool()
    await pool.execute(
        "UPDATE users SET face_auth = $1 WHERE id = $2",
        json.dumps(new_face_auth), request.userId,
    )
    await db_append_log(user=user["name"], action="Đăng ký Face ID", level="success")

    updated = await db_get_user_by_id(request.userId)
    return {"message": "Đăng ký Face ID thành công", "user": sanitize_user(updated)}


@app.post("/api/face/update")
async def face_update(request: FaceRegisterRequest) -> Dict[str, Any]:
    if len(request.images) != 5:
        raise HTTPException(status_code=400, detail="Cần đúng 5 ảnh mẫu để cập nhật Face ID")

    user = await db_get_user_by_id(request.userId)
    try:
        engine = get_face_engine()
        embeddings = [engine.extract_embedding_from_data_url(img) for img in request.images]
    except FaceEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    merged = average_embeddings(embeddings)
    now = now_iso()
    face_auth = user.get("faceAuth", {})
    new_face_auth = {
        "enabled": True,
        "sampleCount": len(request.images),
        "registeredAt": face_auth.get("registeredAt") or now,
        "updatedAt": now,
        "threshold": face_auth.get("threshold", 0.42),
        "embedding": merged.tolist(),
    }

    pool = get_pool()
    await pool.execute(
        "UPDATE users SET face_auth = $1 WHERE id = $2",
        json.dumps(new_face_auth), request.userId,
    )
    await db_append_log(user=user["name"], action="Cập nhật Face ID", level="success")

    updated = await db_get_user_by_id(request.userId)
    return {"message": "Cập nhật Face ID thành công", "user": sanitize_user(updated)}


@app.post("/api/face/disable")
async def face_disable(request: FaceDisableRequest) -> Dict[str, Any]:
    user = await db_get_user_by_id(request.userId)
    now = now_iso()
    new_face_auth = {
        "enabled": False,
        "sampleCount": 0,
        "registeredAt": user.get("faceAuth", {}).get("registeredAt"),
        "updatedAt": now,
        "threshold": 0.42,
        "embedding": [],
    }

    pool = get_pool()
    await pool.execute(
        "UPDATE users SET face_auth = $1 WHERE id = $2",
        json.dumps(new_face_auth), request.userId,
    )
    await db_append_log(user=user["name"], action="Tắt Face ID", level="info")

    updated = await db_get_user_by_id(request.userId)
    return {"message": "Đã tắt Face ID", "user": sanitize_user(updated)}


@app.post("/api/face/login")
async def face_login(request: FaceLoginRequest) -> Dict[str, Any]:
    try:
        engine = get_face_engine()
        incoming = engine.extract_embedding_from_data_url(request.image)
    except FaceEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    pool = get_pool()
    rows = await pool.fetch("SELECT * FROM users")

    best_user: Optional[Dict[str, Any]] = None
    best_score = -1.0
    best_threshold = 0.42

    for row in rows:
        user = row_to_user(row)
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

    await db_append_log(
        user=best_user["name"],
        action=f"Đăng nhập bằng Face ID (score={best_score:.3f}, threshold={best_threshold:.2f})",
        level="success",
    )
    return {
        "message": "Xác thực khuôn mặt thành công",
        "user": sanitize_user(best_user),
        "token": f"mock-token-{best_user['id']}",
        "score": round(best_score, 4),
    }

import base64
import cv2
import numpy as np
from fastapi import APIRouter, Request

from database import get_pool
from hud_engine import IronManHUD_Engine 

router = APIRouter()
engine = IronManHUD_Engine()

async def sync_gesture_to_database(actor_id: int, target: str, action: str):
    """Translates YOLO targets and AI gestures into actual Database Updates"""
    pool = get_pool()
    target_lower = target.lower()

    device_type = None
    if "fan" in target_lower:
        device_type = "fan"
    elif "ac" in target_lower or "cassette" in target_lower:
        device_type = "ac"

    if not device_type:
        return

    # ⚡ THE FIX: Added 'AND online = true' to completely ignore dead/unplugged devices
    device = await pool.fetchrow(
        "SELECT * FROM devices WHERE type = $1 AND online = true ORDER BY id ASC LIMIT 1", 
        device_type
    )
    
    if not device:
        return

    dev_id = device["id"]
    dev_name = device["name"]
    
    current_power = device.get("power", False)
    current_value = device.get("value", 0)
    
    # Check if the database has a swing column (For your Fan)
    has_swing_col = "swing" in device
    new_swing = False
    if has_swing_col:
        new_swing = device.get("swing", False)

    new_power = current_power
    new_value = current_value

    # --- ACTION TRANSLATION LOGIC ---
    if action == "POWER ON":
        new_power = True
        if new_value == 0:
            new_value = 24 if device_type == "ac" else 1
    elif action == "POWER OFF":
        new_power = False
        new_value = 0
    elif action == "TEMP UP":
        new_power = True
        new_value += 1
    elif action == "TEMP DOWN":
        new_power = True
        new_value -= 1
    elif action == "SPEED 1":
        new_power = True
        new_value = 1
    elif action == "SPEED 2":
        new_power = True
        new_value = 2
    elif action == "SPEED 3":
        new_power = True
        new_value = 3
    elif action == "SWING ON" and has_swing_col:
        new_power = True
        new_swing = True
    elif action == "SWING OFF" and has_swing_col:
        new_power = True
        new_swing = False

    # Execute the Database Update Dynamically
    if has_swing_col:
        await pool.execute(
            "UPDATE devices SET power = $1, value = $2, swing = $3 WHERE id = $4",
            new_power, new_value, new_swing, dev_id
        )
    else:
        await pool.execute(
            "UPDATE devices SET power = $1, value = $2 WHERE id = $3",
            new_power, new_value, dev_id
        )

    user = await pool.fetchrow("SELECT name FROM users WHERE id = $1", actor_id)
    actor_name = user["name"] if user else "Gesture AI"
    
    await pool.execute(
        'INSERT INTO system_logs ("user", action, level) VALUES ($1, $2, $3)',
        actor_name, f"AI Gesture ({action}) trên {dev_name}", "success"
    )

@router.post("/process")
async def process_gesture(request: Request):
    try:
        data = await request.json()
        actor_id = data.get("actorId", 1) 

        base64_img = data.get("frames", {}).get("cam_1")
        if not base64_img:
            return {"event": "IDLE", "error": "No image provided"}
        
        img_data = base64.b64decode(base64_img.split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"event": "IDLE", "error": "Failed to decode image"}

        drawn_frame, event, action, target = engine.process_frame(frame)
        
        if event == "COMMAND_ISSUED" and target and action:
            await sync_gesture_to_database(actor_id, target, action)
        
        _, buffer = cv2.imencode('.jpg', drawn_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
        drawn_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "event": event,
            "action": action,
            "target": target,
            "drawn_frame": drawn_base64
        }

    except Exception as e:
        print(f"Error processing frame: {e}")
        return {"event": "IDLE", "error": str(e)}
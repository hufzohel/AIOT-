from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
import sys
from pathlib import Path

# Ensure Python can find your AI files
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Import the new Master Brain
from master_consensus_engine import MultiCameraEngine

router = APIRouter()

# 1. Initialize the Master Brain (which automatically loads the Tracker and Detector)
try:
    engine = MultiCameraEngine()
    print("✅ Multi-Camera Consensus Engine loaded and online.")
except Exception as e:
    print(f"⚠️ Warning: Could not load Master Engine: {e}")
    engine = None

# 2. Update the Schema: We now expect a payload of MULTIPLE cameras
class RoomStateRequest(BaseModel):
    # Expecting a dictionary like:
    # {
    #   "cam_1": "base64_string...",
    #   "cam_2": "base64_string...",
    #   "cam_3": "base64_string..."
    # }
    frames: Dict[str, str]

@router.post("/process")
async def process_room_gestures(request: RoomStateRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="Consensus Engine is offline")
    
    try:
        # Hand the entire room's visual data to the Master Brain
        result = engine.process_room_state(request.frames)
        
        # NOTE: If result["event"] == "COMMAND_ISSUED", 
        # this is where we will trigger the PostgreSQL update!
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
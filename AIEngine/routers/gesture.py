from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
# Import the engine you already built!
from gesture_engine import GestureEngine, GestureEngineError
from pathlib import Path

# Create the router (the socket)
router = APIRouter()

# Initialize the brain (pointing to your models folder)
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
try:
    engine = GestureEngine(MODEL_DIR)
except Exception as e:
    print(f"Warning: Could not load GestureEngine: {e}")
    engine = None

# Create a strict schema for what the frontend is allowed to send
class FrameRequest(BaseModel):
    image: str  # The base64 string from the webcam

@router.post("/process")
async def process_gesture(request: FrameRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="Gesture Engine is offline")
    
    try:
        # Hand the frame to the brain, get the answer back
        result = engine.process_frame(request.image)
        
        # NOTE: This is where we will eventually add the code to 
        # touch the PostgreSQL vault if a signal (like FAN_ON) is detected.
        
        return result
    except GestureEngineError as e:
        raise HTTPException(status_code=400, detail=str(e))
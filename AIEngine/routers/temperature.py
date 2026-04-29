from fastapi import APIRouter, HTTPException
import torch
import math
from datetime import datetime
from pathlib import Path
import sys

# Ensure Python can find your AI files
sys.path.append(str(Path(__file__).resolve().parent.parent))
from gru_model import TempPredictorGRU
from fetch_data import get_hourly_sequence  # YOUR CLOUD SCRIPT!

router = APIRouter()

# 1. Load the Brain
model = TempPredictorGRU(input_size=4, hidden_size=64, num_layers=2)
MODEL_PATH = Path(__file__).resolve().parent.parent / "multivariate_gru.pth"

try:
    model.load_state_dict(torch.load(MODEL_PATH, weights_only=True))
    model.eval()
    print("✅ Temperature GRU loaded and online.")
except Exception as e:
    print(f"⚠️ Warning: Could not load Temperature GRU: {e}")
    model = None

# Notice this is now a GET request! The frontend sends NO data.
@router.get("/predict")
async def predict_temperature():
    if not model:
        raise HTTPException(status_code=500, detail="AI Model is offline")

    try:
        # 1. Tell the backend to fetch the last 24 hours from the Cloud
        # NOTE: Right now your fetch_data.py only gets 1 variable. 
        # When you get back from your trip, you will update it to fetch all 4!
        raw_cloud_data = get_hourly_sequence(hours=24)
        
        if not raw_cloud_data or len(raw_cloud_data) < 24:
            raise HTTPException(status_code=502, detail="Cloud sensor data unavailable")

        # 2. (Placeholder) Format the cloud data into your 4D tensor
        # This assumes your updated fetch_data will return [Indoor, Outdoor, Hum, Time]
        input_tensor = torch.tensor([raw_cloud_data], dtype=torch.float32)

        # 3. Run the prediction
        with torch.no_grad():
            prediction = model(input_tensor)

        predicted_temp = round(prediction.item(), 2)

        # 4. Serve the simple answer to the React frontend
        return {
            "status": "success", 
            "prediction_celsius": predicted_temp,
            "message": "Fetched from Adafruit Cloud & Processed by AI"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
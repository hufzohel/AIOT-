from fastapi import APIRouter, HTTPException
import torch
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))
from gru_model import TempPredictorGRU
from fetch_data import get_hourly_sequence 

router = APIRouter()

model = TempPredictorGRU(input_size=4, hidden_size=64, num_layers=2)
MODEL_PATH = Path(__file__).resolve().parent.parent / "multivariate_gru.pth"

try:
    model.load_state_dict(torch.load(MODEL_PATH, weights_only=True))
    model.eval()
    print("✅ Temperature GRU loaded and online.")
except Exception as e:
    print(f"⚠️ Warning: Could not load Temperature GRU: {e}")
    model = None

@router.get("/predict")
async def predict_temperature():
    if not model:
        raise HTTPException(status_code=500, detail="AI Model is offline")

    try:
        raw_cloud_data = get_hourly_sequence()
        
        if not raw_cloud_data or len(raw_cloud_data) < 24:
            raise HTTPException(status_code=502, detail="Sensor data unavailable")

        current_seq = raw_cloud_data.copy()
        future_predictions = []

        # --- THE AUTOREGRESSIVE LOOP (Predicting 4 hours) ---
        for _ in range(4):
            # Squish the data
            input_tensor = torch.tensor([current_seq], dtype=torch.float32) / 100.0
            
            with torch.no_grad():
                pred = model(input_tensor).item() * 100.0 # Un-squish the result
                
            future_predictions.append(round(pred, 1))
            
            # Slide the window forward!
            last_known = current_seq[-1]
            next_step = [
                pred,            # The AI's new predicted Indoor Temp
                last_known[1],   # Carry over the last known Outdoor Temp
                last_known[2],   # Carry over the last known Humidity
                last_known[3]    # Carry over Time Sin 
            ]
            
            # Drop the oldest hour, append the newly predicted hour
            current_seq = current_seq[1:] + [next_step]

        # Return both the single number (for the card) and the array (for the chart)
        return {
            "prediction_celsius": future_predictions[0], 
            "predictions_4hr": future_predictions, 
            "message": "Dự báo 4 giờ tiếp theo"
        }

    except Exception as e:
        print(f"⚠️ Temperature Prediction Error: {e}")
        return {
            "prediction_celsius": "--", 
            "predictions_4hr": [],
            "message": "Hệ thống AI đang khởi động hoặc lỗi dữ liệu."
        }
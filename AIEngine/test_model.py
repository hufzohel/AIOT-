import torch
from gru_model import TempPredictorGRU
from fetch_data import get_hourly_sequence
from pathlib import Path

print("1. Fetching 24-hour sequence...")
data = get_hourly_sequence()

print("\n2. Initializing 4-Input GRU Model...")
# Matches the exact architecture of your trained brain
model = TempPredictorGRU(input_size=4, hidden_size=64, num_layers=2, output_size=1)

# Load your actual trained weights
MODEL_PATH = Path(__file__).resolve().parent / "multivariate_gru.pth"
try:
    model.load_state_dict(torch.load(MODEL_PATH, weights_only=True))
    model.eval()
    print("✅ Trained weights successfully loaded!")
except Exception as e:
    print(f"❌ Failed to load weights: {e}")

print("\n3. Formatting PyTorch Tensor...")
# SQUISH THE DATA going in (/ 100.0)
tensor_data = torch.tensor([data], dtype=torch.float32) / 100.0

print("\n4. Running AI Prediction...")
with torch.no_grad():
    prediction = model(tensor_data)

# UN-SQUISH THE DATA coming out (* 100.0)
predicted_temp = prediction.item() * 100.0
print(f"✅ REAL PREDICTION: {predicted_temp:.2f}°C")
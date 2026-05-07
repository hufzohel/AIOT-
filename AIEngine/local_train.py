from ultralytics import YOLO
import torch

print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")

def train_smart_home_edge_model():
    print("🚀 Booting YOLOv8 on Local CUDA GPU...")
    
    # 1. Load the pre-trained Nano brain (Fastest for Edge/TFLite)
    model = YOLO("yolov8n.pt")

    # 2. Train with aggressive augmentations to fight Feature Isolation
    results = model.train(
        data="data/data.yaml",  # Point to your Roboflow YOLOv8 export folder
        epochs=100,                # Max epochs
        patience=15,               # EARLY STOPPING: Stop if it plateaus for 15 epochs
        imgsz=512,                 # TFLite optimal size
        batch=8,        
        workers=4,                 # Data loading workers          
        device=0,                  # Forces local CUDA (0 is your first GPU)
        lr0=0.001,                 # The 0.001 gold standard learning rate
        weight_decay=0.0005,       # L2 Regularization (Anti-overfit)
        name="cheat-2",             # Save to runs/detect/train-7
        
        # --- ANTI-FEATURE ISOLATION TRICKS ---
        mosaic=1.0,                # CRITICAL: Cuts/pastes 4 images together to destroy clean backgrounds
        mixup=0.2,                 # Blends images together
        hsv_h=0.015,               # Randomizes hue (color)
        hsv_v=0.4,                 # Randomizes value (brightness for dorm lighting)
        degrees=10.0               # Randomizes rotation
    )

if __name__ == "__main__":
    train_smart_home_edge_model()
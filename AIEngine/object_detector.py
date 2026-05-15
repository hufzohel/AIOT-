from ultralytics import YOLO
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class DynamicDetector:
    def __init__(self, model_path=None):
        if model_path is None:
            model_path = BASE_DIR.parent / "runs" / "detect" / "cheat-2" / "weights" / "best.pt"
            
        print("🤖 Loading YOLOv8 Vision Engine...")
        print(f"   Model path: {model_path}")
        try:
            self.model = YOLO(str(model_path))
            print(f"✅ Vision Engine Online. Classes: {self.model.names}")
        except Exception as e:
            print(f"❌ FAILED TO LOAD MODEL: {e}")
            raise

    def get_bounding_boxes(self, frame) -> dict:
        try:
            results = self.model.predict(frame, conf=0.30, verbose=False)
            hitboxes = {}
            
            if results and len(results[0].boxes) > 0:
                print(f"🎯 Detected {len(results[0].boxes)} objects")
                for box in results[0].boxes:
                    coords = box.xyxy[0].tolist() 
                    class_id = int(box.cls[0].item())
                    class_name = self.model.names[class_id]
                    hitboxes[class_name] = coords
                    print(f"   - {class_name}: {coords}")
            else:
                print("⚪ No objects detected in frame")
                
            return hitboxes
        except Exception as e:
            print(f"❌ Detection error: {e}")
            return {}
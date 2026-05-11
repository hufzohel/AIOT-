from ultralytics import YOLO

class DynamicDetector:
    def __init__(self, model_path="your_model_path_here.pt"):
        print("🤖 Loading YOLOv8 Vision Engine...")
        self.model = YOLO(model_path)
        print("✅ Vision Engine Online.")

    def get_bounding_boxes(self, frame) -> dict:
        results = self.model.predict(frame, conf=0.30, verbose=False)
        hitboxes = {}
        for box in results[0].boxes:
            coords = box.xyxy[0].tolist() 
            class_id = int(box.cls[0].item())
            class_name = self.model.names[class_id]
            hitboxes[class_name] = coords
        return hitboxes
from ultralytics import YOLO

class DynamicDetector:
    def __init__(self, model_path="your_model_path_here.pt"):
        print("🤖 Loading YOLOv8 Vision Engine...")
        self.model = YOLO(model_path)
        print("✅ Vision Engine Online.")

    def get_bounding_boxes(self, frame) -> dict:
        """
        Takes a raw cv2 frame, returns a dict: {"Fan": [xmin, ymin, xmax, ymax]}
        """
        # verbose=False stops it from spamming your terminal every frame
        results = self.model.predict(frame, conf=0.50, verbose=False)
        
        hitboxes = {}
        # Loop through the detected boxes
        for box in results[0].boxes:
            # Extract coordinates and class name
            coords = box.xyxy[0].tolist()  # [xmin, ymin, xmax, ymax]
            class_id = int(box.cls[0].item())
            class_name = self.model.names[class_id]
            
            # Save it to our dictionary
            hitboxes[class_name] = coords
            
        return hitboxes
import cv2
import numpy as np
import base64
try:
    # This is what you install via requirements.txt
    import ai_edge_litert.interpreter as tflite
except ImportError:
    print("⚠️ ai_edge_litert not installed. Object Detector will fail.")

class DynamicDetector:
    def __init__(self, model_path="models/model.tflite", label_path="models/labels.txt"):
        self.model_path = model_path
        
        try:
            # 1. Load the MobileNet TFLite Brain
            self.interpreter = tflite.Interpreter(model_path=self.model_path)
            self.interpreter.allocate_tensors()
            
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            
            # 2. Load your custom labels (e.g., "AC", "Fan")
            with open(label_path, 'r') as f:
                self.labels = [line.strip() for line in f.readlines()]
                
            print("✅ MobileNet Object Detector loaded.")
            self.is_mock = False
        except Exception as e:
            print(f"⚠️ Warning: Could not load MobileNet ({e}). Running in MOCK mode.")
            self.is_mock = True

    def _decode_image(self, base64_image: str) -> np.ndarray:
        if "," in base64_image:
            _, encoded = base64_image.split(",", 1)
        else:
            encoded = base64_image
        arr = np.frombuffer(base64.b64decode(encoded), dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    def get_bounding_boxes(self, base64_image: str) -> dict:
        if self.is_mock:
            return {"AC": [0.0, 0.0, 0.4, 0.4], "Fan": [0.6, 0.6, 1.0, 1.0]}

        image = self._decode_image(base64_image)
        input_shape = self.input_details[0]['shape']
        resized_img = cv2.resize(image, (input_shape[1], input_shape[2]))
        input_data = np.expand_dims(resized_img, axis=0).astype(np.float32)
        input_data = (input_data / 127.5) - 1.0 

        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()

        # YOUR SPECIFIC OUTPUTS
        all_boxes = self.interpreter.get_tensor(self.output_details[0]['index'])[0] # [12276, 4]
        all_preds = self.interpreter.get_tensor(self.output_details[1]['index'])[0] # [12276, 6]

        hitboxes = {}
        
        for i in range(len(all_preds)):
            # The 6 values in all_preds[i] are likely: [Background, Fan, AC, Class3, Class4, Class5]
            # We find the highest score in that row (excluding background at index 0)
            scores = all_preds[i][1:] 
            max_score = np.max(scores)
            
            if max_score > 0.60: # 60% confidence
                class_id = np.argmax(scores) + 1 # +1 because we sliced off background
                
                if class_id < len(self.labels):
                    label_name = self.labels[class_id]
                    # SSD boxes are often [ymin, xmin, ymax, xmax]
                    ymin, xmin, ymax, xmax = all_boxes[i]
                    hitboxes[label_name] = [float(xmin), float(ymin), float(xmax), float(ymax)]

        return hitboxes
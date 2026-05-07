import cv2
import numpy as np

try:
    import ai_edge_litert.interpreter as tflite
except ImportError:
    print("⚠️ ai_edge_litert not installed.")
    exit()

print("Initializing Iron Man HUD...")

# ==========================================
# 🛠️ THE AI CONFIGURATION PANEL 🛠️
# Flip these switches to find your model's format
# ==========================================
USE_0_TO_1_NORM = True      # True = / 255.0 | False = / 127.5 - 1.0
USE_CENTER_MATH = True      # True = Model outputs [CenterY, CenterX, H, W]
IGNORE_CLASS_0 = False      # True = Skips Class 0 (Background) | False = Reads all classes
CONFIDENCE_THRESHOLD = 0.40 # How sure the AI needs to be (40%)
# ==========================================

model_path = "models/model.tflite"
label_path = "models/labels.txt"

interpreter = tflite.Interpreter(model_path=model_path)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()
input_shape = input_details[0]['shape']

with open(label_path, 'r') as f:
    labels = [line.strip() for line in f.readlines()]

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if not cap.isOpened():
    print("❌ ERROR: Camera is completely locked or unplugged.")
    exit()

print("HUD Online. Press 'q' to exit.")

while True:
    ret, frame = cap.read()
    if not ret: break

    # Mirror camera
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    # Pre-process
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    resized_img = cv2.resize(rgb_frame, (input_shape[1], input_shape[2]))
    input_data = np.expand_dims(resized_img, axis=0).astype(np.float32)
    
    if USE_0_TO_1_NORM:
        input_data = input_data / 255.0 
    else:
        input_data = (input_data / 127.5) - 1.0

    # Think
    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()

    all_boxes = interpreter.get_tensor(output_details[0]['index'])[0] 
    all_preds = interpreter.get_tensor(output_details[1]['index'])[0]

    # Filter Scores
    if IGNORE_CLASS_0:
        class_scores = all_preds[:, 1:] 
        max_scores = np.max(class_scores, axis=1)
        class_ids = np.argmax(class_scores, axis=1) + 1 
    else:
        max_scores = np.max(all_preds, axis=1)
        class_ids = np.argmax(all_preds, axis=1) 

    mask = max_scores > CONFIDENCE_THRESHOLD
    filtered_boxes = all_boxes[mask]
    filtered_scores = max_scores[mask]
    filtered_class_ids = class_ids[mask]

    # Box Math
    cv2_boxes = []
    for box in filtered_boxes:
        if USE_CENTER_MATH:
            y_center, x_center, box_h, box_w = box
            ymin = y_center - (box_h / 2.0)
            xmin = x_center - (box_w / 2.0)
            xmin_px, ymin_px = int(xmin * w), int(ymin * h)
            width_px, height_px = int(box_w * w), int(box_h * h)
            cv2_boxes.append([xmin_px, ymin_px, width_px, height_px])
        else:
            ymin, xmin, ymax, xmax = box
            xmin_px, ymin_px = int(xmin * w), int(ymin * h)
            xmax_px, ymax_px = int(xmax * w), int(ymax * h)
            cv2_boxes.append([xmin_px, ymin_px, xmax_px - xmin_px, ymax_px - ymin_px])

    # Draw
    if len(cv2_boxes) > 0:
        indices = cv2.dnn.NMSBoxes(cv2_boxes, filtered_scores.tolist(), CONFIDENCE_THRESHOLD, 0.40)
        if len(indices) > 0:
            for i in indices.flatten():
                x, y, bw, bh = cv2_boxes[i]
                score = filtered_scores[i]
                c_id = filtered_class_ids[i]
                
                if c_id < len(labels):
                    name = labels[c_id]
                    cv2.rectangle(frame, (x, y), (x + bw, y + bh), (0, 255, 0), 2)
                    cv2.putText(frame, f"{name} {int(score * 100)}%", 
                                (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    cv2.imshow("Iron Man Vision HUD", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()
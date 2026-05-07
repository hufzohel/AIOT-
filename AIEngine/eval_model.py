import os
import glob
import numpy as np
from ultralytics import YOLO

# ==========================================
# CONFIGURATION
# ==========================================
# Point this to your surviving V2 PyTorch brain!
MODEL_PATH = r"F:\Bach_khoa\HKCQ\HK252\DADN\CODE\AIOT-\runs\detect\train-2\weights\best.pt"
TEST_FOLDER = "test_images" # Point this to your test images!
CONFIDENCE_THRESHOLD = 0.50
# ==========================================

def run_evaluation():
    print("🤖 Loading PyTorch Model Brain...")
    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"❌ Failed to load model. Check your path! Error: {e}")
        return

    # Grab the labels directly from the model's brain dictionary
    labels = model.names 
    confusion_log = {label: 0 for label in labels.values()}

    image_files = glob.glob(os.path.join(TEST_FOLDER, "*.jpg")) + glob.glob(os.path.join(TEST_FOLDER, "*.png"))

    if not image_files:
        print(f"❌ Could not find any images in '{TEST_FOLDER}'")
        return

    print(f"\n🚀 Running Inference on {len(image_files)} test images...\n")

    total_images = len(image_files)
    detected_count = 0

    for img_path in image_files:
        img_name = os.path.basename(img_path)
        
        # YOLO handles the OpenCV reading and preprocessing automatically!
        # verbose=False stops it from spamming the console for every single image
        results = model.predict(source=img_path, conf=CONFIDENCE_THRESHOLD, verbose=False)
        
        boxes = results[0].boxes
        
        if len(boxes) > 0:
            # Extract confidences and class IDs from the tensor
            confs = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy()
            
            # Replicating your original logic: Grab the highest confidence detection
            best_idx = np.argmax(confs)
            best_class_id = int(classes[best_idx])
            best_score = confs[best_idx]
            
            detected_label = labels[best_class_id]
            confusion_log[detected_label] += 1
            detected_count += 1
            
            print(f"✅ {img_name} -> Found: {detected_label} ({int(best_score*100)}%)")
        else:
            print(f"👻 {img_name} -> Found NOTHING")

    # --- THE RESULTS ---
    print("\n" + "="*40)
    print("📊 V2 PYTORCH DIAGNOSTIC RESULTS")
    print("="*40)
    print(f"Total Images Checked: {total_images}")
    print(f"Images with a Detection: {detected_count} ({(detected_count/total_images)*100:.1f}%)")
    print("\nDetection Breakdown (Rough Confusion Proxy):")
    for label, count in confusion_log.items():
        print(f"  - {label}: {count} times")
    print("="*40)

if __name__ == "__main__":
    run_evaluation()
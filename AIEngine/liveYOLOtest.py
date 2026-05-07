import cv2
from ultralytics import YOLO

def boot_iron_man_hud():
    print("🤖 Booting PyTorch Vision Engine...")
    
    # 1. Load your surviving PyTorch brain
    model = YOLO(r"F:\Bach_khoa\HKCQ\HK252\DADN\CODE\AIOT-\runs\detect\cheat-2\weights\best.pt")

    print("🎥 Opening Webcam (Press 'q' to quit)...")
    
    # 2. Manually take control of the webcam
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        # Read the raw frame from the camera
        success, frame = cap.read()
        if not success:
            print("Failed to grab frame. Check webcam.")
            break

        # ---------------------------------------------------------
        # THE MIRROR FIX: 
        # Flip the frame horizontally BEFORE the AI sees it
        # 1 = horizontal flip, 0 = vertical flip
        frame = cv2.flip(frame, 1)
        # ---------------------------------------------------------

        # 3. Hand the mirrored frame to YOLO
        # We set verbose=False so it doesn't spam your terminal
        results = model.predict(frame, conf=0.30, verbose=False)

        # 4. Extract the frame with the boxes drawn on it
        annotated_frame = results[0].plot()

        # 5. Show it on your screen
        cv2.imshow("Iron Man HUD", annotated_frame)

        # 6. Listen for the 'q' key to quit cleanly
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # Clean up when you're done
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    boot_iron_man_hud()
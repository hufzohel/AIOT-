import cv2
import time
from object_detector import DynamicDetector
from hand_tracker import HandTracker

class IronManHUD:
    def __init__(self):
        # REPLACE THIS with your actual YOLOv8 .pt path
        self.detector = DynamicDetector(model_path=r"C:\YOUR\PATH\HERE\best.pt") 
        self.tracker = HandTracker()
        
        # --- MEMORY SYSTEM ---
        self.active_target = None
        self.target_timestamp = 0
        self.MEMORY_WINDOW = 180  # 3 minutes (180 seconds)
        
        # To prevent gesture spamming (triggering 30 times a second)
        self.last_action_time = 0 
        self.COOLDOWN = 2.0 # Wait 2 seconds between commands

    def _ray_intersects_box(self, ray_start, ray_end, bbox):
        """Simple math to check if the laser hits the bounding box"""
        rx1, ry1 = ray_start
        rx2, ry2 = ray_end
        b_xmin, b_ymin, b_xmax, b_ymax = bbox

        # Check if the start of the ray is already inside the box
        if b_xmin <= rx1 <= b_xmax and b_ymin <= ry1 <= b_ymax:
            return True

        def line_intersects_line(p1, p2, p3, p4):
            def ccw(A, B, C):
                return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
            return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

        borders = [
            ((b_xmin, b_ymin), (b_xmax, b_ymin)), 
            ((b_xmax, b_ymin), (b_xmax, b_ymax)), 
            ((b_xmax, b_ymax), (b_xmin, b_ymax)), 
            ((b_xmin, b_ymax), (b_xmin, b_ymin))  
        ]

        for edge_start, edge_end in borders:
            if line_intersects_line(ray_start, ray_end, edge_start, edge_end):
                return True
        return False

    def run(self):
        cap = cv2.VideoCapture(0)
        print("🎥 HUD Online. Press 'q' to quit.")

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            # THE MIRROR EFFECT
            frame = cv2.flip(frame, 1)

            # 1. Get Data
            hitboxes = self.detector.get_bounding_boxes(frame)
            hand_data = self.tracker.get_hand_state(frame)
            
            # --- MEMORY DECAY CHECK ---
            time_elapsed = time.time() - self.target_timestamp
            if self.active_target and time_elapsed > self.MEMORY_WINDOW:
                print(f"⌛ Target Lock Lost. {self.active_target} memory expired.")
                self.active_target = None

            # --- DRAW DETECTED MACHINES ---
            for device, bbox in hitboxes.items():
                xmin, ymin, xmax, ymax = map(int, bbox)
                color = (0, 255, 0) if device == self.active_target else (0, 0, 255)
                cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)
                cv2.putText(frame, device, (xmin, ymin - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            # --- PROCESS HAND & GESTURES ---
            if hand_data["detected"]:
                gesture = hand_data["gesture"]
                ray = hand_data["raycast_vector"]
                
                # Show active gesture on screen
                if gesture:
                    cv2.putText(frame, f"Gesture: {gesture}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

                # PHASE 1: TARGET ACQUISITION (Only if Pointing)
                if gesture == "Pointing_Up" and ray:
                    laser_start, laser_end = ray
                    # Draw the laser beam!
                    cv2.line(frame, laser_start, laser_end, (0, 255, 255), 2)
                    
                    for device, bbox in hitboxes.items():
                        if self._ray_intersects_box(laser_start, laser_end, bbox):
                            if self.active_target != device:
                                self.active_target = device
                                self.target_timestamp = time.time()
                                print(f"🎯 LOCKED ON: {device}")

                # PHASE 2: DEVICE CONTROL (Only if we have a target in memory)
                current_time = time.time()
                if self.active_target and (current_time - self.last_action_time) > self.COOLDOWN:
                    
                    action_taken = False
                    
                    # Universal Commands
                    if gesture == "Open_Palm":
                        print(f"⚡ [COMMAND] {self.active_target}: POWER ON")
                        action_taken = True
                    elif gesture == "Closed_Fist":
                        print(f"⚡ [COMMAND] {self.active_target}: POWER OFF")
                        action_taken = True
                        
                    # AC Specific Commands
                    elif "AC" in self.active_target: # Adjust string check based on your exact YOLO label
                        if gesture == "Thumb_Up":
                            print(f"❄️ [COMMAND] AC: TEMP UP")
                            action_taken = True
                        elif gesture == "Thumb_Down":
                            print(f"❄️ [COMMAND] AC: TEMP DOWN")
                            action_taken = True
                            
                    # Fan Specific Commands
                    elif "Fan" in self.active_target:
                        if gesture == "Victory": # Peace sign (2 fingers)
                            print(f"🌪️ [COMMAND] FAN: SPEED 2")
                            action_taken = True
                        elif gesture == "ILoveYou": # Spiderman (3 fingers)
                            print(f"🌪️ [COMMAND] FAN: SPEED 3")
                            action_taken = True

                    if action_taken:
                        self.last_action_time = current_time

            # --- DRAW HUD MEMORY OVERLAY ---
            if self.active_target:
                remaining_time = int(self.MEMORY_WINDOW - time_elapsed)
                hud_text = f"TARGET: {self.active_target} | TIMER: {remaining_time}s"
                cv2.putText(frame, hud_text, (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            else:
                cv2.putText(frame, "NO TARGET LOCKED", (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            # Show the final frame
            cv2.imshow("Iron Man HUD Engine", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    hud = IronManHUD()
    hud.run()
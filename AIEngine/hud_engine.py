import cv2
import time
import math
from object_detector import DynamicDetector
from hand_tracker import HandTracker

class IronManHUD_Engine:
    def __init__(self):
        # REPLACE THIS with your actual YOLO path
        self.detector = DynamicDetector(model_path=r"F:\Bach_khoa\HKCQ\HK252\DADN\CODE\AIOT-\runs\detect\cheat-2\weights\best.pt") 
        self.tracker = HandTracker()
        
        # --- STATE MACHINE ---
        self.active_target = None
        self.target_timestamp = 0
        self.MEMORY_WINDOW = 60  
        self.last_action_time = 0 
        self.COOLDOWN = 2.0 

        # --- EMA TRACKING ---
        self.ema_centers = {}
        self.EMA_ALPHA = 0.3 

    def _get_smoothed_center(self, device, bbox):
        xmin, ymin, xmax, ymax = bbox
        raw_cx = (xmin + xmax) / 2
        raw_cy = (ymin + ymax) / 2

        if device not in self.ema_centers:
            self.ema_centers[device] = (raw_cx, raw_cy)
        else:
            old_cx, old_cy = self.ema_centers[device]
            new_cx = (self.EMA_ALPHA * raw_cx) + ((1 - self.EMA_ALPHA) * old_cx)
            new_cy = (self.EMA_ALPHA * raw_cy) + ((1 - self.EMA_ALPHA) * old_cy)
            self.ema_centers[device] = (new_cx, new_cy)
        return self.ema_centers[device]

    def _calculate_aim_assist(self, index_tip, index_vector, box_center):
        tx = box_center[0] - index_tip[0]
        ty = box_center[1] - index_tip[1]
        
        mag_finger = math.hypot(index_vector[0], index_vector[1])
        mag_target = math.hypot(tx, ty)
        
        if mag_finger == 0 or mag_target == 0: return False
        
        dot = (index_vector[0] * tx) + (index_vector[1] * ty)
        cos_theta = max(-1.0, min(1.0, dot / (mag_finger * mag_target)))
        angle = math.degrees(math.acos(cos_theta))
        return angle <= 25 

    def _is_clustered_forward(self, hand_center, index_vector, bbox):
        xmin, ymin, xmax, ymax = bbox
        is_inside = xmin <= hand_center[0] <= xmax and ymin <= hand_center[1] <= ymax
        mag_finger = math.hypot(index_vector[0], index_vector[1])
        pointing_forward = mag_finger < 40 
        return is_inside and pointing_forward

    def process_frame(self, frame):
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        
        current_event = "IDLE"
        current_action = None
        current_target = None
        
        hitboxes = self.detector.get_bounding_boxes(frame)
        hand_data = self.tracker.get_hand_state(frame)
        
        # --- MEMORY DECAY ---
        time_elapsed = time.time() - self.target_timestamp
        if self.active_target and time_elapsed > self.MEMORY_WINDOW:
            print(f"⌛ Target Lock Lost. {self.active_target} memory expired.")
            self.active_target = None

        # --- DRAW TARGETS ---
        for device, bbox in hitboxes.items():
            xmin, ymin, xmax, ymax = map(int, bbox)
            box_center = self._get_smoothed_center(device, bbox)
            color = (0, 255, 0) if device == self.active_target else (0, 0, 255)
            cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)
            cv2.circle(frame, (int(box_center[0]), int(box_center[1])), 5, color, -1)

        # --- PROCESS HAND LOGIC ---
        if hand_data["detected"]:
            gesture = hand_data["gesture"]
            is_pointing = hand_data["is_pointing"]
            speed_level = hand_data["speed_level"]
            
            display_str = gesture if gesture else f"Fingers: {speed_level}"
            cv2.putText(frame, display_str, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

            if gesture == "ILoveYou" and self.active_target:
                print(f"❌ Target Aborted: {self.active_target}")
                self.active_target = None
                self.last_action_time = time.time()

            if is_pointing:
                tip = hand_data["index_tip"]
                vec = hand_data["index_vector"]
                hand_center = hand_data["hand_center"]
                
                cv2.line(frame, tip, (tip[0] + vec[0]*5, tip[1] + vec[1]*5), (255, 0, 0), 3)

                for device, bbox in hitboxes.items():
                    box_center = self._get_smoothed_center(device, bbox)
                    if self._calculate_aim_assist(tip, vec, box_center) or self._is_clustered_forward(hand_center, vec, bbox):
                        cv2.line(frame, tip, (int(box_center[0]), int(box_center[1])), (0, 255, 255), 2)
                        
                        if self.active_target != device:
                            self.active_target = device
                            self.target_timestamp = time.time()
                            self.last_action_time = time.time() 
                            print(f"🎯 LOCKED ON: {device}")

            # --- DEVICE CONTROL ---
            current_time = time.time()
            if self.active_target and (current_time - self.last_action_time) > self.COOLDOWN:
                action_taken = False
                target_lower = self.active_target.lower()
                
                # 1. Universal Base Commands
                if gesture == "Open_Palm":
                    print(f"⚡ [COMMAND] {self.active_target}: POWER ON"); action_taken = True; current_action = "POWER ON"
                elif gesture == "Closed_Fist":
                    print(f"⚡ [COMMAND] {self.active_target}: POWER OFF"); action_taken = True; current_action = "POWER OFF"
                    
                # 2. AC Specific Commands (TEMP ONLY, NO SWING/SLEEP)
                elif "ac" in target_lower or "cassette" in target_lower: 
                    if gesture == "Thumb_Up": print(f"❄️ [COMMAND] AC: TEMP UP"); action_taken = True; current_action = "TEMP UP"
                    elif gesture == "Thumb_Down": print(f"❄️ [COMMAND] AC: TEMP DOWN"); action_taken = True; current_action = "TEMP DOWN"
                        
                # 3. Fan Specific Commands (SWING RESTORED)
                elif "fan" in target_lower:
                    if gesture == "Thumb_Up": print(f"🔄 [COMMAND] FAN: SWING ON"); action_taken = True; current_action = "SWING ON"
                    elif gesture == "Thumb_Down": print(f"🔄 [COMMAND] FAN: SWING OFF"); action_taken = True; current_action = "SWING OFF"
                    elif gesture not in ["Open_Palm", "Closed_Fist", "ILoveYou", "Thumb_Up", "Thumb_Down"]:
                        if speed_level == 1: print("🌪️ [COMMAND] FAN: SPEED 1"); action_taken = True; current_action = "SPEED 1"
                        elif speed_level == 2: print("🌪️ [COMMAND] FAN: SPEED 2"); action_taken = True; current_action = "SPEED 2"
                        elif speed_level == 3: print("🌪️ [COMMAND] FAN: SPEED 3"); action_taken = True; current_action = "SPEED 3"

                if action_taken:
                    self.last_action_time = current_time
                    current_event = "COMMAND_ISSUED"
                    current_target = self.active_target

        # --- UI OVERLAY ---
        if self.active_target:
            rem = int(self.MEMORY_WINDOW - time_elapsed)
            cv2.putText(frame, f"TARGET: {self.active_target} | TIMER: {rem}s", (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "NO TARGET LOCKED", (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        return frame, current_event, current_action, current_target
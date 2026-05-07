# master_consensus_engine.py

from object_detector import DynamicDetector
from hand_tracker import HandTracker
import time

class MultiCameraEngine:
    def __init__(self):
        self.detector = DynamicDetector()
        self.tracker = HandTracker()
        self.CONSENSUS_THRESHOLD = 2 
        
        # --- THE TARGET MEMORY SYSTEM ---
        self.active_target = None
        self.target_timestamp = 0
        self.MEMORY_WINDOW = 300  # 5 minutes (in seconds). Change this to 30 if it gets annoying!

    def _ray_intersects_box(self, ray_start, ray_end, bbox):
        rx1, ry1 = ray_start
        rx2, ry2 = ray_end
        b_xmin, b_ymin, b_xmax, b_ymax = bbox

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

    def process_room_state(self, frames_dict):
        # We now separate "Pointing" votes from "Action" votes
        target_selection_votes = {"fan_1": 0, "ac_1": 0}
        action_votes = {"TURN_ON": 0, "TURN_OFF": 0}

        active_cameras = len(frames_dict)
        if active_cameras == 0:
            return {"event": "IDLE"}
            
        dynamic_threshold = 2 if active_cameras >= 3 else 1

        for cam_id, frame in frames_dict.items():
            try:
                hitboxes = self.detector.get_bounding_boxes(frame)
                hand_data = self.tracker.get_hand_state(frame)
                
                if not hand_data or not hand_data.get("detected"):
                    continue

                gesture = hand_data.get("gesture")
                ray = hand_data.get("raycast_vector")

                # PHASE 1: TARGET ACQUISITION (Are they pointing at something?)
                if ray and len(ray) >= 2 and hitboxes:
                    for device_name, bbox in hitboxes.items():
                        if self._ray_intersects_box(ray[0], ray[1], bbox):
                            target_selection_votes[device_name] += 1
                            
                # PHASE 2: ACTION COMMAND (Are they making an actionable gesture?)
                # We log these votes regardless of where they are pointing
                if gesture == "Open_Palm":
                    action_votes["TURN_ON"] += 1
                elif gesture == "Closed_Fist":
                    action_votes["TURN_OFF"] += 1

            except IndexError:
                continue
            except Exception as e:
                print(f"⚠️ Engine Vision skipped frame on {cam_id}: {e}")
                continue

        # --- CONSENSUS RESOLUTION ---

        # 1. Did enough cameras agree the user is pointing at a new target?
        for device, votes in target_selection_votes.items():
            if votes >= dynamic_threshold:
                self.active_target = device
                self.target_timestamp = time.time()
                print(f"\n🎯 TARGET LOCKED: {device} (Memory window started: {self.MEMORY_WINDOW}s)")

        # 2. Did enough cameras agree the user made an action gesture?
        for command, votes in action_votes.items():
            if votes >= dynamic_threshold:
                
                # Check if we have a valid target in memory
                time_elapsed = time.time() - self.target_timestamp
                
                if self.active_target and time_elapsed <= self.MEMORY_WINDOW:
                    print(f"⚡ COMMAND EXECUTED: {command} on {self.active_target} (Target was selected {int(time_elapsed)}s ago)")
                    
                    target_to_act_on = self.active_target
                    
                    # OPTIONAL: Clear the memory after a successful command so they don't spam it. 
                    # Comment this out if you want them to be able to turn it on/off repeatedly without pointing again.
                    self.active_target = None 
                    
                    return {
                        "event": "COMMAND_ISSUED",
                        "target": target_to_act_on,
                        "action": command,
                        "confidence_votes": votes
                    }
                else:
                    print(f"⚠️ Action '{command}' ignored. No target locked, or memory expired.")

        return {"event": "IDLE"}
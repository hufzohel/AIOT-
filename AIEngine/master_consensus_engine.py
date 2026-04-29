# master_consensus_engine.py

from object_detector import DynamicDetector
from hand_tracker import HandTracker

class MultiCameraEngine:
    def __init__(self):
        # Initialize your sub-modules ONCE.
        self.detector = DynamicDetector()
        self.tracker = HandTracker()
        
        # We need 2 out of 3 cameras to agree
        self.CONSENSUS_THRESHOLD = 2 

    def _ray_intersects_box(self, ray_start, ray_end, bbox):
        """
        Standard 2D line-intersection math.
        Checks if the line drawn by the finger crosses the dynamic hitbox.
        """
        # (You will drop standard line-to-rectangle intersection math here)
        pass 

    def process_room_state(self, frames_dict):
        """
        frames_dict = {"cam_1": frame_data, "cam_2": frame_data, "cam_3": frame_data}
        """
        target_votes = {"fan_1": 0, "ac_1": 0}
        agreed_action = None

        # 1. Process each camera independently
        for cam_id, frame in frames_dict.items():
            
            # Step A: Where are the objects in THIS camera's view?
            hitboxes = self.detector.get_bounding_boxes(frame)
            
            # Step B: What is the hand doing in THIS camera's view?
            hand_data = self.tracker.get_hand_state(frame)
            
            if not hand_data["detected"]:
                continue

            gesture = hand_data["gesture"]
            ray = hand_data["raycast_vector"]

            # Step C: Did the ray hit anything in THIS camera?
            for device_name, bbox in hitboxes.items():
                if self._ray_intersects_box(ray[0], ray[1], bbox):
                    target_votes[device_name] += 1
                    agreed_action = gesture # e.g., "Open_Palm"

        # 2. The Consensus Check
        for device, votes in target_votes.items():
            if votes >= self.CONSENSUS_THRESHOLD:
                # WE HAVE A HIT! 2/3 Cameras agree the user is pointing at the device.
                
                # Map the gesture to the command
                command = "TURN_ON" if agreed_action == "Open_Palm" else "TURN_OFF"
                
                return {
                    "event": "COMMAND_ISSUED",
                    "target": device,
                    "action": command,
                    "confidence_votes": votes
                }

        # Nobody agreed, or user isn't pointing at anything
        return {"event": "IDLE"}
def _ray_intersects_box(self, ray_start, ray_end, bbox):
        """
        Checks if the 2D laser pointer ray intersects the Object Detection bounding box.
        Uses Line-to-Rectangle intersection.
        """
        rx1, ry1 = ray_start
        rx2, ry2 = ray_end
        b_xmin, b_ymin, b_xmax, b_ymax = bbox

        # Quick check: is the start point already inside the box?
        if b_xmin <= rx1 <= b_xmax and b_ymin <= ry1 <= b_ymax:
            return True

        # Check intersection with the 4 borders of the bounding box
        def line_intersects_line(p1, p2, p3, p4):
            # Standard 2D geometry line intersection
            def ccw(A, B, C):
                return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
            return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

        borders = [
            ((b_xmin, b_ymin), (b_xmax, b_ymin)), # Top edge
            ((b_xmax, b_ymin), (b_xmax, b_ymax)), # Right edge
            ((b_xmax, b_ymax), (b_xmin, b_ymax)), # Bottom edge
            ((b_xmin, b_ymax), (b_xmin, b_ymin))  # Left edge
        ]

        for edge_start, edge_end in borders:
            if line_intersects_line(ray_start, ray_end, edge_start, edge_end):
                return True

        return False
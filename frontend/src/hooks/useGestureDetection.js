import { useEffect, useState, useRef } from "react";

export default function useGestureDetection(videoRef, enabled = true, actorId = 1) {
  const [latestCommand, setLatestCommand] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [hudFrame, setHudFrame] = useState(null); 
  const canvasRef = useRef(null);

  useEffect(() => {
    let isActive = true; 

    if (!enabled || !videoRef?.current) {
      setHudFrame(null);
      setLatestCommand(null);
      return;
    }

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    const captureFrame = async () => {
      if (!isActive || !videoRef.current) return;

      const video = videoRef.current;

      if (video.readyState === 4) {
        try {
          // ⚡ THE SILVER BULLET: DOWNSCALE BEFORE ENCODING
          // Shrink the massive webcam feed to a lightweight 640px wide format
          const TARGET_WIDTH = 640;
          const scale = TARGET_WIDTH / video.videoWidth;
          
          canvas.width = TARGET_WIDTH;
          canvas.height = video.videoHeight * scale;
          
          // Draw the smaller image
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Compress it at 50% quality (Fastest network transport)
          const base64Image = canvas.toDataURL("image/jpeg", 0.5);

          setIsDetecting(true);
          const response = await fetch("/api/gesture/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorId: actorId, 
              frames: { cam_1: base64Image }
            })
          });

          const data = await response.json();

          if (isActive && response.ok) {
            if (data.drawn_frame) {
              setHudFrame(`data:image/jpeg;base64,${data.drawn_frame}`);
            }

            if (data.event === "COMMAND_ISSUED") {
              setLatestCommand(`${data.action} → ${data.target}`);
              setError(null);
              setTimeout(() => {
                if (isActive) setLatestCommand(null);
              }, 3000);
            }
          }
        } catch (err) {
          console.error("Gesture detection error:", err);
          if (isActive) {
            setError(err.message);
            setIsDetecting(false);
          }
        }
      }

      // Proceed to the next frame
      if (isActive) {
        setTimeout(captureFrame, 80);
      }
    };

    captureFrame();

    return () => {
      isActive = false;
    };
  }, [videoRef, enabled, actorId]);

  return { latestCommand, isDetecting, error, hudFrame };
}
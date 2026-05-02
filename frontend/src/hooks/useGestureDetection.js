import { useEffect, useState, useRef } from "react";

/**
 * Hook for real-time gesture detection
 * Captures frames from video ref and sends to /api/gesture/process
 * 
 * @param {React.RefObject} videoRef - Reference to video element
 * @param {boolean} enabled - Whether to actively detect (default: true)
 * @returns {Object} { latestCommand, isDetecting, error }
 */
export default function useGestureDetection(videoRef, enabled = true) {
  const [latestCommand, setLatestCommand] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    // Capture and send frames every 500ms
    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;

      if (!video || video.readyState !== 4) return;

      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/jpeg", 0.8);

        setIsDetecting(true);
        const response = await fetch("/api/gesture/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frames: { cam_1: base64Image }
          })
        });

        const data = await response.json();

        if (data.event === "COMMAND_ISSUED") {
          console.log("🔥 Gesture detected:", data);
          setLatestCommand(`${data.action} → ${data.target}`);
          setError(null);
          
          // Auto-clear after 3 seconds
          setTimeout(() => setLatestCommand(null), 3000);
        }
      } catch (err) {
        console.error("Gesture detection error:", err);
        setError(err.message);
        setIsDetecting(false);
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoRef, enabled]);

  return {
    latestCommand,
    isDetecting,
    error
  };
}

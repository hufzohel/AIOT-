import { useEffect, useState, useRef } from "react";

/**
 * Hook for real-time face recognition
 * Captures frames from video ref and sends to /api/face/login
 * 
 * @param {React.RefObject} videoRef - Reference to video element
 * @param {boolean} enabled - Whether to actively detect (default: true)
 * @returns {Object} { recognizedUser, faceScore, isDetecting, error }
 */
export default function useFaceRecognition(videoRef, enabled = true) {
  const [recognizedUser, setRecognizedUser] = useState(null);
  const [faceScore, setFaceScore] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    // Capture and send frames every 1000ms (slower, more expensive operation)
    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;

      if (!video || video.readyState !== 4) return;

      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/jpeg", 0.8);

        setIsDetecting(true);
        const response = await fetch("/api/face/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();

        if (data.user) {
          console.log("👤 Face recognized:", data.user.name, `(${(data.score * 100).toFixed(1)}%)`);
          setRecognizedUser(data.user.name);
          setFaceScore(data.score);
          setError(null);

          // Auto-clear after 5 seconds
          setTimeout(() => {
            setRecognizedUser(null);
            setFaceScore(0);
          }, 5000);
        } else {
          setRecognizedUser(null);
          setFaceScore(0);
        }
        setIsDetecting(false);
      } catch (err) {
        console.error("Face recognition error:", err);
        setError(err.message);
        setRecognizedUser(null);
        setFaceScore(0);
        setIsDetecting(false);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoRef, enabled]);

  return {
    recognizedUser,
    faceScore,
    isDetecting,
    error
  };
}

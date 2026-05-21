import { useEffect, useState, useRef } from "react";

export default function useFaceRecognition(videoRef, enabled = true) {
  const [recognizedUser, setRecognizedUser] = useState(null);
  const [faceScore, setFaceScore] = useState(0);
  const [faceHudFrame, setFaceHudFrame] = useState(null);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  
  // 🚀 THE SMART LOCK
  const isProcessing = useRef(false); 
  const activeRef = useRef(enabled);

  useEffect(() => {
    activeRef.current = enabled;
    
    if (!enabled || !videoRef?.current) {
      setRecognizedUser(null);
      setFaceHudFrame(null);
      return;
    }

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    // 🚀 RECURSIVE LOOP INSTEAD OF BLIND SET-INTERVAL
    const scanLoop = async () => {
      if (!activeRef.current || !videoRef.current) return;

      // Only trigger if the previous request is completely finished
      if (!isProcessing.current && videoRef.current.readyState === 4) {
        isProcessing.current = true;
        
        try {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          // Dropped to 0.6 for a massive network speed boost!
          const base64Image = canvas.toDataURL("image/jpeg", 0.6); 

          const response = await fetch("/api/face/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image })
          });

          const data = await response.json();

          if (data.hudImage) {
            setFaceHudFrame(data.hudImage);
          }

          if (data.user) {
            setRecognizedUser(data.user.name);
            setFaceScore(data.score);
            setError(null);
          } else {
            setRecognizedUser(null);
            setFaceScore(0);
            setError(data.message);
          }
        } catch (err) {
          setError(err.message);
          setRecognizedUser(null);
        } finally {
          // 🚀 UNLOCK
          isProcessing.current = false; 
        }
      }

      // Wait 50ms, then check again (Only fires if the lock is open)
      if (activeRef.current) {
        setTimeout(scanLoop, 50);
      }
    };

    // Kick off the loop
    scanLoop();

    return () => {
      activeRef.current = false; // Kill loop on unmount
      isProcessing.current = false;
    };
  }, [videoRef, enabled]);

  return { recognizedUser, faceScore, faceHudFrame, error };
}
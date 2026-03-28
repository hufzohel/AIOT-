import { useEffect, useRef, useState } from "react";

export default function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  const startCamera = async () => {
    setCameraError("");
    setCameraLoading(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        throw new Error("Không tìm thấy vùng hiển thị camera");
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
    } catch (error) {
      setCameraError(error.message || "Không thể bật camera");
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !cameraActive) {
      throw new Error("Camera chưa sẵn sàng để chụp ảnh");
    }
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return {
    videoRef,
    cameraActive,
    cameraLoading,
    cameraError,
    setCameraError,
    startCamera,
    stopCamera,
    captureFrame,
  };
}

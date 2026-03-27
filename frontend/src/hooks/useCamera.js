import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError("");
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Không tìm thấy vùng hiển thị camera");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      streamRef.current = stream;
      setCameraActive(true);
    } catch (error) {
      stopCamera();
      setCameraError(
        error?.message ||
          "Không thể truy cập camera. Hãy cấp quyền camera cho trình duyệt."
      );
    }
  }, [stopCamera]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraActive) {
      throw new Error("Camera chưa sẵn sàng");
    }

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 480;
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / sourceWidth);
    const targetWidth = Math.max(320, Math.round(sourceWidth * scale));
    const targetHeight = Math.round(sourceHeight * (targetWidth / sourceWidth));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d", { willReadFrequently: false });
    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [cameraActive]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    videoRef,
    cameraActive,
    cameraError,
    startCamera,
    stopCamera,
    captureFrame,
  };
}

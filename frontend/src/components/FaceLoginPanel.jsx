import { Camera, Loader2, ScanFace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import api from "../lib/api";

const FEATURE_INDEX = {
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  noseTip: 1,
  mouthLeft: 61,
  mouthRight: 291,
  chin: 152,
  browLeft: 105,
  browRight: 334,
};

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function createFaceSignature(landmarks) {
  const leftEye = landmarks[FEATURE_INDEX.leftEyeOuter];
  const rightEye = landmarks[FEATURE_INDEX.rightEyeOuter];
  const noseTip = landmarks[FEATURE_INDEX.noseTip];
  const mouthLeft = landmarks[FEATURE_INDEX.mouthLeft];
  const mouthRight = landmarks[FEATURE_INDEX.mouthRight];
  const chin = landmarks[FEATURE_INDEX.chin];
  const browLeft = landmarks[FEATURE_INDEX.browLeft];
  const browRight = landmarks[FEATURE_INDEX.browRight];

  const base = Math.max(distance(leftEye, rightEye), 0.0001);
  const center = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };

  const normalize = (point) => [
    Number(((point.x - center.x) / base).toFixed(4)),
    Number(((point.y - center.y) / base).toFixed(4)),
  ];

  return [
    ...normalize(noseTip),
    ...normalize(mouthLeft),
    ...normalize(mouthRight),
    ...normalize(chin),
    ...normalize(browLeft),
    ...normalize(browRight),
  ];
}

function similarityScore(a = [], b = []) {
  if (!a.length || a.length !== b.length) return 0;
  const mse = a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length;
  return Math.max(0, 1 - Math.sqrt(mse) / 0.8);
}

export default function FaceLoginPanel({ onLoginSuccess }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const landmarkerRef = useRef(null);
  const stableRef = useRef({ label: null, frames: 0 });
  const faceRegistryRef = useRef([]);
  const authInFlightRef = useRef(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [status, setStatus] = useState("Nhấn bật camera để bắt đầu nhận diện gương mặt.");
  const [error, setError] = useState("");
  const [matched, setMatched] = useState(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
    stableRef.current = { label: null, frames: 0 };
    authInFlightRef.current = false;
    setMatched(null);
    setCameraReady(false);
  };

  const loginByFace = async (userId, label) => {
    if (authInFlightRef.current) return;
    authInFlightRef.current = true;

    try {
      setStatus("Đăng nhập bằng gương mặt...");
      const res = await api.post("/api/login/face", { userId, label });
      stopCamera();
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể đăng nhập bằng gương mặt");
      setStatus("Nhận diện thất bại. Bạn có thể thử lại hoặc chuyển sang mật khẩu.");
      stopCamera();
    }
  };

  const detectLoop = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());

    if (result.faceLandmarks?.length) {
      const signature = createFaceSignature(result.faceLandmarks[0]);
      const registry = faceRegistryRef.current;
      const bestMatch = registry.reduce(
        (best, item) => {
          const score = similarityScore(signature, item.template);
          return score > best.score ? { ...item, score } : best;
        },
        { score: 0, userId: null, label: null, name: null, threshold: 0.9 }
      );

      setMatched(bestMatch.userId ? bestMatch : null);

      if (bestMatch.userId && bestMatch.score >= (bestMatch.threshold || 0.9)) {
        const isSame = stableRef.current.label === bestMatch.label;
        stableRef.current = {
          label: bestMatch.label,
          frames: isSame ? stableRef.current.frames + 1 : 1,
        };
        setStatus(`Đã nhận diện ${bestMatch.name} (${(bestMatch.score * 100).toFixed(1)}%). Giữ ổn định khuôn mặt...`);

        if (stableRef.current.frames >= 12) {
          loginByFace(bestMatch.userId, bestMatch.label);
          return;
        }
      } else {
        stableRef.current = { label: null, frames: 0 };
        setStatus("Chưa khớp khuôn mặt mẫu. Hãy nhìn thẳng vào camera với đủ ánh sáng.");
      }
    } else {
      stableRef.current = { label: null, frames: 0 };
      setMatched(null);
      setStatus("Chưa phát hiện khuôn mặt. Hãy đưa mặt vào khung hình.");
    }

    animationFrameRef.current = requestAnimationFrame(detectLoop);
  };

  const startCamera = async () => {
    try {
      setInitializing(true);
      setError("");
      setStatus("Đang tải MediaPipe Face Landmarker...");

      const registryRes = await api.get("/api/face-registry");
      const nextRegistry = registryRes.data.registry || [];
      faceRegistryRef.current = nextRegistry;

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setStatus("Đã sẵn sàng. Hãy nhìn thẳng vào camera.");
      animationFrameRef.current = requestAnimationFrame(detectLoop);
    } catch (err) {
      setError(err.message || "Không thể khởi tạo nhận diện gương mặt");
      stopCamera();
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="aspect-video rounded-2xl bg-slate-100 border border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
          {cameraReady ? (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          ) : (
            <div className="text-center px-6">
              <ScanFace className="w-9 h-9 text-primary-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Camera chưa bật</p>
              <p className="text-xs text-slate-500 mt-1">MediaPipe sẽ dò Face Landmarker rồi so khớp landmark signature với mẫu demo.</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 leading-relaxed">
        {status}
        {matched?.name ? (
          <div className="mt-2 text-xs text-slate-500">
            Ứng viên tốt nhất: <span className="font-semibold text-slate-700">{matched.name}</span> · {(matched.score * 100).toFixed(1)}%
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={startCamera}
          disabled={initializing || cameraReady}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {initializing ? "Đang khởi tạo..." : "Bật camera nhận diện"}
        </button>
        <button
          onClick={stopCamera}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Tắt camera
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Đây là luồng demo dùng Face Landmarker + landmark signature để định danh trên client. Với production, nên chuyển sang xác thực sinh trắc có chống giả mạo hoặc dùng mô hình embedding chuyên biệt.
      </p>
    </div>
  );
}

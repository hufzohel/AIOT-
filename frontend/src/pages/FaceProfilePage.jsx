import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCcw,
  Trash2,
  ScanFace,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const SAMPLE_TARGET = 5;
const EMBEDDING_SIZE = 64;

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

function extractFaceEmbeddingFromVideo(video) {
  const canvas = document.createElement("canvas");
  const size = 16;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(video, 0, 0, size, size);

  const { data } = context.getImageData(0, 0, size, size);
  const values = [];
  for (let index = 0; index < data.length; index += 4) {
    const grayscale = (data[index] + data[index + 1] + data[index + 2]) / 3;
    values.push(grayscale / 255);
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const compressed = [];
  for (let index = 0; index < EMBEDDING_SIZE; index += 1) {
    const start = index * 4;
    const segment = values.slice(start, start + 4);
    const average = segment.reduce((sum, value) => sum + value, 0) / segment.length;
    compressed.push(average - mean);
  }

  return normalizeVector(compressed);
}

export default function FaceProfilePage() {
  const { user, updateUser } = useAuth();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [samples, setSamples] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const steps = useMemo(
    () => [
      "Đăng nhập bằng mật khẩu như bình thường.",
      "Mở Hồ sơ và bật camera để xem preview trực tiếp.",
      `Chụp đủ ${SAMPLE_TARGET} ảnh mẫu với góc nhìn hơi khác nhau.`,
      "Lưu mẫu để bật đăng nhập bằng khuôn mặt.",
    ],
    []
  );

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraLoading(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setError("");
    setMessage("");
    setCameraLoading(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (cameraError) {
      setError("Không thể truy cập camera. Hãy kiểm tra quyền webcam.");
    } finally {
      setCameraLoading(false);
    }
  };

  const captureSample = () => {
    if (!cameraReady || !videoRef.current) {
      setError("Hãy bật camera trước khi chụp ảnh mẫu.");
      return;
    }
    if (samples.length >= SAMPLE_TARGET) {
      setError(`Bạn đã chụp đủ ${SAMPLE_TARGET} ảnh mẫu.`);
      return;
    }
    setError("");
    const embedding = extractFaceEmbeddingFromVideo(videoRef.current);
    setSamples((current) => [...current, embedding]);
    setMessage(`Đã chụp ${samples.length + 1}/${SAMPLE_TARGET} ảnh mẫu.`);
  };

  const saveFaceProfile = async () => {
    if (samples.length < SAMPLE_TARGET) {
      setError(`Cần đủ ${SAMPLE_TARGET} ảnh mẫu để lưu khuôn mặt.`);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const endpoint = user?.faceAuthEnabled ? "/api/face/update" : "/api/face/register";
      const response = await axios.post(endpoint, {
        userId: user.id,
        embeddings: samples,
      });
      updateUser(response.data.user);
      setMessage(response.data.message || "Đã lưu khuôn mặt thành công.");
      stopCamera();
      setSamples([]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể lưu khuôn mặt.");
    } finally {
      setSaving(false);
    }
  };

  const disableFaceLogin = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await axios.post("/api/face/disable", { userId: user.id });
      updateUser(response.data.user);
      setSamples([]);
      stopCamera();
      setMessage(response.data.message || "Đã tắt đăng nhập khuôn mặt.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể tắt đăng nhập khuôn mặt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hồ sơ người dùng</h1>
        <p className="text-slate-500 mt-1">Đăng ký hoặc cập nhật đăng nhập khuôn mặt là tùy chọn. Bạn vẫn luôn có thể đăng nhập bằng mật khẩu.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-800">Xác thực khuôn mặt</p>
              <p className="text-sm text-slate-500">
                Trạng thái hiện tại: {user?.faceAuthEnabled ? "Đã bật" : "Chưa bật"}
              </p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-medium ${user?.faceAuthEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {user?.faceAuthEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>

          <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm px-6 text-center">
                Bật camera để xem preview trực tiếp và chụp ảnh mẫu.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {cameraLoading ? "Đang bật camera..." : cameraReady ? "Mở lại camera" : "Bật camera"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={!cameraReady && !streamRef.current}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <CameraOff className="w-4 h-4" />
              Tắt camera
            </button>
            <button
              type="button"
              onClick={captureSample}
              disabled={!cameraReady || samples.length >= SAMPLE_TARGET}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <ScanFace className="w-4 h-4" />
              Chụp mẫu ({samples.length}/{SAMPLE_TARGET})
            </button>
            <button
              type="button"
              onClick={saveFaceProfile}
              disabled={saving || samples.length < SAMPLE_TARGET}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Đang lưu..." : user?.faceAuthEnabled ? "Cập nhật khuôn mặt" : "Đăng ký khuôn mặt"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSamples([]);
                setMessage("");
                setError("");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="w-4 h-4" />
              Xóa mẫu tạm
            </button>
            {user?.faceAuthEnabled && (
              <button
                type="button"
                onClick={disableFaceLogin}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Tắt Face Login
              </button>
            )}
          </div>

          {message && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {message}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm">
            <p className="font-semibold text-slate-800">Cách dùng</p>
            <ol className="space-y-2 text-slate-600 list-decimal pl-5">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Ghi chú</p>
            <p>Face Login là tùy chọn. Nếu không đăng ký hoặc đã tắt, tài khoản vẫn dùng mật khẩu bình thường.</p>
            <p>Dữ liệu trong backend hiện là mock và sẽ mất khi restart server.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

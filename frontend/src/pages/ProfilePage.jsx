import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Camera,
  ScanFace,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCamera } from "../hooks/useCamera";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { videoRef, cameraActive, cameraError, startCamera, stopCamera, captureFrame } = useCamera();
  const [samples, setSamples] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState({ ready: false, message: "Đang kiểm tra backend face..." });

  useEffect(() => {
    axios
      .get("/api/face/health")
      .then((res) => setHealth(res.data))
      .catch(() =>
        setHealth({ ready: false, message: "Không thể kết nối backend face recognition" })
      );
  }, []);

  const faceStatus = useMemo(() => user?.faceAuth || {}, [user]);
  const needsNewEnrollment = !faceStatus?.enabled;

  const handleCaptureSample = () => {
    try {
      setError("");
      setMessage("");
      if (samples.length >= 5) {
        setError("Bạn đã đủ 5 ảnh mẫu. Hãy lưu hoặc đặt lại để chụp lại.");
        return;
      }
      const image = captureFrame();
      setSamples((prev) => [...prev, image]);
    } catch (err) {
      setError(err.message || "Không thể chụp ảnh mẫu");
    }
  };

  const handleResetSamples = () => {
    setSamples([]);
    setMessage("");
    setError("");
  };

  const handleRemoveLastSample = () => {
    setSamples((prev) => prev.slice(0, -1));
  };

  const handleSubmitSamples = async () => {
    if (samples.length !== 5) {
      setError("Cần đúng 5 ảnh mẫu để đăng ký hoặc cập nhật khuôn mặt.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const endpoint = needsNewEnrollment ? "/api/face/register" : "/api/face/update";
      const { data } = await axios.post(endpoint, {
        userId: user.id,
        images: samples,
      });
      updateUser(data.user);
      setMessage(data.message || "Đã lưu dữ liệu khuôn mặt thành công");
      setSamples([]);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lưu dữ liệu khuôn mặt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableFaceLogin = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.post("/api/face/disable", { userId: user.id });
      updateUser(data.user);
      setSamples([]);
      setMessage(data.message || "Đã tắt đăng nhập bằng khuôn mặt");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tắt đăng nhập bằng khuôn mặt");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Hồ sơ người dùng</h2>
        <p className="text-slate-500 text-sm mt-1">
          Đăng ký hoặc cập nhật 5 ảnh mẫu để bật đăng nhập bằng xác thực gương mặt.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-primary-600" />
                Face Enrollment
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Quy trình: bật camera → chụp đủ 5 ảnh → backend OpenCV trích xuất embedding → lưu template.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${faceStatus?.enabled
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
                }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {faceStatus?.enabled ? "Face login đã bật" : "Chưa đăng ký face"}
            </span>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center text-center text-slate-300 px-6">
                <div>
                  <Camera className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                  <p className="text-sm">
                    Bật camera để xem preview trực tiếp và chụp 5 ảnh mẫu.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Bật camera
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Tắt camera
            </button>
            <button
              type="button"
              onClick={handleCaptureSample}
              disabled={!cameraActive || samples.length >= 5}
              className="px-4 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
            >
              Chụp ảnh mẫu ({samples.length}/5)
            </button>
            <button
              type="button"
              onClick={handleRemoveLastSample}
              disabled={samples.length === 0}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Xóa ảnh cuối
            </button>
            <button
              type="button"
              onClick={handleResetSamples}
              disabled={samples.length === 0}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Đặt lại 5 ảnh
            </button>
          </div>

          {cameraError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cameraError}
            </div>
          )}

          {!health.ready && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {health.message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, index) => {
              const sample = samples[index];
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-2xl overflow-hidden border ${sample ? "border-primary-200 bg-primary-50" : "border-dashed border-slate-200 bg-slate-50"
                    }`}
                >
                  {sample ? (
                    <img src={sample} alt={`Mẫu ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Ảnh {index + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSubmitSamples}
              disabled={submitting || samples.length !== 5 || !health.ready}
              className="px-5 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting
                ? "Đang xử lý..."
                : needsNewEnrollment
                  ? "Lưu đăng ký khuôn mặt"
                  : "Cập nhật dữ liệu khuôn mặt"}
            </button>

            <button
              type="button"
              onClick={handleDisableFaceLogin}
              disabled={submitting || !faceStatus?.enabled}
              className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Tắt Face Login
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{user?.name}</h3>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <p className="text-xs text-slate-400 mt-1">Vai trò: {user?.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Trạng thái đăng ký</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Đăng nhập gương mặt</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {faceStatus?.enabled ? "Đã bật" : "Chưa bật"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Số ảnh mẫu đã lưu</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{faceStatus?.sampleCount || 0} / 5</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Lần cập nhật gần nhất</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {faceStatus?.updatedAt
                    ? new Date(faceStatus.updatedAt).toLocaleString("vi-VN")
                    : "Chưa có"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Ngưỡng so khớp</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{faceStatus?.threshold || 0.42}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">Lưu ý vận hành</h3>
            <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
              <li>Đăng ký bằng đúng 5 ảnh khác góc nhìn nhẹ để template ổn định hơn.</li>
              <li>Trong lúc chụp, giữ mặt đủ sáng và chỉ xuất hiện một khuôn mặt trong khung hình.</li>
              <li>Frontend chỉ preview/chụp ảnh; toàn bộ detection + verification chạy trên backend OpenCV.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

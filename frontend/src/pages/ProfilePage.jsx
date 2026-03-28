import { useMemo, useState } from "react";
import { Camera, CameraOff, CheckCircle2, RefreshCcw, Save, ScanFace, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import useCamera from "../hooks/useCamera";
import Toast from "../components/Toast";

const SAMPLE_TARGET = 5;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [samples, setSamples] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const { videoRef, cameraActive, cameraLoading, cameraError, startCamera, stopCamera, captureFrame } = useCamera();

  const guideSteps = useMemo(
    () => [
      "Đăng nhập bằng mật khẩu lần đầu tiên.",
      "Vào menu Hồ sơ và bật camera.",
      "Chụp đủ 5 ảnh mẫu với góc mặt hơi khác nhau.",
      "Lưu Face ID. Từ lần sau bạn có thể dùng tab Face ID ở màn hình đăng nhập.",
    ],
    []
  );

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
  };

  const captureSample = () => {
    try {
      if (!cameraActive) {
        showToast("error", "Hãy bật camera trước khi chụp ảnh mẫu.");
        return;
      }
      if (samples.length >= SAMPLE_TARGET) {
        showToast("error", `Bạn đã chụp đủ ${SAMPLE_TARGET} ảnh mẫu.`);
        return;
      }
      const image = captureFrame();
      setSamples((prev) => [...prev, image]);
      showToast("success", `Đã chụp ${samples.length + 1}/${SAMPLE_TARGET} ảnh mẫu.`);
    } catch (error) {
      showToast("error", error.message || "Không thể chụp ảnh mẫu.");
    }
  };

  const submitSamples = async () => {
    if (samples.length !== SAMPLE_TARGET) {
      showToast("error", `Cần đúng ${SAMPLE_TARGET} ảnh mẫu để lưu Face ID.`);
      return;
    }

    setSaving(true);
    try {
      const endpoint = user?.faceAuthEnabled ? "/face/update" : "/face/register";
      const res = await api.post(endpoint, { userId: user.id, images: samples });
      updateUser(res.data.user);
      setSamples([]);
      stopCamera();
      showToast("success", res.data.message || "Đã lưu Face ID thành công.");
    } catch (error) {
      showToast("error", error.response?.data?.detail || "Không thể lưu Face ID.");
    } finally {
      setSaving(false);
    }
  };

  const disableFaceId = async () => {
    setSaving(true);
    try {
      const res = await api.post("/face/disable", { userId: user.id });
      updateUser(res.data.user);
      setSamples([]);
      stopCamera();
      showToast("success", res.data.message || "Đã tắt Face ID.");
    } catch (error) {
      showToast("error", error.response?.data?.detail || "Không thể tắt Face ID.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />

      <div>
        <h2 className="text-2xl font-bold text-slate-800">Hồ sơ người dùng</h2>
        <p className="text-slate-500 text-sm mt-1">Face ID là tùy chọn. Bạn luôn có thể tiếp tục đăng nhập bằng mật khẩu.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-800">Thông tin tài khoản</p>
              <p className="text-sm text-slate-500 mt-1">{user?.name} · {user?.email}</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-medium ${user?.faceAuthEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {user?.faceAuthEnabled ? "Face ID: Enabled" : "Face ID: Disabled"}
            </div>
          </div>

          <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm px-6 text-center">
                Bật camera để xem preview trực tiếp và chụp ảnh mẫu.
              </div>
            )}
          </div>

          {cameraError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{cameraError}</div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {cameraLoading ? "Đang bật camera..." : cameraActive ? "Mở lại camera" : "Bật camera"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <CameraOff className="w-4 h-4" />
              Tắt camera
            </button>
            <button
              type="button"
              onClick={captureSample}
              disabled={!cameraActive || samples.length >= SAMPLE_TARGET}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <ScanFace className="w-4 h-4" />
              Chụp mẫu ({samples.length}/{SAMPLE_TARGET})
            </button>
            <button
              type="button"
              onClick={submitSamples}
              disabled={saving || samples.length !== SAMPLE_TARGET}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Đang lưu..." : user?.faceAuthEnabled ? "Cập nhật Face ID" : "Đăng ký Face ID"}
            </button>
            <button
              type="button"
              onClick={() => setSamples([])}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="w-4 h-4" />
              Xóa mẫu tạm
            </button>
            {user?.faceAuthEnabled && (
              <button
                type="button"
                onClick={disableFaceId}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Tắt Face ID
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: SAMPLE_TARGET }).map((_, index) => (
              <div key={index} className={`rounded-xl px-3 py-3 text-center text-xs font-medium border ${samples[index] ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                {samples[index] ? <CheckCircle2 className="w-4 h-4 mx-auto mb-1" /> : null}
                Mẫu {index + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-800">Hướng dẫn đăng ký Face ID</h3>
          <ol className="mt-4 space-y-3">
            {guideSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-slate-600">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-semibold text-xs flex items-center justify-center shrink-0">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800 mb-2">Mẹo để đăng ký tốt hơn</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Ngồi ở nơi đủ sáng, tránh ngược sáng.</li>
              <li>Nhìn thẳng vào camera và thay đổi góc mặt nhẹ giữa các lần chụp.</li>
              <li>Đảm bảo trong khung hình chỉ có đúng một khuôn mặt.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Camera, CameraOff, Home, Lock, Mail, ScanFace } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import useCamera from "../hooks/useCamera";
import Toast from "../components/Toast";

export default function LoginPage() {
  const [tab, setTab] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [faceMessage, setFaceMessage] = useState("");
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    videoRef,
    cameraActive,
    cameraLoading,
    cameraError,
    startCamera,
    stopCamera,
    captureFrame,
  } = useCamera();

  const demoAccounts = useMemo(
    () => [
      "member1@smarthome.com / password123",
      "member2@smarthome.com / password456",
      "admin@smarthome.com / admin123",
    ],
    []
  );

  useEffect(() => {
    api.get("/face/health").then((res) => {
      setFaceAvailable(Boolean(res.data.available));
      setFaceMessage(res.data.message || "");
    }).catch(() => {
      setFaceAvailable(false);
      setFaceMessage("Không thể kết nối backend face recognition");
    });
  }, []);

  const redirectAfterLogin = (user) => {
    navigate(user.role === "ADMIN" ? "/users" : "/dashboard", { replace: true });
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", { email, password });
      login(res.data.user, res.data.token);
      redirectAfterLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi khi đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    if (!cameraActive) {
      setToast({ open: true, type: "error", message: "Hãy bật camera trước khi xác thực." });
      return;
    }

    try {
      const image = captureFrame();
      const res = await api.post("/face/login", { image });
      login(res.data.user, res.data.token);
      setToast({ open: true, type: "success", message: `Face ID hợp lệ (score ${res.data.score}). Đang chuyển trang...` });
      redirectAfterLogin(res.data.user);
    } catch (err) {
      setToast({ open: true, type: "error", message: err.response?.data?.detail || "Xác thực khuôn mặt thất bại." });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />

      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full" />
        </div>
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 bg-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">AIoT Smart Home</h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Một backend FastAPI duy nhất cho quản trị thiết bị, phân quyền ADMIN/MEMBER
            và đăng nhập bằng Face ID dùng OpenCV.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="w-full max-w-xl">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">AIoT Smart Home</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng nhập</h2>
          <p className="text-slate-500 mb-6">Bạn có thể đăng nhập bằng mật khẩu hoặc Face ID nếu đã đăng ký trong Hồ sơ.</p>

          <div className="inline-flex bg-slate-100 rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab("password")}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition ${tab === "password" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}
            >
              Mật khẩu
            </button>
            <button
              type="button"
              onClick={() => setTab("face")}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition ${tab === "face" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}
            >
              Face ID
            </button>
          </div>

          {tab === "password" ? (
            <>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handlePasswordLogin} className="space-y-5 bg-white rounded-3xl border border-slate-200 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? "Đang xử lý..." : "Đăng nhập bằng mật khẩu"}
                </button>
              </form>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-slate-300 px-6">
                    <div>
                      <ScanFace className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                      <p className="text-sm">Bật camera để xem preview trực tiếp và xác thực bằng Face ID.</p>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{cameraError}</div>
              )}

              <div className={`text-sm rounded-xl px-4 py-3 border ${faceAvailable ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                {faceMessage || (faceAvailable ? "Face recognition đã sẵn sàng" : "Backend Face ID chưa sẵn sàng")}
              </div>

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
                  onClick={handleFaceLogin}
                  disabled={!faceAvailable}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <ScanFace className="w-4 h-4" />
                  Xác thực ngay
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Chưa có Face ID? Hãy đăng nhập bằng mật khẩu lần đầu, sau đó vào <strong>Hồ sơ</strong> để chụp 5 ảnh mẫu và kích hoạt đăng nhập khuôn mặt.
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-slate-100 rounded-xl">
            <p className="text-xs font-medium text-slate-500 mb-2">Tài khoản demo:</p>
            <div className="space-y-1 text-xs text-slate-600">
              {demoAccounts.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

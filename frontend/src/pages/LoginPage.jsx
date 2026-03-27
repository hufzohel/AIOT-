import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  Home,
  Lock,
  Mail,
  ScanFace,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCamera } from "../hooks/useCamera";
import axios from "axios";

function navigateByRole(navigate, user) {
  navigate(user?.role === "ADMIN" ? "/users" : "/dashboard");
}

export default function LoginPage() {
  const [tab, setTab] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [health, setHealth] = useState({ ready: false, message: "Đang kiểm tra backend face..." });
  const { login } = useAuth();
  const navigate = useNavigate();
  const { videoRef, cameraActive, cameraError, startCamera, stopCamera, captureFrame } = useCamera();

  useEffect(() => {
    axios
      .get("/api/face/health")
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({ ready: false, message: "Không thể kết nối backend face recognition" }));
  }, []);

  const faceStatusText = useMemo(() => {
    if (health.ready) return "Backend face recognition đã sẵn sàng";
    return health.message || "Backend face recognition chưa sẵn sàng";
  }, [health]);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post("/api/login", { email, password });
      login(data.user, data.token);
      navigateByRole(navigate, data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    setError("");
    setFaceLoading(true);

    try {
      const image = captureFrame();
      const { data } = await axios.post("/api/face/login", { image });
      login(data.user, data.token);
      navigateByRole(navigate, data.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Xác thực khuôn mặt thất bại");
    } finally {
      setFaceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
            Frontend chỉ preview/chụp ảnh. Backend OpenCV thực hiện detection, align, feature extraction và verification.
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
          <p className="text-slate-500 mb-8">Bạn có thể đăng nhập bằng mật khẩu hoặc xác thực khuôn mặt.</p>

          <div className="inline-flex rounded-2xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab("password")}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === "password" ? "bg-white text-primary-700 shadow-sm" : "text-slate-600"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Mật khẩu
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("face")}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === "face" ? "bg-white text-primary-700 shadow-sm" : "text-slate-600"
                }`}
            >
              <span className="inline-flex items-center gap-2">
                <ScanFace className="w-4 h-4" />
                Face Login
              </span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {tab === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5 bg-white rounded-2xl border border-slate-200 p-6">
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
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
              <p className="text-xs text-slate-500">
                Sau lần đăng nhập đầu tiên bằng mật khẩu, người dùng có thể vào <span className="font-semibold">Hồ sơ</span> để đăng ký 5 ảnh mẫu cho Face Login.
              </p>
            </form>
          ) : (
            <div className="space-y-5 bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Đăng nhập bằng khuôn mặt</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Bật camera, preview trực tiếp trên webapp, sau đó bấm Xác thực để gửi 1 frame lên backend OpenCV.
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${health.ready
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                    }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {health.ready ? "READY" : "CHECK"}
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
                      <p className="text-sm">Bật camera để xem preview và xác thực bằng gương mặt.</p>
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
                  onClick={handleFaceLogin}
                  disabled={!cameraActive || faceLoading || !health.ready}
                  className="px-4 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
                >
                  {faceLoading ? "Đang xác thực..." : "Xác thực"}
                </button>
              </div>

              {(cameraError || faceStatusText) && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${health.ready && !cameraError
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                >
                  {cameraError || faceStatusText}
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                <p className="font-medium text-slate-700">Luồng đăng nhập hiện tại</p>
                <p>1. Người dùng đã đăng ký 5 ảnh mẫu trong trang Hồ sơ.</p>
                <p>2. Khi bấm Xác thực, frontend chỉ gửi 1 frame hiện tại lên backend.</p>
                <p>3. Backend OpenCV detect mặt, align, trích xuất feature và match với template đã lưu.</p>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-slate-100 rounded-xl">
            <p className="text-xs font-medium text-slate-500 mb-2">Tài khoản demo:</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-medium">User 1:</span> member1@smarthome.com / password123</p>
              <p><span className="font-medium">User 2:</span> member2@smarthome.com / password456</p>
              <p><span className="font-medium">Admin:</span> admin@smarthome.com / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

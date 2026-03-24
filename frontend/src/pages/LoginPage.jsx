import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/login", { email, password });
      const { user, token } = res.data;
      localStorage.setItem("smarthome_token", token);
      login(user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
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
          <h1 className="text-4xl font-bold text-white mb-4">
            AIoT Smart Home
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Hệ thống quản lý nhà thông minh tích hợp trí tuệ nhân tạo và IoT.
            Điều khiển mọi thiết bị từ xa, theo dõi môi trường thời gian thực.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">AIoT Smart Home</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Đăng nhập
          </h2>
          <p className="text-slate-500 mb-8">
            Vui lòng nhập thông tin để truy cập hệ thống
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mật khẩu
              </label>
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
          </form>

          <div className="mt-8 p-4 bg-slate-100 rounded-xl">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Tài khoản demo:
            </p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>
                <span className="font-medium">User 1:</span> user@smarthome.com
                / password123
              </p>
              <p>
                <span className="font-medium">User 2:</span>{" "}
                user2@smarthome.com / password456
              </p>
              <p>
                <span className="font-medium">Admin:</span>{" "}
                admin@smarthome.com / admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

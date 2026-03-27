import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, User, ScanFace } from "lucide-react";
import axios from "axios";
import DashboardPage from "./DashboardPage";
import DevicesPage from "./DevicesPage";

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    axios
      .get(`/api/users/${id}`)
      .then((res) => setUserInfo(res.data))
      .catch(() => navigate("/users"));
  }, [id, navigate]);

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/users")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
          <User className="w-7 h-7 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{userInfo.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-500">{userInfo.email}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-primary-100 text-primary-700">
              {userInfo.role}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                userInfo.faceAuth?.enabled
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <ScanFace className="w-3.5 h-3.5" />
              {userInfo.faceAuth?.enabled ? "Đã đăng ký face" : "Chưa đăng ký face"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[
          { key: "dashboard", label: "Dashboard" },
          { key: "devices", label: "Thiết bị" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>{tab === "dashboard" ? <DashboardPage userId={Number(id)} /> : <DevicesPage userId={Number(id)} />}</div>
    </div>
  );
}

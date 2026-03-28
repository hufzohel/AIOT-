import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, User } from "lucide-react";
import api from "../lib/api";
import Toast from "../components/Toast";
import DashboardPage from "./DashboardPage";
import DevicesPage from "./DevicesPage";
import MemberPermissionsPanel from "../components/MemberPermissionsPanel";

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });

  const refreshUser = async () => {
    try {
      const { data } = await api.get(`/users/${id}`);
      setUserInfo(data);
    } catch {
      navigate("/users");
    }
  };

  useEffect(() => {
    refreshUser();
  }, [id]);

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "devices", label: "Thiết bị được cấp" },
  ];
  if (userInfo.role === "MEMBER") tabs.push({ key: "permissions", label: "Phân quyền" });

  return (
    <div className="space-y-6">
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />

      <button onClick={() => navigate("/users")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
          <User className="w-7 h-7 text-primary-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{userInfo.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-500">{userInfo.email}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${userInfo.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-primary-100 text-primary-700"}`}>{userInfo.role}</span>
            {userInfo.role === "MEMBER" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Có thể phân quyền
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-0 flex-wrap">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === item.key ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "dashboard" && <DashboardPage userId={Number(id)} />}
        {tab === "devices" && <DevicesPage userId={Number(id)} readOnly />}
        {tab === "permissions" && userInfo.role === "MEMBER" && (
          <MemberPermissionsPanel memberId={Number(id)} memberName={userInfo.name} onUpdated={refreshUser} onStatusChange={(status) => {
            if (!status) return;
            setToast({ open: true, type: status.type, message: status.text });
          }} />
        )}
      </div>
    </div>
  );
}

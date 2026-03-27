import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, User } from "lucide-react";
import axios from "axios";
import DashboardPage from "./DashboardPage";
import DevicesPage from "./DevicesPage";
import MemberPermissionsPanel from "../components/MemberPermissionsPanel";

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    axios
      .get(`/api/users/${id}`)
      .then((res) => setUserInfo(res.data))
      .catch(() => navigate("/users"));
  }, [id, navigate]);

  const refreshUser = async () => {
    try {
      const { data } = await axios.get(`/api/users/${id}`);
      setUserInfo(data);
    } catch {
      navigate("/users");
    }
  };

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

  if (userInfo.role === "MEMBER") {
    tabs.push({ key: "permissions", label: "Phân quyền" });
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${banner.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {banner.text}
        </div>
      )}

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

        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{userInfo.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-500">{userInfo.email}</span>

            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${userInfo.role === "ADMIN"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-primary-100 text-primary-700"
                }`}
            >
              {userInfo.role}
            </span>

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
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setBanner(null);
              setTab(t.key);
            }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "dashboard" && <DashboardPage userId={parseInt(id, 10)} />}

        {tab === "devices" && (
          <DevicesPage
            userId={parseInt(id, 10)}
            readOnly={true}
          />
        )}

        {tab === "permissions" && userInfo.role === "MEMBER" && (
          <MemberPermissionsPanel
            memberId={parseInt(id, 10)}
            memberName={userInfo.name}
            onUpdated={refreshUser}
            onStatusChange={setBanner}
          />
        )}
      </div>
    </div>
  );
}
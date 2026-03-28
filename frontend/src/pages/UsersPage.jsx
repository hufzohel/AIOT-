import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Cpu, Power, User } from "lucide-react";
import api from "../lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/users").then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Người dùng</h2>
        <p className="text-slate-500 text-sm mt-1">Chọn một MEMBER để xem dashboard, thiết bị được cấp và chỉnh phân quyền.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => navigate(`/users/${user.id}`)}
            className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-primary-300 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-primary-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-primary-100 text-primary-700">MEMBER</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{user.deviceCount}</span> thiết bị</span>
              </div>
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-accent-500" />
                <span className="text-xs text-slate-600"><span className="font-semibold text-accent-600">{user.activeDeviceCount}</span> đang bật</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-400">Không có MEMBER nào</div>
      )}
    </div>
  );
}

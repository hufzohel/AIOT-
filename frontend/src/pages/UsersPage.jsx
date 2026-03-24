import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ChevronRight, Cpu, Power } from "lucide-react";
import axios from "axios";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/api/users").then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Người dùng</h2>
        <p className="text-slate-500 text-sm mt-1">
          Chọn một người dùng để xem dashboard và thiết bị của họ
        </p>
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
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">
                    {user.deviceCount}
                  </span>{" "}
                  thiết bị
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-accent-500" />
                <span className="text-xs text-slate-600">
                  <span className="font-semibold text-accent-600">
                    {user.activeDeviceCount}
                  </span>{" "}
                  đang bật
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          Không có người dùng nào
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import axios from "axios";

const levelConfig = {
  info: {
    icon: Info,
    text: "text-primary-600",
    badge: "bg-primary-100 text-primary-700",
  },
  warning: {
    icon: AlertTriangle,
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  error: {
    icon: AlertCircle,
    text: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  success: {
    icon: CheckCircle,
    text: "text-green-600",
    badge: "bg-green-100 text-green-700",
  },
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get("/api/logs").then((res) => setLogs(res.data));
  }, []);

  const formatTime = (ts) =>
    new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Nhật ký hệ thống</h2>
        <p className="text-slate-500 text-sm mt-1">Theo dõi các hoạt động gần đây trong hệ thống</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Người dùng</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mức độ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const config = levelConfig[log.level] || levelConfig.info;
              const Icon = config.icon;
              return (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">{formatTime(log.timestamp)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{log.user}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.text}`} />
                      <span className="text-sm text-slate-700">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${config.badge}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

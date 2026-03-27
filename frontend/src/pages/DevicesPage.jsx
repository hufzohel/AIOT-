import { useEffect, useMemo, useState } from "react";
import { Power, Search } from "lucide-react";
import axios from "axios";
import DeviceCard from "../components/DeviceCard";
import { useAuth } from "../contexts/AuthContext";

export default function DevicesPage({ userId: propUserId, readOnly = false }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [banner, setBanner] = useState(null);
  const [loadingIds, setLoadingIds] = useState([]);

  const isScopedMemberView = Boolean(propUserId);
  const isAdminGlobalPage = !propUserId && user?.role === "ADMIN";

  const loadDevices = async () => {
    try {
      const res = isScopedMemberView
        ? await axios.get("/api/devices", { params: { userId: propUserId } })
        : await axios.get("/api/devices");

      setDevices(res.data);
    } catch {
      setBanner({ type: "error", text: "Không thể tải danh sách thiết bị." });
    }
  };

  useEffect(() => {
    loadDevices();
  }, [propUserId]);

  const handleToggle = async (id) => {
    const target = devices.find((d) => d.id === id);
    if (!target) return;

    if (readOnly) {
      setBanner({
        type: "error",
        text: "Đây là chế độ theo dõi thiết bị được phân quyền cho MEMBER, không phải nơi điều khiển hệ thống.",
      });
      return;
    }

    if (!target.online) {
      setBanner({
        type: "error",
        text: `Thiết bị "${target.name}" đang offline nên không thể bật/tắt.`,
      });
      return;
    }

    try {
      setLoadingIds((prev) => [...prev, id]);
      const res = await axios.post(`/api/devices/${id}/toggle`, {
        actorId: user?.id,
      });
      setDevices((prev) => prev.map((d) => (d.id === id ? res.data : d)));
      setBanner({
        type: "success",
        text: `${res.data.power ? "Bật" : "Tắt"} thiết bị "${res.data.name}" thành công.`,
      });
    } catch (err) {
      setBanner({
        type: "error",
        text: err.response?.data?.message || "Không thể thay đổi trạng thái thiết bị.",
      });
    } finally {
      setLoadingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkPower = async (power) => {
    try {
      const res = await axios.post("/api/devices/bulk-power", {
        actorId: user?.id,
        power,
      });
      setDevices(res.data.devices);
      setBanner({
        type: "success",
        text: `${power ? "Bật" : "Tắt"} tất cả thiết bị online thành công.`,
      });
    } catch (err) {
      setBanner({
        type: "error",
        text: err.response?.data?.message || "Không thể cập nhật toàn bộ thiết bị.",
      });
    }
  };

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || d.type === filter;
      return matchSearch && matchFilter;
    });
  }, [devices, search, filter]);

  const onlineCount = devices.filter((d) => d.online).length;
  const onCount = devices.filter((d) => d.power).length;

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

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isScopedMemberView ? "Thiết bị được cấp cho MEMBER" : "Thiết bị"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isScopedMemberView
              ? "Danh sách thiết bị mà MEMBER này được phép sử dụng."
              : user?.role === "ADMIN"
                ? "Quản lý toàn bộ thiết bị và trạng thái vận hành trong nhà."
                : "Quản lý các thiết bị bạn được cấp quyền sử dụng."}
          </p>
        </div>

        {isAdminGlobalPage && !readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkPower(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              <Power className="w-4 h-4" />
              Bật tất cả
            </button>
            <button
              onClick={() => handleBulkPower(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900"
            >
              <Power className="w-4 h-4" />
              Tắt tất cả
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Tổng thiết bị</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{devices.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Đang online</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{onlineCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Đang bật</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{onCount}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thiết bị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          {[
            { key: "all", label: "Tất cả" },
            { key: "light", label: "Đèn" },
            { key: "fan", label: "Quạt" },
            { key: "ac", label: "Điều hòa" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${filter === f.key
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onToggle={handleToggle}
            toggling={loadingIds.includes(device.id)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          Không tìm thấy thiết bị phù hợp
        </div>
      )}
    </div>
  );
}
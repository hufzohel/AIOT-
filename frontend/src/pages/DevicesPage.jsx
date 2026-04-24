import { useEffect, useMemo, useState } from "react";
import { Power, Search } from "lucide-react";
import api from "../lib/api"; // Kept for the bulk power API call
import { useAuth } from "../contexts/AuthContext";
import { useDeviceSync } from "../hooks/useDeviceSync"; // YOUR architecture
import Toast from "../components/Toast"; // THEIR UI feature

// YOUR polymorphic cards
import FanCard from "../components/FanCard";
import ACCard from "../components/ACCard";
import LightCard from "../components/LightCard";

export default function DevicesPage({ userId: propUserId, readOnly = false }) {
  const { user } = useAuth();
  
  // State from both branches
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });

  const isScopedMemberView = Boolean(propUserId);
  const isAdminGlobalPage = !propUserId && user?.role === "ADMIN";
  const targetUserId = propUserId || user?.id;

  const showToast = (type, message) => setToast({ open: true, type, message });

  // YOUR custom hook powers the data engine
  const { devices, toggleDevice, updateValue, updateSwing, updateSleep } = useDeviceSync(targetUserId);

  // WRAPPER: Adds their Toast UI and security checks to your hardware toggle
  const handleToggle = async (id) => {
    const target = devices.find((item) => item.id === id);
    if (!target) return;
    
    if (readOnly) {
      showToast("error", "Đây là chế độ theo dõi thiết bị được phân quyền cho MEMBER.");
      return;
    }
    // Optional: Keep their offline check if your hardware sync supports it
    if (target.online === false) {
      showToast("error", `Thiết bị "${target.name}" đang offline nên không thể bật/tắt.`);
      return;
    }

    try {
      // Calls YOUR hook
      await toggleDevice(id);
      showToast("success", `Đã gửi lệnh cập nhật trạng thái cho "${target.name}".`);
    } catch (error) {
      showToast("error", "Không thể thay đổi trạng thái thiết bị.");
    }
  };

  // THEIR Admin Bulk Power Logic
  const handleBulkPower = async (power) => {
    try {
      await api.post("/devices/bulk-power", { actorId: user?.id, power });
      showToast("success", `${power ? "Bật" : "Tắt"} tất cả thiết bị thành công.`);
      // Note: Your useDeviceSync hook should auto-fetch/sync this change
    } catch (error) {
      showToast("error", "Không thể cập nhật toàn bộ thiết bị.");
    }
  };

  // Unified Filtering Logic
  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || d.type === filter;
      return matchSearch && matchFilter;
    });
  }, [devices, search, filter]);

  // THEIR Statistics Calculations
  const onlineCount = devices.filter((device) => device.online !== false).length; // Default to true if missing
  const onCount = devices.filter((device) => device.status || device.power).length; // Adapting to your data structure

  return (
    <div className="space-y-6">
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />

      {/* 1. THEIR HEADER & BULK ADMIN BUTTONS */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{isScopedMemberView ? "Thiết bị được cấp" : "Thiết bị"}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {isScopedMemberView
              ? "Danh sách thiết bị mà MEMBER này được phép sử dụng."
              : user?.role === "ADMIN"
                ? "Quản lý toàn bộ thiết bị trong nhà."
                : "Các thiết bị bạn được cấp quyền sử dụng."}
          </p>
        </div>

        {isAdminGlobalPage && !readOnly && (
          <div className="flex gap-2">
            <button onClick={() => handleBulkPower(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
              <Power className="w-4 h-4" />
              Bật tất cả
            </button>
            <button onClick={() => handleBulkPower(false)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
              <Power className="w-4 h-4" />
              Tắt tất cả
            </button>
          </div>
        )}
      </div>

      {/* 2. THEIR STATISTICS GRID */}
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
          <p className="text-2xl font-bold text-cyan-600 mt-1">{onCount}</p>
        </div>
      </div>

      {/* 3. THEIR SEARCH BAR & NEW BUTTON FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thiết bị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tất cả" },
            { key: "light", label: "Đèn" },
            { key: "fan", label: "Quạt" },
            { key: "ac", label: "Điều hòa" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${filter === item.key ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. YOUR MASTER ARCHITECTURE (Polymorphic Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((device) => {
          if (device.type === "fan") {
            return (
              <FanCard
                key={device.id}
                device={device}
                onToggle={() => handleToggle(device.id)}
                onSpeedChange={updateValue}   
                onSwingToggle={updateSwing}   
                readOnly={readOnly} // Pass readOnly down just in case
              />
            );
          }
          if (device.type === "ac") {
            return (
              <ACCard
                key={device.id}
                device={device}
                onToggle={() => handleToggle(device.id)}
                onTempChange={updateValue}    
                onSwingToggle={updateSwing}  
                onSleepToggle={updateSleep}
                readOnly={readOnly}
              />
            );
          }
          return (
            <LightCard
              key={device.id}
              device={device}
              onToggle={() => handleToggle(device.id)}
              readOnly={readOnly}
            />
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-400 text-sm">Không tìm thấy thiết bị phù hợp</p>
        </div>
      )}
    </div>
  );
}
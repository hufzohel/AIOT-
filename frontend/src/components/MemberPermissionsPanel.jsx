import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Save, ShieldCheck } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function MemberPermissionsPanel({ memberId, memberName, onUpdated, onStatusChange }) {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [deviceIds, setDeviceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [memberRes, devicesRes] = await Promise.all([
          api.get(`/users/${memberId}`),
          api.get("/devices"),
        ]);
        if (cancelled) return;
        setMember(memberRes.data);
        setDevices(devicesRes.data);
        setDeviceTypes(memberRes.data.permissions?.deviceTypes || []);
        setDeviceIds(memberRes.data.permissions?.deviceIds || []);
      } catch (error) {
        if (!cancelled) {
          onStatusChange?.({ type: "error", text: "Không thể tải dữ liệu phân quyền." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [memberId, onStatusChange]);

  const groupedDevices = useMemo(() => {
    const groups = Array.from(new Set(devices.map((device) => device.type)));
    return groups.map((groupKey) => ({
      key: groupKey,
      label: groupKey === "light" ? "Đèn" : groupKey === "fan" ? "Quạt" : "Điều hòa",
      devices: devices.filter((device) => device.type === groupKey),
    }));
  }, [devices]);

  const toggleDeviceType = (type) => {
    setDeviceTypes((prev) => prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]);
  };

  const toggleDeviceId = (id) => {
    setDeviceIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    onStatusChange?.(null);
    try {
      const { data } = await api.patch(`/users/${memberId}/permissions`, {
        actorId: user?.id,
        deviceTypes,
        deviceIds,
      });
      setMember(data.user);
      onUpdated?.(data.user);
      onStatusChange?.({ type: "success", text: data.message || "Phân quyền thành công" });
    } catch (error) {
      onStatusChange?.({ type: "error", text: error.response?.data?.detail || "Phân quyền không thành công" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-center min-h-[260px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!member || member.role !== "MEMBER") {
    return <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Chỉ có thể phân quyền cho tài khoản MEMBER.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium mb-3">
              <ShieldCheck className="w-4 h-4" />
              Phân quyền cho {memberName || member.name}
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Quyền sử dụng theo loại thiết bị</h3>
            <p className="text-sm text-slate-500 mt-1">MEMBER sẽ thấy và dùng được toàn bộ thiết bị thuộc các loại được cấp ở đây.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu phân quyền
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          {groupedDevices.map((item) => {
            const checked = deviceTypes.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleDeviceType(item.key)}
                className={`p-4 rounded-2xl border text-left transition-all ${checked ? "border-primary-500 bg-primary-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{item.label}</p>
                    <p className="text-sm text-slate-500 mt-1">Cấp quyền theo loại thiết bị</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${checked ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800">Quyền sử dụng theo từng thiết bị</h3>
        <p className="text-sm text-slate-500 mt-1">Dùng để cấp thêm các thiết bị riêng lẻ ngoài quyền theo loại.</p>

        <div className="space-y-5 mt-6">
          {groupedDevices.map((group) => (
            <div key={group.key}>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">{group.label}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.devices.map((device) => {
                  const checked = deviceIds.includes(device.id);
                  const inherited = deviceTypes.includes(device.type);
                  return (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => toggleDeviceId(device.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${checked ? "border-primary-500 bg-primary-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{device.name}</p>
                          <p className="text-sm text-slate-500 mt-1 capitalize">Loại: {device.type}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${device.online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{device.online ? "Online" : "Offline"}</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${device.power ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{device.power ? "ON" : "OFF"}</span>
                            {inherited && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">Được cấp theo loại</span>}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${checked ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

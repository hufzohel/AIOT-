import { Check, Loader2, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

export default function MemberPermissionsPanel({ memberId }) {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        const [devicesRes, typesRes, permissionsRes] = await Promise.all([
          api.get("/api/devices"),
          api.get("/api/device-types"),
          api.get(`/api/users/${memberId}/permissions`),
        ]);

        if (!mounted) return;
        setDevices(devicesRes.data);
        setDeviceTypes(typesRes.data);
        setSelectedTypes(permissionsRes.data.deviceTypes || []);
        setSelectedDeviceIds(permissionsRes.data.deviceIds || []);
      } catch (err) {
        setError(err.response?.data?.message || "Không thể tải cấu hình phân quyền");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [memberId]);

  const accessiblePreviewCount = useMemo(() => {
    const typeSet = new Set(selectedTypes);
    const deviceSet = new Set(selectedDeviceIds);
    return devices.filter((device) => typeSet.has(device.type) || deviceSet.has(device.id)).length;
  }, [devices, selectedDeviceIds, selectedTypes]);

  const toggleType = (typeKey) => {
    setMessage("");
    setSelectedTypes((prev) =>
      prev.includes(typeKey) ? prev.filter((item) => item !== typeKey) : [...prev, typeKey]
    );
  };

  const toggleDevice = (deviceId) => {
    setMessage("");
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId) ? prev.filter((item) => item !== deviceId) : [...prev, deviceId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const res = await api.put(`/api/users/${memberId}/permissions`, {
        deviceTypes: selectedTypes,
        deviceIds: selectedDeviceIds,
      });
      setMessage(res.data.message || "Đã lưu phân quyền");
    } catch (err) {
      setError(err.response?.data?.message || "Lưu phân quyền thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-56">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-primary-800">Quy tắc phân quyền</h3>
          <p className="text-sm text-primary-700 mt-1 leading-relaxed">
            Member được sử dụng thiết bị nếu thiết bị đó thuộc loại thiết bị được cấp quyền hoặc nằm trong danh sách cấp riêng theo từng thiết bị.
          </p>
          <p className="text-xs text-primary-700 mt-3 font-medium">
            Xem trước: {accessiblePreviewCount} thiết bị có thể điều khiển.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <Check className="w-4 h-4" />
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Cấp quyền theo loại thiết bị</h4>
          <p className="text-xs text-slate-500 mt-1">Phù hợp khi Member được quyền thao tác toàn bộ một nhóm thiết bị như đèn, quạt hoặc điều hòa.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {deviceTypes.map((item) => {
            const active = selectedTypes.includes(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggleType(item.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  active
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-800">Cấp quyền riêng theo thiết bị</h4>
          <p className="text-xs text-slate-500 mt-1">Dùng khi Member chỉ được thao tác một vài thiết bị cụ thể.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {devices.map((device) => {
            const active = selectedDeviceIds.includes(device.id);
            return (
              <button
                key={device.id}
                onClick={() => toggleDevice(device.id)}
                className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                  active
                    ? "border-primary-500 bg-primary-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{device.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{device.room} · {device.type}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold ${
                      active ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {active ? "Đã cấp" : "Chưa cấp"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Đang lưu..." : "Lưu phân quyền"}
        </button>
      </div>
    </div>
  );
}

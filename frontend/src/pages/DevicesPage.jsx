import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import axios from "axios";
import DeviceCard from "../components/DeviceCard";
import { useAuth } from "../contexts/AuthContext";

export default function DevicesPage({ userId: propUserId }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const targetUserId = propUserId || user?.id;

  useEffect(() => {
    axios
      .get("/api/devices", { params: { userId: targetUserId } })
      .then((res) => setDevices(res.data));
  }, [targetUserId]);

  const handleToggle = async (id) => {
    try {
      const res = await axios.post(`/api/devices/${id}/toggle`);
      setDevices((prev) => prev.map((d) => (d.id === id ? res.data : d)));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = devices.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {!propUserId && (
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Thiết bị</h2>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý tất cả thiết bị trong nhà
          </p>
        </div>
      )}

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
              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                filter === f.key
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

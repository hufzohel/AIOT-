import { useEffect, useState } from "react";
import { Thermometer, Droplets, Sun } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import StatCard from "../components/StatCard";
import SensorChart from "../components/SensorChart";
import LightChart from "../components/LightChart";

export default function DashboardPage({ userId: propUserId }) {
  const { user } = useAuth();
  const [sensors, setSensors] = useState(null);
  const [loading, setLoading] = useState(true);

  const targetUserId = propUserId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    axios
      .get("/api/sensors", { params: { userId: targetUserId } })
      .then((res) => setSensors(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [targetUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latestTemp = sensors?.temperature?.at(-1)?.value ?? "--";
  const latestHumid = sensors?.humidity?.at(-1)?.value ?? "--";
  const latestLight = sensors?.light?.at(-1)?.value ?? "--";

  return (
    <div className="space-y-8">
      {!propUserId && (
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Tổng quan hệ thống nhà thông minh</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard icon={Thermometer} label="Nhiệt độ" value={latestTemp} unit="°C" color="bg-primary-600" />
        <StatCard icon={Droplets} label="Độ ẩm" value={latestHumid} unit="%" color="bg-primary-500" />
        <StatCard icon={Sun} label="Ánh sáng" value={latestLight} unit="lux" color="bg-accent-500" />
      </div>

      {sensors && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SensorChart data={sensors} title="Nhiệt độ & Độ ẩm theo thời gian" />
          <LightChart data={sensors.light} />
        </div>
      )}
    </div>
  );
}

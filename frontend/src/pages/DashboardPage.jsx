import { useEffect, useState } from "react";
import { Cpu, Droplets, Power, Thermometer, Wifi } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import StatCard from "../components/StatCard";
import SensorChart from "../components/SensorChart";
import LightChart from "../components/LightChart";

export default function DashboardPage({ userId: propUserId }) {
  const { user } = useAuth();
  const targetUserId = propUserId || user?.id;
  const [sensors, setSensors] = useState(null);
  const [devices, setDevices] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    api.get("/sensors", { params: { userId: targetUserId } }).then((res) => setSensors(res.data)).catch(() => setSensors(null));
    api.get("/devices", { params: { userId: targetUserId } }).then((res) => setDevices(res.data)).catch(() => setDevices([]));
    setPredictionLoading(true);
    api.get("/temperature/predict").then((res) => setPrediction(res.data)).catch((err) => console.error("Prediction failed:", err)).finally(() => setPredictionLoading(false));
  }, [targetUserId]);

  const latest = useMemo(() => {
    if (!sensors) return { temp: 0, humidity: 0, light: 0 };
    return {
      temp: sensors.temperature.at(-1)?.value || 0,
      humidity: sensors.humidity.at(-1)?.value || 0,
      light: sensors.light.at(-1)?.value || 0,
    };
  }, [sensors]);

  const onlineCount = devices.filter((device) => device.online).length;
  const activeCount = devices.filter((device) => device.power).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Theo dõi nhanh thiết bị và dữ liệu cảm biến theo quyền truy cập của người dùng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard icon={Thermometer} label="Nhiệt độ" value={latest.temp} unit="°C" color="bg-red-500" />
        <StatCard icon={Droplets} label="Độ ẩm" value={latest.humidity} unit="%" color="bg-primary-600" />
        <StatCard icon={Cpu} label="Ánh sáng" value={latest.light} unit="lux" color="bg-amber-500" />
        <StatCard icon={Wifi} label="Đang online" value={onlineCount} color="bg-emerald-600" />
        <StatCard icon={Power} label="Đang bật" value={activeCount} color="bg-slate-900" />
      </div>

      {sensors ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SensorChart data={sensors} title="Nhiệt độ & độ ẩm" />
          <LightChart data={sensors.light} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">Không có dữ liệu cảm biến cho người dùng này.</div>
      )}

      {/* AI Prediction Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold">🤖 AI Temperature Prediction</h3>
        {predictionLoading ? (
          <p>Loading prediction...</p>
        ) : prediction ? (
          <>
            <p className="text-4xl font-bold mt-2">{prediction.prediction_celsius}°C</p>
            <p className="text-sm mt-1 opacity-90">{prediction.message}</p>
          </>
        ) : (
          <p className="text-red-300">Failed to load prediction</p>
        )}
      </div>
    </div>
  );
}

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function SensorChart({ title, predictions }) {
  // 1. FORMAT THE DATA: We only use the 4 future points now
  const chartData = (predictions || []).map((temp, idx) => ({
    time: `+${idx + 1}h`,
    ai_temp: temp,
  }));

  // 2. DYNAMIC ZOOM: Ensure the line doesn't look flat
  const allTemps = chartData.map(d => d.ai_temp);
  const minTemp = allTemps.length ? Math.floor(Math.min(...allTemps)) - 1 : 20;
  const maxTemp = allTemps.length ? Math.ceil(Math.max(...allTemps)) + 1 : 35;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800 mb-4">{title} (AI Projection)</h3>
      <div style={{ width: '100%', height: 300 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                domain={[minTemp, maxTemp]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                label={{ value: '°C', angle: -90, position: 'insideLeft', fill: "#94a3b8" }}
              />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
              />
              <Legend />
              
              {/* ONLY THE AI PREDICTION LINE */}
              <Line
                type="monotone"
                dataKey="ai_temp"
                stroke="#9333ea" 
                strokeWidth={4}
                dot={{ r: 6, fill: "#9333ea", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8 }}
                name="Dự báo Nhiệt độ (AI)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Đang tính toán dự báo...
          </div>
        )}
      </div>
    </div>
  );
}
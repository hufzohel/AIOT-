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

export default function SensorChart({ data, title }) {
  const merged = data.temperature.map((t, i) => ({
    time: t.time,
    temperature: t.value,
    humidity: data.humidity[i]?.value,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            yAxisId="temp"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            label={{
              value: "°C",
              position: "insideTopLeft",
              offset: -5,
              style: { fontSize: 12, fill: "#94a3b8" },
            }}
          />
          <YAxis
            yAxisId="humid"
            orientation="right"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            label={{
              value: "%",
              position: "insideTopRight",
              offset: -5,
              style: { fontSize: 12, fill: "#94a3b8" },
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "13px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "13px" }} iconType="circle" />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Nhiệt độ (°C)"
          />
          <Line
            yAxisId="humid"
            type="monotone"
            dataKey="humidity"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name="Độ ẩm (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

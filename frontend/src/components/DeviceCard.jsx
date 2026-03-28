import { Fan, Lightbulb, Power, Snowflake, Wifi, WifiOff } from "lucide-react";

const typeIcons = {
  light: Lightbulb,
  fan: Fan,
  ac: Snowflake,
};

const typeLabels = {
  light: "Đèn",
  fan: "Quạt",
  ac: "Điều hòa",
};

export default function DeviceCard({ device, onToggle, toggling = false, readOnly = false }) {
  const Icon = typeIcons[device.type] || Lightbulb;
  const isOnline = Boolean(device.online);
  const isPowerOn = Boolean(device.power);

  return (
    <div className={`bg-white rounded-2xl border p-5 transition-all ${isPowerOn ? "border-emerald-300 shadow-sm" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isPowerOn ? "bg-emerald-500" : "bg-slate-100"}`}>
          <Icon className={`w-5 h-5 ${isPowerOn ? "text-white" : "text-slate-400"}`} />
        </div>

        <button
          onClick={() => onToggle(device.id)}
          disabled={!isOnline || toggling || readOnly}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            !isOnline || readOnly
              ? "bg-slate-200 cursor-not-allowed"
              : isPowerOn
                ? "bg-emerald-500"
                : "bg-slate-300"
          } disabled:opacity-70`}
          title={readOnly ? "Đây là chế độ theo dõi quyền của MEMBER" : !isOnline ? "Thiết bị đang offline" : isPowerOn ? "Tắt thiết bị" : "Bật thiết bị"}
        >
          <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isPowerOn ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${isPowerOn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          <Power className="w-3.5 h-3.5" />
          {isPowerOn ? "ON" : "OFF"}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-slate-800">{device.name}</h3>
      <p className="text-xs text-slate-400 mt-0.5">{device.room} · {typeLabels[device.type]}</p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Trạng thái: <span className={isPowerOn ? "text-emerald-600 font-semibold" : "text-slate-500 font-semibold"}>{isPowerOn ? "Bật" : "Tắt"}</span>
        </p>
        {isPowerOn && (
          <p className="text-xs text-emerald-600 font-medium">
            {device.type === "ac" ? `${device.value}°C` : device.type === "fan" ? `Tốc độ ${device.value}` : `${device.value}%`}
          </p>
        )}
      </div>
    </div>
  );
}

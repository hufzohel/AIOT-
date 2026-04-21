import React from "react";
import { Lightbulb, Fan, Snowflake } from "lucide-react";

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

export default function BaseDeviceCard({ device, onToggle, children }) {
  const Icon = typeIcons[device.type] || Lightbulb;

  return (
    <div
      className={`bg-white rounded-2xl border p-5 transition-all ${
        device.status ? "border-orange-400" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            device.status ? "bg-orange-500" : "bg-slate-100"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              device.status ? "text-white" : "text-slate-400"
            }`}
          />
        </div>
        <button
          onClick={() => onToggle(device.id)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            device.status ? "bg-orange-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
              device.status ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{device.name}</h3>
      <p className="text-xs text-slate-400 mt-0.5">
        {device.room} · {typeLabels[device.type]}
      </p>
      
      {/* This is where the custom buttons (like Fan Speed) get injected */}
      {device.status && children && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
import React from "react";
import BaseDeviceCard from "./BaseCard";

export default function FanCard({ device, onToggle, onSpeedChange }) {
  return (
    <BaseDeviceCard device={device} onToggle={onToggle}>
      
      {/* Speed Controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500">Tốc độ</span>
        <div className="flex gap-2">
          {[1, 2, 3].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(device.id, speed)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                device.value === speed
                  ? "bg-green-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

    </BaseDeviceCard>
  );
}
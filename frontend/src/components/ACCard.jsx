import React from "react";
import BaseDeviceCard from "./BaseCard";
import { Minus, Plus } from "lucide-react";

export default function ACCard({ device, onToggle, onTempChange, readOnly }) {
  const MIN_TEMP = 16;
  const MAX_TEMP = 30;

  const handleDecrease = () => {
    if (device.value > MIN_TEMP && !readOnly) onTempChange(device.id, device.value - 1);
  };

  const handleIncrease = () => {
    if (device.value < MAX_TEMP && !readOnly) onTempChange(device.id, device.value + 1);
  };

  return (
    <BaseDeviceCard device={device} onToggle={onToggle}>
      
      {/* Temperature Control ONLY */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <span className="text-xs font-medium text-slate-500">Nhiệt độ</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecrease}
            disabled={device.value <= MIN_TEMP || readOnly}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-lg font-bold text-slate-800 w-12 text-center">
            {device.value}°C
          </span>
          <button
            onClick={handleIncrease}
            disabled={device.value >= MAX_TEMP || readOnly}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

    </BaseDeviceCard>
  );
} 
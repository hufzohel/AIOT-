import React from "react";
import BaseDeviceCard from "./BaseCard";
import { Minus, Plus, Wind, Moon } from "lucide-react";

export default function ACCard({ device, onToggle, onTempChange, onSwingToggle, onSleepToggle }) {
  const MIN_TEMP = 16;
  const MAX_TEMP = 30;

  const handleDecrease = () => {
    if (device.value > MIN_TEMP) onTempChange(device.id, device.value - 1);
  };

  const handleIncrease = () => {
    if (device.value < MAX_TEMP) onTempChange(device.id, device.value + 1);
  };

  return (
    <BaseDeviceCard device={device} onToggle={onToggle}>
      
      {/* 1. Temperature Control */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-slate-500">Nhiệt độ</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecrease}
            disabled={device.value <= MIN_TEMP}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-lg font-bold text-slate-800 w-12 text-center">
            {device.value}°C
          </span>
          <button
            onClick={handleIncrease}
            disabled={device.value >= MAX_TEMP}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Extra Modes (Swing & Sleep) */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {/* Swing Button */}
        <button
          onClick={() => onSwingToggle(device.id, !device.swing)}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
            device.swing ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-500 border border-slate-200"
          }`}
        >
          <Wind className="w-4 h-4" />
          Swing
        </button>

        {/* Sleep Mode Button */}
        <button
          onClick={() => onSleepToggle(device.id, !device.sleep)}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
            device.sleep ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-500 border border-slate-200"
          }`}
        >
          <Moon className="w-4 h-4" />
          Sleep
        </button>
      </div>

    </BaseDeviceCard>
  );
}
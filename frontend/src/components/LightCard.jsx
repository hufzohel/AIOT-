import React from "react";
import BaseDeviceCard from "./BaseCard";

export default function LightCard({ device, onToggle }) {
  return (
    <BaseDeviceCard device={device} onToggle={onToggle}>
      <p className="text-xs text-orange-600 font-medium text-center">
        Đèn đang sáng
      </p>
    </BaseDeviceCard>
  );
}
import { useState, useEffect } from 'react';
import api from '../lib/api';

export function useDeviceSync(userId) {
  const [devices, setDevices] = useState([]);

  // 1. Poll: Fetch device state every 1 second (Backend → Frontend)
  useEffect(() => {
    if (!userId) return;

    const fetchDevices = async () => {
      try {
        const res = await api.get("/devices", { params: { userId } });
        setDevices(res.data);
      } catch (err) {
        console.error("Failed to sync devices:", err);
      }
    };

    fetchDevices();
    const intervalId = setInterval(fetchDevices, 1000);

    return () => clearInterval(intervalId);
  }, [userId]);

  // 2. Toggle Power (Frontend → Backend)
  const toggleDevice = async (id) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newPower = !device.power;

    // ⚡ Optimistic update
    setDevices(prev => prev.map(d => d.id === id ? { ...d, power: newPower } : d));

    try {
      // Use PATCH to send only the fields that changed
      await api.patch(`/devices/${id}`, { power: newPower, actorId: userId });
    } catch (err) {
      console.error("Failed to toggle device:", err);
      // Auto-reverts on next poll if backend fails
    }
  };

  // 3. Update Value (Speed/Temperature) (Frontend → Backend)
  const updateValue = async (id, newValue) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, value: newValue } : d));

    try {
      // Use PATCH to send only the value that changed
      await api.patch(`/devices/${id}`, { value: newValue, actorId: userId });
    } catch (err) {
      console.error("Failed to update value:", err);
      // Auto-reverts on next poll if backend fails
    }
  };

  return { devices, toggleDevice, updateValue };
}
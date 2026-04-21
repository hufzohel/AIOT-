import { useState, useEffect } from 'react';
import axios from 'axios';

export function useDeviceSync(userId) {
  const [devices, setDevices] = useState([]);

  // 1. The Polling Logic (Stays the same)
  useEffect(() => {
    if (!userId) return;

    const fetchDevices = () => {
      axios
        .get("/api/devices", { params: { userId } })
        .then((res) => setDevices(res.data))
        .catch((err) => console.error("Failed to sync devices:", err));
    };

    fetchDevices();
    const intervalId = setInterval(fetchDevices, 1000);

    return () => clearInterval(intervalId);
  }, [userId]);

  // 2. Toggle Power (OPTIMISTIC UPDATE)
  const toggleDevice = async (id) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newStatus = !device.status;

    // ⚡ INSTANT UI UPDATE: Change the screen before the server even replies
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));

    try {
      await axios.post(`/api/devices/${id}/update`, { status: newStatus });
    } catch (err) {
      console.error("Failed to toggle device:", err);
      // If the server fails, the 1-second poll will automatically revert the button for us!
    }
  };

  // 3. Change Speed or Temperature (OPTIMISTIC UPDATE)
  const updateValue = async (id, newValue) => {
    // ⚡ INSTANT UI UPDATE
    setDevices(prev => prev.map(d => d.id === id ? { ...d, value: newValue } : d));

    try {
      await axios.post(`/api/devices/${id}/update`, { value: newValue });
    } catch (err) {
      console.error("Failed to update value:", err);
    }
  };

  // 4. Change Swing (OPTIMISTIC UPDATE)
  const updateSwing = async (id, newSwing) => {
    // ⚡ INSTANT UI UPDATE
    setDevices(prev => prev.map(d => d.id === id ? { ...d, swing: newSwing } : d));

    try {
      await axios.post(`/api/devices/${id}/update`, { swing: newSwing });
    } catch (err) {
      console.error("Failed to update swing:", err);
    }
  };

  // 5. NEW: Change Sleep Mode (OPTIMISTIC UPDATE)
  const updateSleep = async (id, newSleepState) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, sleep: newSleepState } : d));
    try {
      await axios.post(`/api/devices/${id}/update`, { sleep: newSleepState });
    } catch (err) {
      console.error("Failed to update sleep mode:", err);
    }
  };

  // Update your return statement to include it:
  return { devices, toggleDevice, updateValue, updateSwing, updateSleep };
}
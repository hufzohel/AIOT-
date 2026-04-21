// import { useEffect, useState } from "react";
// import { Search } from "lucide-react";
// import axios from "axios";
// import DeviceCard from "../components/DeviceCard";
// import { useAuth } from "../contexts/AuthContext";
// import { useDeviceSync } from "../hooks/useDeviceSync";

// import FanCard from "../components/FanCard";
// import ACCard from "../components/ACCard";
// import LightCard from "../components/LightCard";

// export default function DevicesPage({ userId: propUserId }) {
//   const { user } = useAuth();
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("all");
  
//   const targetUserId = propUserId || user?.id;
//   const { devices, toggleDevice, updateValue, updateSwing } = useDeviceSync(targetUserId);

//   const filtered = devices.filter((d) => {
//     const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
//     const matchFilter = filter === "all" || d.type === filter;
//     return matchSearch && matchFilter;
//   });

//   return (
//     <div className="space-y-6">
//       {/* ... (Keep all their existing search bar and header HTML exactly as it is) ... */}

//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//         {filtered.map((device) => {
//           // Dynamic Rendering Routing!
//           if (device.type === "fan") {
//             return (
//               <FanCard
//                 key={device.id}
//                 device={device}
//                 onToggle={toggleDevice}
//                 onSpeedChange={updateValue}   // Wires to our new hook
//                 onSwingToggle={updateSwing}   // Wires to our new hook
//               />
//             );
//           }
//           if (device.type === "ac") {
//             return (
//               <ACCard
//                 key={device.id}
//                 device={device}
//                 onToggle={toggleDevice}
//                 onTempChange={updateValue}    // Wires to our new hook
//               />
//             );
//           }
//           // Default fallback
//           return (
//             <LightCard
//               key={device.id}
//               device={device}
//               onToggle={toggleDevice}
//             />
//           );
//         })}
//       </div>

//       {filtered.length === 0 && (
//         <div className="text-center py-12 text-slate-400">
//           Không tìm thấy thiết bị phù hợp
//         </div>
//       )}
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useDeviceSync } from "../hooks/useDeviceSync";

// Import our new polymorphic cards!
import FanCard from "../components/FanCard";
import ACCard from "../components/ACCard";
import LightCard from "../components/LightCard";

export default function DevicesPage({ userId: propUserId }) {
  const { user } = useAuth();
  
  // State for the Search and Filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  
  const targetUserId = propUserId || user?.id;
  const { devices, toggleDevice, updateValue, updateSwing, updateSleep } = useDeviceSync(targetUserId);

  // The logic that actually filters the devices based on the inputs
  const filtered = devices.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. THE SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thiết bị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-sm"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm text-slate-700"
          >
            <option value="all">Tất cả thiết bị</option>
            <option value="fan">Quạt</option>
            <option value="ac">Điều hòa</option>
            <option value="light">Đèn</option>
          </select>
        </div>
      </div>

      {/* 2. THE DYNAMIC DEVICE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((device) => {
          if (device.type === "fan") {
            return (
              <FanCard
                key={device.id}
                device={device}
                onToggle={toggleDevice}
                onSpeedChange={updateValue}   
                onSwingToggle={updateSwing}   
              />
            );
          }
          if (device.type === "ac") {
            return (
              <ACCard
                key={device.id}
                device={device}
                onToggle={toggleDevice}
                onTempChange={updateValue}    
                onSwingToggle={updateSwing}  // Reusing the swing logic!
                onSleepToggle={updateSleep}  // Using our new sleep logic!
              />
            );
          }
          return (
            <LightCard
              key={device.id}
              device={device}
              onToggle={toggleDevice}
            />
          );
        })}
      </div>

      {/* 3. EMPTY STATE (When search finds nothing) */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-400 text-sm">Không tìm thấy thiết bị phù hợp</p>
        </div>
      )}
      
    </div>
  );
}
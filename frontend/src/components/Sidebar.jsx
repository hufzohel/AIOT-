import { NavLink, useNavigate } from "react-router-dom";
import { Cpu, Home, LayoutDashboard, LogOut, ScrollText, UserCircle2, Users, Video } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-white/15 text-white"
        : "text-blue-100 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary-700 flex flex-col z-50">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
          <Home className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">AIoT Home</h1>
          <p className="text-blue-200 text-xs">Unified FastAPI</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {isAdmin ? (
          <>
            <NavLink to="/users" className={linkClass}>
              <Users className="w-5 h-5" />
              Người dùng
            </NavLink>
            <NavLink to="/devices" className={linkClass}>
              <Cpu className="w-5 h-5" />
              Thiết bị
            </NavLink>
            <NavLink to="/monitor" className={linkClass}>
              <Video className="w-5 h-5" />
              Camera
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <UserCircle2 className="w-5 h-5" />
              Hồ sơ
            </NavLink>
            <NavLink to="/logs" className={linkClass}>
              <ScrollText className="w-5 h-5" />
              Nhật ký hệ thống
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/dashboard" className={linkClass}>
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </NavLink>
            <NavLink to="/devices" className={linkClass}>
              <Cpu className="w-5 h-5" />
              Thiết bị
            </NavLink>
            {/* temporary maybe remove later */}
            <NavLink to="/monitor" className={linkClass}>
              <Video className="w-5 h-5" />
              Camera
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <UserCircle2 className="w-5 h-5" />
              Hồ sơ
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-4 pb-6 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-4 mb-4">
          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-blue-200 text-xs">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

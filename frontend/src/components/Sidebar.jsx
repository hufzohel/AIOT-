import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Cpu,
  Users,
  ScrollText,
  LogOut,
  Home,
} from "lucide-react";
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
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
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
          <h1 className="text-white font-bold text-lg leading-tight">
            AIoT Home
          </h1>
          <p className="text-blue-200 text-xs">Smart Living</p>
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
          </>
        )}
      </nav>

      <div className="px-4 pb-6 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-blue-200 truncate">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
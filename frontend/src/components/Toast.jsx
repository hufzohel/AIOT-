import { useEffect } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

const styles = {
  success: {
    wrap: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  error: {
    wrap: "bg-red-50 border-red-200 text-red-700",
    icon: "text-red-600",
    Icon: XCircle,
  },
  info: {
    wrap: "bg-blue-50 border-blue-200 text-blue-700",
    icon: "text-blue-600",
    Icon: Info,
  },
};

export default function Toast({ open, type = "info", message, onClose, duration = 2800 }) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [open, onClose, duration]);

  const config = styles[type] || styles.info;
  const Icon = config.Icon;

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
        open
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 -translate-y-6 scale-95 pointer-events-none"
      }`}
    >
      <div className={`min-w-[320px] max-w-[90vw] shadow-lg border rounded-2xl px-4 py-3 backdrop-blur-sm ${config.wrap}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.icon}`} />
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}

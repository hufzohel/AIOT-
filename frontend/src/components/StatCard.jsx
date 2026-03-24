export default function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">
          {value}
          <span className="text-sm font-normal text-slate-400 ml-1">
            {unit}
          </span>
        </p>
      </div>
    </div>
  );
}

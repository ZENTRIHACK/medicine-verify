
export default function StatCard({ title, value, note, icon: Icon, color }) {
  const colors = {
    purple: "bg-purple-100 text-[#4926C8]",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <article className="flex min-w-0 gap-3 rounded-2xl border border-[#E9E5F1] bg-white p-4 sm:p-5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          colors[color] || colors.purple
        }`}
      >
        <Icon size={21} />
      </div>

      <div className="min-w-0">
        <p className="text-xs leading-5 text-gray-500">{title}</p>

        <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-[#242039]">
          {value}
        </h3>

        <p className="mt-2 text-[10px] text-gray-400">{note}</p>
      </div>
    </article>
  );
}

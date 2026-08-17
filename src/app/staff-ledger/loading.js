export default function Loading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-1 pb-4 md:p-8 flex flex-col gap-6 text-slate-900 animate-pulse">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
          <div className="h-6 md:h-8 w-48 bg-slate-200 rounded-md"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 md:p-4 h-24"></div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 h-28"></div>
        ))}
      </div>
    </div>
  );
}

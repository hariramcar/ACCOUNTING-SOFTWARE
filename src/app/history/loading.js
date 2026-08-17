export default function Loading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-1 md:p-8 flex flex-col gap-4 md:gap-8 pb-24 md:pb-8 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-5 mb-1 md:mb-6 pt-1 md:pt-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-lg"></div>
          <div className="h-6 md:h-8 w-48 bg-slate-200 rounded-md"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        {[1, 2].map((i) => (
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

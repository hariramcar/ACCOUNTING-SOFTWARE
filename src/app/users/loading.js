export default function Loading() {
  return (
    <div className="px-4 pt-1 pb-4 sm:p-6 md:p-8 max-w-6xl mx-auto text-slate-900 animate-pulse">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5 mb-6 sm:mb-8">
        <div className="h-6 md:h-8 w-48 bg-slate-200 rounded-md"></div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-6 sm:mb-8 shadow-sm h-48"></div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 h-20"></div>
        ))}
      </div>
    </div>
  );
}

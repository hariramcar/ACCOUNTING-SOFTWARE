'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function GlobalMonthSelector({ isExpanded, currentDate, onChangeMonth }) {
  const router = useRouter();

  // If no date is provided yet (e.g., during some hydration phase), fallback to current date
  const dateToUse = currentDate || new Date();

  const handlePrevMonth = () => {
    const newDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth() - 1, 1);
    onChangeMonth(newDate);
    router.refresh(); // Refresh Server Components
  };

  const handleNextMonth = () => {
    const newDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth() + 1, 1);
    onChangeMonth(newDate);
    router.refresh();
  };

  const monthName = dateToUse.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  if (!isExpanded) {
    return (
      <div className="flex flex-col items-center justify-center p-2 mt-4 border-t border-slate-800 cursor-default" title={monthName}>
        <Calendar size={18} className="text-slate-500 mb-1" />
        <span suppressHydrationWarning className="text-[9px] font-bold text-slate-400 uppercase">{dateToUse.toLocaleString('en-US', { month: 'short' })}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 px-3">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Global Month</div>
      <div className="flex items-center justify-between bg-slate-900 rounded-lg p-1 border border-slate-800">
        <button onClick={handlePrevMonth} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span suppressHydrationWarning className="text-xs font-bold text-slate-300 uppercase tracking-wider">{monthName}</span>
        <button onClick={handleNextMonth} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

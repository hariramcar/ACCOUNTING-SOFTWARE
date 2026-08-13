'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function GlobalMonthSelector({ isExpanded }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(^| )global_month=([^;]+)/);
      if (match) {
        const [yearStr, monthStr] = match[2].split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        if (!isNaN(year) && !isNaN(month)) {
          return new Date(year, month, 1);
        }
      }
    }
    return new Date();
  });

  useEffect(() => {
    // Set cookie on load if not present, or just ensure it's synced
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth()).padStart(2, '0');
    document.cookie = `global_month=${year}-${month}; path=/; max-age=31536000`; // 1 year
  }, [currentDate]);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth()).padStart(2, '0');
    document.cookie = `global_month=${year}-${month}; path=/; max-age=31536000`;
    router.refresh(); // Refresh Server Components
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth()).padStart(2, '0');
    document.cookie = `global_month=${year}-${month}; path=/; max-age=31536000`;
    router.refresh();
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  if (!isExpanded) {
    return (
      <div className="flex flex-col items-center justify-center p-2 mt-4 border-t border-slate-800 cursor-default" title={monthName}>
        <Calendar size={18} className="text-slate-500 mb-1" />
        <span suppressHydrationWarning className="text-[9px] font-bold text-slate-400 uppercase">{currentDate.toLocaleString('en-US', { month: 'short' })}</span>
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

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import ExportDataModal from './ExportDataModal';

export default function DownloadDataButton({ isExpanded = true, isMobile = false, variant = 'sidebar' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {isMobile ? (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold transition-all active:scale-95 border border-indigo-500/20"
        >
          <div className="p-2.5 bg-transparent rounded-xl text-indigo-400">
            <Download size={20} />
          </div>
          Export Data
        </button>
      ) : variant === 'light' ? (
        <button 
          onClick={() => setIsModalOpen(true)}
          title="Export Data" 
          className="h-[42px] px-4 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg font-semibold transition-all text-sm shadow-sm whitespace-nowrap"
        >
          <Download size={18} className="flex-shrink-0" />
          <span className="font-bold tracking-wide">
            Export Data
          </span>
        </button>
      ) : (
        <button 
          onClick={() => setIsModalOpen(true)}
          title="Export Data" 
          className={`w-full flex items-center justify-center gap-2 text-slate-400 bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl font-medium hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 transition-all text-sm shadow-sm ${isExpanded ? 'mb-2' : 'aspect-square mb-2'}`}
        >
          <Download size={18} className="flex-shrink-0" />
          <span className={`${!isExpanded ? 'hidden' : ''} font-bold tracking-wide`}>
            Export Data
          </span>
        </button>
      )}

      <ExportDataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

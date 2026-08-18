'use client';

import { useState, useEffect, useRef } from 'react';
import { saveDiaryNote } from '@/actions/diary';
import { PenLine, Save, Loader2, Check } from 'lucide-react';

export default function DiaryPad({ initialNote = '' }) {
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved
  const saveTimeoutRef = useRef(null);

  // Auto-save when user stops typing
  useEffect(() => {
    if (note === initialNote && saveStatus === 'idle') return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(note);
    }, 1500); // Save 1.5s after user stops typing

    return () => clearTimeout(saveTimeoutRef.current);
  }, [note]);

  const handleSave = async (contentToSave) => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    const result = await saveDiaryNote(contentToSave);
    
    setIsSaving(false);
    if (result.success) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mb-4 md:mb-6">
      <div className="bg-amber-100/50 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-800">
          <PenLine size={18} />
          <h3 className="font-bold text-sm md:text-base">Daily Rough Diary</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600"><Check size={14} /> Saved</span>
          )}
          {saveStatus === 'idle' && (
            <span className="opacity-70 text-[10px] md:text-xs">Auto-saves as you type</span>
          )}
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaveStatus('typing');
        }}
        placeholder="Jot down rough expenses here during the day (e.g. 'Tea 50', 'Petrol 200'). You can clear this once you officially add the payments below!"
        className="w-full bg-transparent p-4 min-h-[120px] md:min-h-[150px] text-sm md:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none resize-y"
        style={{ scrollbarWidth: 'thin' }}
      />
    </div>
  );
}

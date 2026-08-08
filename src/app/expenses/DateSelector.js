'use client';

import { useRouter } from 'next/navigation';

export default function DateSelector({ defaultDate }) {
  const router = useRouter();
  
  const handleChange = (e) => {
    const val = e.target.value;
    if (val) {
      router.push(`/expenses?date=${val}`);
    } else {
      router.push(`/expenses`);
    }
  };

  return (
    <input 
      type="date" 
      defaultValue={defaultDate}
      onChange={handleChange}
      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
    />
  );
}

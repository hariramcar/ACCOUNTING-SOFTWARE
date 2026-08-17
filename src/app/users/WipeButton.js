'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WipeButton() {
  const [isWiping, setIsWiping] = useState(false);
  const router = useRouter();

  const handleWipe = async () => {
    const confirmWipe = window.confirm(
      "WARNING: This will permanently delete ALL data (Expenses, Vehicles, Accounts, Transactions, Users) except the main admin@hariramcars.com account.\n\nAre you absolutely sure you want to do this?"
    );

    if (!confirmWipe) return;

    setIsWiping(true);
    try {
      const res = await fetch('/api/wipe', { method: 'GET' });
      const data = await res.json();
      
      if (data.success) {
        alert("Database successfully wiped. Fresh start ready.");
        router.push('/login'); // Force re-login or refresh to clear any cached states
      } else {
        alert("Error wiping database: " + data.error);
      }
    } catch (error) {
      alert("Failed to wipe database.");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <button
      onClick={handleWipe}
      disabled={isWiping}
      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors text-sm disabled:opacity-50"
    >
      <Trash2 size={16} />
      {isWiping ? 'Wiping Database...' : 'WIPE DATABASE (FRESH START)'}
    </button>
  );
}

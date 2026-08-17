'use client';

import { useState } from 'react';
import { BadgeCent } from 'lucide-react';
import ReceiveTokenModal from './ReceiveTokenModal';

export default function TopTokenButton({ inStock, accounts }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 w-full px-2 py-2.5 md:px-4 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-all border border-blue-200 shadow-sm whitespace-nowrap text-xs md:text-sm"
      >
        <BadgeCent size={18} className="mb-0.5 md:mb-0 md:w-[18px] md:h-[18px]" />
        <span>Token</span>
      </button>

      <ReceiveTokenModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        inStock={inStock} 
        accounts={accounts} 
        vehicle={null}
      />
    </>
  );
}

import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Offline | Hariram Accounting",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-50 text-slate-900 p-6 text-center">
      <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <WifiOff size={40} className="text-indigo-600" />
      </div>
      
      <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
        You are offline
      </h1>
      
      <p className="text-sm font-medium text-slate-500 max-w-sm mb-8 leading-relaxed">
        It looks like you've lost your internet connection. Some features of Hariram Accounting require a network connection to sync data.
      </p>
      
      <Link 
        href="/"
        className="bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all w-full max-w-[280px]"
      >
        Try Again
      </Link>
    </div>
  );
}

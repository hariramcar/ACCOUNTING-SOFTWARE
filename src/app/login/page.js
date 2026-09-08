import { Car } from 'lucide-react';
import LoginForm from './LoginForm';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'Sign In | Hariram Motors Accounting',
  description: 'Secure enterprise accounting and dealership inventory ledger for Hariram Motors',
};

export default async function LoginPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070A11] p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Glow Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Subtle Grid Accent */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} 
      />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-[440px] relative z-10 bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* Dealership Branding Header */}
        <div className="text-center mb-7 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center mb-4 shadow-xl shadow-indigo-600/30 border border-indigo-400/30">
            <Car size={28} className="text-white drop-shadow-md" />
          </div>
          
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-white text-2xl font-black tracking-tight uppercase">
              Hariram<span className="text-indigo-400 ml-1">Motors</span>
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Dealership Ledger ERP
            </span>
          </div>

          <p className="text-slate-400 text-xs font-medium max-w-xs mt-0.5">
            Authorized personnel only. Access is monitored and encrypted.
          </p>
        </div>

        {/* Form Container */}
        <LoginForm activeSession={session} />
      </div>
    </div>
  );
}

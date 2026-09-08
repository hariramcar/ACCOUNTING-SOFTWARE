'use client';

import { useState, useActionState, useEffect } from 'react';
import { login, switchAccount } from '@/actions/auth';
import Link from 'next/link';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  Loader2, 
  Car, 
  Sparkles,
  LogOut,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function LoginForm({ activeSession }) {
  const [state, formAction, isPending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Caps lock detection on keystrokes
  const handleKeyEvent = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const dashboardPath = activeSession?.role === 'ADMIN' ? '/profit' : '/expenses';

  return (
    <div className="w-full">
      {/* 1. If an active session is already present on this device */}
      {activeSession && !isSwitching && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-600/30 border border-indigo-400/40">
              {activeSession.name ? activeSession.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm truncate">{activeSession.name}</span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeSession.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Session active on this device
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Link
              href={dashboardPath}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
            >
              <span>Continue to Ledger</span>
              <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => setIsSwitching(true)}
              className="py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Switch User</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Login Form */}
      {(!activeSession || isSwitching) && (
        <form action={formAction} className="flex flex-col gap-4">
          {/* Active Switcher Notification */}
          {activeSession && isSwitching && (
            <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <span>Signing in as another user</span>
              <button 
                type="button" 
                onClick={() => setIsSwitching(false)} 
                className="underline hover:text-amber-200 cursor-pointer font-bold ml-2"
              >
                Back to {activeSession.name}
              </button>
            </div>
          )}

          {/* Error Alert */}
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-200 text-xs font-semibold p-3.5 rounded-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 shadow-lg shadow-red-950/20">
              <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{state.error}</div>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User size={18} />
              </div>
              <input 
                type="text" 
                name="username" 
                required 
                disabled={isPending}
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:bg-slate-950 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Password Input with Show/Hide & Caps Lock indicator */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider">
                Password
              </label>
              {capsLockActive && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 animate-pulse">
                  <AlertTriangle size={12} />
                  Caps Lock Active
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                required 
                disabled={isPending}
                onKeyDown={handleKeyEvent}
                onKeyUp={handleKeyEvent}
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:bg-slate-950 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-start gap-2.5 pt-1">
            <input 
              type="checkbox" 
              id="rememberMe" 
              name="rememberMe" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-0 transition-colors cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-slate-400 select-none cursor-pointer leading-tight">
              <span className="text-slate-200 font-semibold block">Remember this device for 7 days</span>
              <span className="text-[11px] text-slate-500">Untick if using a shared or staff phone (auto-logs out in 12h)</span>
            </label>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 mt-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 disabled:from-indigo-900 disabled:to-indigo-900 text-white font-bold text-sm transition-all duration-200 focus:ring-4 focus:ring-indigo-500/30 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>Verifying Ledger Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Ledger</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Security Footer Reassurance */}
      <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-col gap-2 text-center">
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            256-Bit Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={13} className="text-indigo-400" />
            Brute-Force Protected
          </span>
          <span>•</span>
          <span>Role Guarded</span>
        </div>
        <p className="text-[10px] text-slate-600">
          Hariram Motors Accounting & Dealership ERP • Production Build
        </p>
      </div>
    </div>
  );
}

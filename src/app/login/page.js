import { login } from '@/actions/auth';
import { LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-indigo-100">
            <LockKeyhole size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-slate-900 text-2xl font-bold mb-1">Welcome Back</h1>
          <p className="text-slate-500 text-sm font-medium">Please enter your credentials to access the ledger.</p>
        </div>

        <form action={login} className="flex flex-col gap-5">
          <div>
            <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
            <input 
              type="text" 
              name="username" 
              required 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-2.5 mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all focus:ring-4 focus:ring-indigo-500/20 shadow-sm"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

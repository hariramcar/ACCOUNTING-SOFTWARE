import { setupFirstAdmin } from '@/actions/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default async function SetupPage() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (existingAdmin) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
            <ShieldAlert size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-slate-900 text-2xl font-bold mb-1">Initialize System</h1>
          <p className="text-slate-500 text-sm font-medium">Create the master administrator account.</p>
        </div>

        <form action={setupFirstAdmin} className="flex flex-col gap-5">
          <div>
            <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" 
              name="name" 
              required 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Admin Username</label>
            <input 
              type="text" 
              name="username" 
              required 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Secure Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-2.5 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all focus:ring-4 focus:ring-emerald-500/20 shadow-sm"
          >
            Create Master Admin
          </button>
        </form>
      </div>
    </div>
  );
}

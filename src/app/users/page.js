import prisma from '@/lib/prisma';
import { createUser, deleteUser } from '@/actions/users';
import { UserPlus, ShieldAlert, Trash2 } from 'lucide-react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/expenses');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto text-slate-900">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5 mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-1 tracking-tight text-slate-900">Users & Staff</h1>
          <p className="text-slate-500 m-0 font-medium">Manage access and roles for the Master Ledger.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <UserPlus size={20} className="text-indigo-600" />
          <h2 className="text-lg m-0 font-semibold text-slate-900">Add New User</h2>
        </div>
        <form action={createUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Full Name</label>
            <input 
              type="text" 
              name="name" 
              required
              placeholder="e.g. Rahul Mechanic"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm" 
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Username</label>
            <input 
              type="text" 
              name="username" 
              required
              placeholder="rahul123"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm" 
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Password</label>
            <input 
              type="text" 
              name="password" 
              required
              placeholder="Secure password"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm" 
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Role</label>
            <select 
              name="role" 
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm"
            >
              <option value="STAFF">STAFF (Restricted)</option>
              <option value="ADMIN">ADMIN (Full Access)</option>
            </select>
          </div>
          <button 
            type="submit" 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg font-semibold cursor-pointer transition-all shadow-sm lg:col-span-1 text-sm flex items-center justify-center gap-2"
          >
            Create User
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-semibold text-slate-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {user.role === 'ADMIN' && <ShieldAlert size={12} />}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <form action={deleteUser}>
                    <input type="hidden" name="id" value={user.id} />
                    <button type="submit" className="inline-flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors" title="Delete User">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium">
                  No users found. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

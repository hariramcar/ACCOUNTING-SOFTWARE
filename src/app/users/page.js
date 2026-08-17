import prisma from '@/lib/prisma';
import { createUser, deleteUser } from '@/actions/users';
import { UserPlus, ShieldAlert, Trash2 } from 'lucide-react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import EditUserModal from './EditUserModal';
import SubmitButton from '@/components/SubmitButton';
import WipeButton from './WipeButton';

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/expenses');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="px-4 pt-1 pb-4 sm:p-6 md:p-8 max-w-6xl mx-auto text-slate-900">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold mb-1 tracking-tight text-slate-900">Users & Staff</h1>
          <p className="text-slate-500 m-0 font-medium text-sm sm:text-base">Manage access and roles for the Master Ledger.</p>
        </div>
        <div>
          <WipeButton />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-5 sm:mb-6 border-b border-slate-100 pb-4">
          <UserPlus size={20} className="text-indigo-600" />
          <h2 className="text-lg m-0 font-semibold text-slate-900">Add New User</h2>
        </div>
        <form action={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:items-end">
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Full Name</label>
            <input 
              type="text" 
              name="name" 
              required
              placeholder="e.g. Rahul Mechanic"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm" 
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Username</label>
            <input 
              type="text" 
              name="username" 
              required
              placeholder="rahul123"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm" 
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Password</label>
            <input 
              type="text" 
              name="password" 
              required
              placeholder="Secure password"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm" 
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Role</label>
            <select 
              name="role" 
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm"
            >
              <option value="STAFF">STAFF (Restricted)</option>
              <option value="ADMIN">ADMIN (Full Access)</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1 mt-2 lg:mt-0">
            <SubmitButton 
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg font-semibold cursor-pointer transition-all shadow-sm text-sm flex items-center justify-center gap-2"
              pendingText="Creating..."
            >
              Create User
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
                  <div className="flex items-center justify-end gap-2">
                    <EditUserModal user={user} />
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={user.id} />
                      <SubmitButton 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 md:p-2.5 rounded-md md:rounded-lg transition-colors border border-transparent md:border-red-100 bg-white" 
                        title="Delete User"
                        pendingText={<Trash2 size={16} className="opacity-50" />}
                      >
                        <Trash2 size={16} />
                      </SubmitButton>
                    </form>
                  </div>
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

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden flex flex-col gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col relative group hover:border-indigo-200 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-slate-900 text-base mb-1">{user.name}</div>
                <div className="text-slate-500 font-medium text-sm flex items-center gap-1">
                  <span>@{user.username}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <EditUserModal user={user} />
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={user.id} />
                  <SubmitButton 
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold cursor-pointer transition-colors text-xs flex items-center justify-center gap-1.5"
                    pendingText="Deleting..."
                  >
                    <Trash2 size={14} /> Delete
                  </SubmitButton>
                </form>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {user.role === 'ADMIN' && <ShieldAlert size={12} />}
                {user.role}
              </span>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium shadow-sm">
            No users found. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}

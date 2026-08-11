'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, X, ShieldAlert } from 'lucide-react';
import { updateUser } from '@/actions/users';

export default function EditUserModal({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    try {
      await updateUser(formData);
      setIsOpen(false);
    } catch (error) {
      alert(`Error updating user: ${error.message}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 md:p-2.5 rounded-md md:rounded-lg transition-colors border border-transparent md:border-slate-100" 
        title="Edit User"
      >
        <Edit2 size={16} />
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 transition-all">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          
          <div className="bg-slate-50 rounded-t-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full md:w-full md:max-w-md h-[90vh] md:h-auto overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500 ease-out border-t md:border border-slate-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Edit2 size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900 m-0 tracking-tight">Edit Profile</h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-none cursor-pointer p-2 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 bg-slate-50 flex flex-col gap-5" style={{ scrollbarWidth: 'thin' }}>
              <input type="hidden" name="id" value={user.id} />
              
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={user.name}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Username</label>
                <input 
                  type="text" 
                  name="username" 
                  defaultValue={user.username}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Role</label>
                <select 
                  name="role" 
                  defaultValue={user.role}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm"
                >
                  <option value="STAFF">STAFF (Restricted)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>

              <div className="mt-2 pt-5 border-t border-slate-200">
                <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-slate-500">Change Password (Optional)</label>
                <p className="text-xs text-slate-400 mb-3">Leave blank to keep the current password.</p>
                <input 
                  type="text" 
                  name="password" 
                  placeholder="Enter new password"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm" 
                />
              </div>

              <div className="mt-4 pb-6 md:pb-0">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-xl font-bold cursor-pointer transition-all shadow-md text-sm flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

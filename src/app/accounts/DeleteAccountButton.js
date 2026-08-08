'use client';

import { Trash2 } from 'lucide-react';
import { deleteAccount } from '@/actions/accounts';

export default function DeleteAccountButton({ accountId, accountName }) {
  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the account "${accountName}"?`)) {
      return;
    }
    
    const formData = new FormData();
    formData.append('id', accountId);
    
    const result = await deleteAccount(formData);
    if (result && !result.success) {
      alert(result.error || 'Failed to delete account.');
    }
  };

  return (
    <button 
      onClick={handleDelete}
      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
      title={`Delete ${accountName}`}
    >
      <Trash2 size={14} />
    </button>
  );
}

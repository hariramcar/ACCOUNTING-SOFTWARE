'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Car, X, Plus, Search, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { addBrandModels, updateBrandModels, deleteBrand } from '@/actions/vehicleModels';
import toast from 'react-hot-toast';
import SubmitButton from '@/components/SubmitButton';

export default function VehicleModelsModal({ vehicleModels }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add/Edit Brand Modal state
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null); // null if adding new
  const [brandMake, setBrandMake] = useState('');
  const [brandModels, setBrandModels] = useState('');

  // Group models by make
  const grouped = useMemo(() => {
    const acc = {};
    vehicleModels.forEach(curr => {
      if (!acc[curr.make]) acc[curr.make] = [];
      acc[curr.make].push(curr.model);
    });
    return acc;
  }, [vehicleModels]);

  const filteredMakes = Object.keys(grouped).filter(make => 
    make.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.localeCompare(b));

  const openAddModal = () => {
    setEditingBrand(null);
    setBrandMake('');
    setBrandModels('');
    setIsBrandModalOpen(true);
  };

  const openEditModal = (make) => {
    setEditingBrand(make);
    setBrandMake(make);
    setBrandModels(grouped[make].join(', '));
    setIsBrandModalOpen(true);
  };

  const handleBrandSubmit = async (formData) => {
    if (editingBrand) {
      formData.append('oldMake', editingBrand);
      const res = await updateBrandModels(formData);
      if (res.success) {
        toast.success('Brand updated successfully!');
        setIsBrandModalOpen(false);
      } else {
        toast.error(res.error);
      }
    } else {
      const res = await addBrandModels(formData);
      if (res.success) {
        toast.success('Brand added successfully!');
        setIsBrandModalOpen(false);
      } else {
        toast.error(res.error);
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => {
          setMounted(true);
          setIsOpen(true);
        }}
        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg transition-colors flex items-center gap-2 border border-indigo-200 shadow-sm"
      >
        <Car size={18} /> Manage Car Brands & Models
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 text-slate-900 overflow-hidden animate-in fade-in duration-200">
          
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative">
              <div>
                <h1 className="text-2xl md:text-3xl font-black mb-1 text-slate-900">Car Brands & Models</h1>
                <p className="text-slate-500 text-sm m-0 font-medium">Manage the list of available brands and their models for the inventory.</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={openAddModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors border-0 cursor-pointer shadow-sm"
                >
                  <Plus size={18} /> Add Brand
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors border-0 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
              
              {/* Search Bar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative max-w-sm">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search brands..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Brand Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Models</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[15%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMakes.map((make) => (
                      <tr key={make} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5 font-bold text-[15px] text-slate-800">{make}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            {grouped[make].map((model, idx) => (
                              <span 
                                key={idx} 
                                className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-xs font-bold text-slate-700 shadow-sm"
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditModal(make)}
                              className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors border border-indigo-100 cursor-pointer"
                              title="Edit Brand"
                            >
                              <Edit size={14} />
                            </button>
                            <form action={deleteBrand} className="m-0">
                              <input type="hidden" name="make" value={make} />
                              <SubmitButton 
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100 cursor-pointer"
                                title="Delete Brand"
                                pendingText={<Trash2 size={14} className="opacity-50" />}
                              >
                                <Trash2 size={14} />
                              </SubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMakes.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                          No brands found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
          
          {/* Add/Edit Modal */}
          {isBrandModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 m-0">{editingBrand ? 'Edit Brand' : 'Add Brand'}</h2>
                  <button 
                    onClick={() => setIsBrandModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-lg transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <form action={handleBrandSubmit} className="p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Brand Name</label>
                    <input 
                      type="text" 
                      name="make" 
                      required 
                      value={brandMake}
                      onChange={(e) => setBrandMake(e.target.value)}
                      placeholder="e.g. Hyundai" 
                      className="w-full bg-slate-100 border border-transparent rounded-xl p-3.5 text-[15px] font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 shadow-inner transition-all"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Models (Comma-separated)</label>
                    <textarea 
                      name="models" 
                      required 
                      value={brandModels}
                      onChange={(e) => setBrandModels(e.target.value)}
                      placeholder="e.g. Creta, i20, Venue" 
                      rows="3"
                      className="w-full bg-slate-100 border border-transparent rounded-xl p-3.5 text-[15px] font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 shadow-inner transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setIsBrandModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <SubmitButton 
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-0 cursor-pointer shadow-md focus:ring-4 focus:ring-indigo-500/20"
                      pendingText="Saving..."
                    >
                      <CheckCircle2 size={18} /> Save
                    </SubmitButton>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>,
        document.body
      )}
    </>
  );
}

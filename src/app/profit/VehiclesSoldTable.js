'use client';

import { useState } from 'react';
import { Car } from 'lucide-react';
import VehicleDetailsModal from '@/app/inventory/VehicleDetailsModal';

export default function VehiclesSoldTable({ vehicles, accounts }) {
  const [selectedCar, setSelectedCar] = useState(null);

  return (
    <>
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Car size={18} /></div>
            <h2 className="m-0 text-slate-900 text-lg font-black tracking-tight">Vehicles Sold</h2>
          </div>
          <div className="text-xs font-bold bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 shadow-sm">{vehicles.length} cars</div>
        </div>
        
        {vehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm flex flex-col items-center gap-2">
            <Car size={32} className="text-slate-300" />
            No cars sold this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Vehicle Details</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vehicles.map(v => (
                  <tr 
                    key={v.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => setSelectedCar(v)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-[15px] group-hover:text-indigo-600 transition-colors">{v.make} {v.model}</div>
                      <div className="text-xs text-slate-500 font-medium mt-1 inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        {v.registration || 'Unregistered'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-emerald-600 text-lg">₹{v.profit.toLocaleString('en-IN')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VehicleDetailsModal 
        car={selectedCar}
        isOpen={!!selectedCar}
        onClose={() => setSelectedCar(null)}
        accounts={accounts}
      />
    </>
  );
}

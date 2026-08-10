'use client';

import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import VehicleDetailsModal from './VehicleDetailsModal';

export default function InventoryClientList({ inStock, accounts = [] }) {
  const [selectedCar, setSelectedCar] = useState(null);

  if (!inStock || inStock.length === 0) {
    return <p className="text-slate-500 text-center py-8 text-sm font-medium">No cars currently in stock.</p>;
  }

  return (
    <div className="w-full pb-2">
      {/* Mobile Card Layout */}
      <div className="flex flex-col gap-4 md:hidden">
        {inStock.map(car => (
          <div 
            key={car.id} 
            onClick={() => setSelectedCar(car)}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 cursor-pointer interactive-card"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="m-0 text-slate-900 font-extrabold text-lg tracking-tight flex items-center gap-2 flex-wrap">
                  {car.make} {car.model}
                  {car.isLegacy && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-amber-200">OLD</span>}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Purchased: {car.purchaseDate ? new Date(car.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 rounded-sm">
                  {car.registration || 'UNREG'}
                </span>
                {car.partnerships && car.partnerships.length > 0 && <span className="text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Partnered</span>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 pt-3 border-t border-slate-100 mt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Purch. Price</span>
                <span className="font-medium text-slate-600">₹{car.purchasePrice.toLocaleString('en-IN')}</span>
              </div>
              
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600/70 block mb-1">Pending</span>
                <span className="font-bold text-amber-600">
                  {car.purchasePendingBalance > 0 ? `₹${car.purchasePendingBalance.toLocaleString('en-IN')}` : '-'}
                </span>
              </div>
              
              <div>
                <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">Repairs</span>
                <span className="font-medium text-red-500">
                  + ₹{car.totalExpenses.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="bg-slate-50 -mx-2 px-2 py-1 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Total Cost</span>
                <span className="font-black text-slate-900">
                  ₹{car.totalCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block w-full overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Vehicle</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Purchase Price</th>
              <th className="py-4 px-6 text-xs font-bold text-amber-700 uppercase tracking-wider text-right">Pending</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Repairs</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inStock.map(car => (
              <tr 
                key={car.id} 
                onClick={() => setSelectedCar(car)}
                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="m-0 text-slate-900 font-extrabold text-base tracking-tight">
                      {car.make} {car.model}
                    </h3>
                    {car.isLegacy && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-amber-200">OLD</span>}
                    {car.partnerships && car.partnerships.length > 0 && <span className="text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Partnered</span>}
                  </div>
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-widest inline-block shadow-sm">
                    {car.registration || 'UNREGISTERED'}
                  </span>
                </td>
                <td className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {car.purchaseDate ? new Date(car.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td className="py-4 px-6 text-right font-medium text-slate-600 whitespace-nowrap">
                  ₹{car.purchasePrice.toLocaleString('en-IN')}
                </td>
                <td className="py-4 px-6 text-right font-bold text-amber-600 whitespace-nowrap">
                  {car.purchasePendingBalance > 0 ? `₹${car.purchasePendingBalance.toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="py-4 px-6 text-right font-medium text-red-500 whitespace-nowrap">
                  + ₹{car.totalExpenses.toLocaleString('en-IN')}
                </td>
                <td className="py-4 px-6 text-right font-black text-slate-900 text-base whitespace-nowrap">
                  ₹{car.totalCost.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <VehicleDetailsModal 
        car={selectedCar} 
        isOpen={!!selectedCar} 
        onClose={() => setSelectedCar(null)}
        accounts={accounts}
      />
    </div>
  );
}

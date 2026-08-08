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
    <div className="overflow-x-auto w-full pb-2">
      <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 bg-white shadow-sm min-w-[700px]">
      <div className="bg-slate-50 flex items-center px-6 py-3 font-bold text-xs text-slate-500 uppercase tracking-wider">
        <div className="flex-[2] min-w-[200px]">Vehicle</div>
        <div className="w-28 text-left">Date</div>
        <div className="flex-1 text-right">Purchase Price</div>
        <div className="flex-1 text-right text-amber-700">Pending (Not Paid)</div>
        <div className="flex-1 text-right">Repairs</div>
        <div className="flex-1 text-right">Total Cost</div>
      </div>

      {inStock.map(car => (
        <div 
          key={car.id} 
          onClick={() => setSelectedCar(car)}
          className="flex items-center px-6 py-4 transition-colors hover:bg-slate-50/50 cursor-pointer"
        >
          <div className="flex-[2] min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="m-0 text-slate-900 font-extrabold text-base tracking-tight">
                {car.make} {car.model}
              </h3>
              {car.isLegacy && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-amber-200">📦 OLD STOCK</span>}
              {car.partnerships && car.partnerships.length > 0 && <span className="text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Partnered</span>}
            </div>
            <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-widest inline-block shadow-sm mt-1">
              {car.registration || 'UNREGISTERED'}
            </span>
          </div>
          
          <div className="w-28 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            {car.purchaseDate ? new Date(car.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </div>

          <div className="flex-1 text-right font-medium text-slate-600">
            ₹{car.purchasePrice.toLocaleString('en-IN')}
          </div>
          <div className="flex-1 text-right font-bold text-amber-600">
            {car.purchasePendingBalance > 0 ? `₹${car.purchasePendingBalance.toLocaleString('en-IN')}` : '-'}
          </div>
          <div className="flex-1 text-right font-medium text-red-500">
            + ₹{car.totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="flex-1 text-right font-bold text-slate-900 text-base">
            ₹{car.totalCost.toLocaleString('en-IN')}
          </div>
        </div>
      ))}

      <VehicleDetailsModal 
        car={selectedCar} 
        isOpen={!!selectedCar} 
        onClose={() => setSelectedCar(null)}
        accounts={accounts}
      />
      </div>
    </div>
  );
}

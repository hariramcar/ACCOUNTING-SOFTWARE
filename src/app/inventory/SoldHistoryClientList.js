'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import VehicleDetailsModal from './VehicleDetailsModal';

export default function SoldHistoryClientList({ sold, accounts = [] }) {
  const [selectedCar, setSelectedCar] = useState(null);

  return (
    <div className="flex flex-col p-6 gap-3">
      {sold?.map(car => (
        <div 
          key={car.id} 
          onClick={() => setSelectedCar(car)}
          className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex justify-between items-center hover:border-slate-200 hover:shadow-md cursor-pointer transition-all"
        >
          <div>
            <h4 className="m-0 mb-1 font-bold text-slate-900 flex items-center gap-2">
              {car.make} {car.model} 
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-white border border-slate-200 rounded-sm">{car.registration}</span>
            </h4>
            <div className="text-[11px] font-medium text-slate-500">
              Cost: ₹{car.totalCost.toLocaleString('en-IN')} (Bought: ₹{car.purchasePrice.toLocaleString('en-IN')} + Repairs: ₹{car.totalExpenses.toLocaleString('en-IN')})
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-end gap-2">
              {car.saleDate && (
                <>
                  <span>{new Date(car.saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="text-slate-300">•</span>
                </>
              )}
              <span>Sold for ₹{car.salePrice.toLocaleString('en-IN')}</span>
            </div>
            <div className={`font-black text-xl flex items-center justify-end gap-1 ${car.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {car.profit >= 0 && <CheckCircle2 size={16} />} 
              {car.profit >= 0 ? '+' : '-'} ₹{Math.abs(car.profit).toLocaleString('en-IN')}
            </div>
            {car.salePendingBalance > 0 && car.receivableAccount && (
              <div className="mt-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md inline-block mr-2">
                Pending: ₹{car.salePendingBalance.toLocaleString('en-IN')} from {car.receivableAccount.name}
              </div>
            )}
            {car.purchasePendingBalance > 0 && (
              <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md inline-block">
                Pending (Not Paid): ₹{car.purchasePendingBalance.toLocaleString('en-IN')}
                {car.payableAccount && ` to ${car.payableAccount.name}`}
              </div>
            )}
          </div>
        </div>
      ))}
      {sold?.length === 0 && <p className="text-slate-500 text-center py-4 text-sm font-medium">No cars sold yet.</p>}
      
      <VehicleDetailsModal 
        car={selectedCar} 
        isOpen={!!selectedCar} 
        onClose={() => setSelectedCar(null)}
        accounts={accounts}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import VehicleDetailsModal from './VehicleDetailsModal';

export default function SoldHistoryClientList({ sold, accounts = [] }) {
  const [selectedCar, setSelectedCar] = useState(null);

  return (
    <div className="w-full pb-2">
      {/* Mobile Card Layout */}
      <div className="flex flex-col gap-4 py-2 md:hidden">
        {sold?.map(car => (
          <div 
            key={car.id} 
            onClick={() => setSelectedCar(car)}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 cursor-pointer interactive-card"
          >
            <div>
              <h4 className="m-0 mb-1 font-bold text-slate-900 flex items-center justify-between gap-2">
                <span>{car.make} {car.model}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-sm">{car.registration}</span>
              </h4>
              <div className="text-[11px] font-medium text-slate-500 mt-1">
                Cost: ₹{car.totalCost.toLocaleString('en-IN')} (Bought: ₹{car.purchasePrice.toLocaleString('en-IN')} + Repairs: ₹{car.totalExpenses.toLocaleString('en-IN')})
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                {car.saleDate ? new Date(car.saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                {car.customerName && <div className="text-slate-400 mt-0.5 lowercase capitalize-first">{car.customerName} {car.customerMobile && `- ${car.customerMobile}`}</div>}
                <span className="font-bold text-slate-700">Sold: ₹{car.salePrice.toLocaleString('en-IN')}</span>
              </div>
              
              <div className={`font-black text-xl flex items-center justify-end gap-1 ${car.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {car.profit >= 0 && <CheckCircle2 size={16} />} 
                {car.profit >= 0 ? '+' : '-'} ₹{Math.abs(car.profit).toLocaleString('en-IN')}
              </div>
              
              <div className="flex flex-col gap-2 w-full mt-1">
                {car.salePendingBalance > 0 && car.receivableAccount && (
                  <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-1.5 rounded-md">
                    Pending Receive: ₹{car.salePendingBalance.toLocaleString('en-IN')} ({car.receivableAccount.name})
                  </div>
                )}
                {car.purchasePendingBalance > 0 && (
                  <div className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200/50 px-2 py-1.5 rounded-md">
                    Pending Pay: ₹{car.purchasePendingBalance.toLocaleString('en-IN')}
                    {car.payableAccount && ` (${car.payableAccount.name})`}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {sold?.length === 0 && <p className="text-slate-500 text-center py-4 text-sm font-medium">No cars sold yet.</p>}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block w-full overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm mt-4 mx-6 mb-6" style={{ width: 'calc(100% - 48px)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cost Breakdown</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Sale Details</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sold?.map(car => (
              <tr 
                key={car.id} 
                onClick={() => setSelectedCar(car)}
                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-6 align-top">
                  <h4 className="m-0 mb-1 font-bold text-slate-900 flex items-center gap-2">
                    {car.make} {car.model} 
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-white border border-slate-200 rounded-sm">{car.registration}</span>
                  </h4>
                  <div className="flex flex-col gap-1 mt-2">
                    {car.salePendingBalance > 0 && car.receivableAccount && (
                      <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-1 rounded w-max">
                        Pending Receive: ₹{car.salePendingBalance.toLocaleString('en-IN')} ({car.receivableAccount.name})
                      </div>
                    )}
                    {car.purchasePendingBalance > 0 && (
                      <div className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200/50 px-2 py-1 rounded w-max">
                        Pending Pay: ₹{car.purchasePendingBalance.toLocaleString('en-IN')}
                        {car.payableAccount && ` (${car.payableAccount.name})`}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 align-top text-right text-sm">
                  <div className="font-bold text-slate-700 mb-1">Total: ₹{car.totalCost.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-500">
                    <div>Bought: ₹{car.purchasePrice.toLocaleString('en-IN')}</div>
                    <div>Repairs: ₹{car.totalExpenses.toLocaleString('en-IN')}</div>
                  </div>
                </td>
                <td className="py-4 px-6 align-top text-right text-sm">
                  <div className="font-bold text-slate-900 mb-1">₹{car.salePrice.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider">
                    {car.saleDate ? new Date(car.saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    {car.customerName && <div className="text-slate-400 mt-1 capitalize">{car.customerName}</div>}
                    {car.customerMobile && <div className="text-slate-400">{car.customerMobile}</div>}
                  </div>
                </td>
                <td className="py-4 px-6 align-top text-right">
                  <div className={`font-black text-xl flex items-center justify-end gap-1 ${car.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {car.profit >= 0 && <CheckCircle2 size={16} />} 
                    {car.profit >= 0 ? '+' : '-'} ₹{Math.abs(car.profit).toLocaleString('en-IN')}
                  </div>
                </td>
              </tr>
            ))}
            {sold?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500 font-medium text-sm">
                  No cars sold yet.
                </td>
              </tr>
            )}
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

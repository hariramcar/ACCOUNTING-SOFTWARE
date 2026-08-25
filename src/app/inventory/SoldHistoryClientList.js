'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import VehicleDetailsModal from './VehicleDetailsModal';

export default function SoldHistoryClientList({ sold, accounts = [] }) {
  const [selectedCar, setSelectedCar] = useState(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const paginatedData = sold?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil((sold?.length || 0) / ITEMS_PER_PAGE);

  return (
    <div className="w-full pb-2">
      {/* Mobile Card Layout */}
      <div className="flex flex-col gap-4 py-2 md:hidden">
        {paginatedData?.map(car => (
          <div 
            key={car.id} 
            onClick={() => setSelectedCar(car)}
            className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2 cursor-pointer interactive-card"
          >
            <div className="flex justify-between items-start">
              <div className="pr-2">
                <h4 className="m-0 font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  {car.make} {car.model}
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded-sm">
                    {car.registration || 'UNREG'}
                  </span>
                  {car.partnerships && car.partnerships.length > 0 && <span className="text-[8px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold">Partnered</span>}
                </h4>
                <div className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider flex flex-col gap-0.5">
                  <div>
                    {car.saleDate ? new Date(car.saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                  </div>
                  {(car.customerName || car.customerMobile) && (
                    <div className="normal-case text-slate-400 mt-0.5">
                      {car.customerName && <span className="capitalize">{car.customerName}</span>}
                      {car.customerName && car.customerMobile && <span> - </span>}
                      {car.customerMobile && <span>{car.customerMobile}</span>}
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`shrink-0 font-black text-lg flex flex-col items-end ${car.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <div className="flex items-center gap-0.5">
                  {car.profit >= 0 ? '+' : '-'} ₹{Math.abs(car.profit).toLocaleString('en-IN')}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold opacity-70">Net Profit</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-slate-100 mt-1">
              <div className="col-span-2 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Sale Amount</span>
                  <span className="font-black text-slate-900 text-sm">₹{car.salePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-bold text-slate-400">Total Cost: ₹{car.totalCost.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {(car.salePendingBalance > 0 || (!car.isLegacy && car.purchasePendingBalance > 0)) && (
                <div className="col-span-2 flex flex-col gap-1 mt-1">
                  {car.salePendingBalance > 0 && car.receivableAccount && (
                    <div className="text-[10px] font-bold text-amber-700 flex items-center justify-between bg-amber-50 px-2 py-1 rounded">
                      <span>{car.receivableAccount && ['FINANCIER', 'DSA_AGENT'].includes(car.receivableAccount.type) ? 'Loan Agent Pay' : 'Pending Amount'}</span>
                      <span>₹{car.salePendingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {(!car.isLegacy && car.purchasePendingBalance > 0) && (
                    <div className="text-[10px] font-bold text-red-700 flex items-center justify-between bg-red-50 px-2 py-1 rounded">
                      <span>Pending Pay</span>
                      <span>₹{car.purchasePendingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {sold?.length === 0 && <p className="text-slate-500 text-center py-4 text-sm font-medium">No cars sold yet.</p>}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block w-full overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm mt-4">
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
            {paginatedData?.map(car => (
              <tr 
                key={car.id} 
                onClick={() => setSelectedCar(car)}
                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-6 align-top">
                  <h4 className="m-0 mb-1 font-bold text-slate-900 flex items-center gap-2">
                    {car.make} {car.model}
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-white border border-slate-200 rounded-sm">{car.registration || 'UNREG'}</span>
                    {car.partnerships && car.partnerships.length > 0 && <span className="text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">Partnered</span>}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(car.customerName || car.customerMobile) && (
                      <div className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                        {car.customerName && <span className="capitalize">{car.customerName}</span>}
                        {car.customerName && car.customerMobile && <span className="text-slate-300">|</span>}
                        {car.customerMobile && <span>{car.customerMobile}</span>}
                      </div>
                    )}
                    {car.salePendingBalance > 0 && car.receivableAccount && (
                      <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded w-max">
                        {['FINANCIER', 'DSA_AGENT'].includes(car.receivableAccount.type) ? 'Loan Agent Pay' : 'Pending Amount'}: ₹{car.salePendingBalance.toLocaleString('en-IN')} ({car.receivableAccount.name})
                      </div>
                    )}
                    {(!car.isLegacy && car.purchasePendingBalance > 0) && (
                      <div className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded w-max">
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
    
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 mt-4 shadow-sm w-full">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm font-bold text-slate-500">
          Page {page} of {totalPages}
        </span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

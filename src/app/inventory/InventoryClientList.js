'use client';

import { useState, useMemo } from 'react';
import { Search, Clock, BadgeCent, ChevronRight, AlertTriangle, CarFront, History } from 'lucide-react';
import VehicleDetailsModal from './VehicleDetailsModal';
import ReceiveTokenModal from './ReceiveTokenModal';
import SoldHistoryClientList from './SoldHistoryClientList';

export default function InventoryClientList({ inStock, sold, accounts = [] }) {
  const [selectedCar, setSelectedCar] = useState(null);
  const [receivingTokenCar, setReceivingTokenCar] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const calculateDaysInStock = (purchaseDate) => {
    if (!purchaseDate) return null;
    const diffTime = Math.abs(new Date() - new Date(purchaseDate));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredStock = useMemo(() => {
    if (!inStock) return [];
    let filtered = inStock;

    if (statusFilter === 'BOOKED') {
      filtered = filtered.filter(car => car.tokens?.some(t => t.status === 'ACTIVE'));
    } else if (statusFilter === 'AVAILABLE') {
      filtered = filtered.filter(car => !car.tokens?.some(t => t.status === 'ACTIVE'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(car => 
        car.make?.toLowerCase().includes(q) || 
        car.model?.toLowerCase().includes(q) || 
        car.registration?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [inStock, searchQuery, statusFilter]);

  if (!inStock || inStock.length === 0) {
    return <p className="text-slate-500 text-center py-8 text-sm font-medium">No cars currently in stock.</p>;
  }

  return (
    <div className="w-full pb-2 flex flex-col gap-6 md:gap-8">
      {/* ACTIVE STOCK SECTION */}
      <div className="md:bg-white md:border md:border-slate-200 md:rounded-xl md:shadow-sm overflow-hidden flex flex-col">
        {statusFilter !== 'SOLD' && (
          <div className="px-2 md:px-6 py-3 md:py-5 md:border-b border-slate-100 md:bg-slate-50/50 flex items-center justify-between mb-2 md:mb-0">
            <div className="flex items-center gap-2">
              <CarFront size={18} className="text-indigo-600" />
              <h2 className="m-0 text-slate-900 text-base md:text-lg font-bold">Showroom Stock</h2>
            </div>
            <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider bg-white md:bg-transparent border border-slate-200 md:border-none px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow-sm md:shadow-none">{filteredStock.length} Cars</span>
          </div>
        )}

        <div className="p-0 md:p-6 flex flex-col gap-3 md:gap-4">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-3 bg-white p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2.5 md:pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400 md:w-4 md:h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Make, Model, or Reg (e.g. Swift, GJ-05)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 md:pl-9 pr-3 py-1.5 md:py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>
        <div className="flex gap-0.5 md:gap-2 bg-slate-50 p-0.5 md:p-1 rounded-lg border border-slate-200 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 md:flex-none px-0 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-colors text-center ${statusFilter === 'ALL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`flex-1 md:flex-none px-0 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-colors text-center ${statusFilter === 'AVAILABLE' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Available
          </button>
          <button
            onClick={() => setStatusFilter('BOOKED')}
            className={`flex-1 md:flex-none px-0 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-colors text-center ${statusFilter === 'BOOKED' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Booked
          </button>
          <button
            onClick={() => setStatusFilter('SOLD')}
            className={`flex-1 md:flex-none px-0 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-md transition-colors text-center ${statusFilter === 'SOLD' ? 'bg-white shadow-sm text-red-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sold
          </button>
        </div>
      </div>

      {statusFilter === 'SOLD' ? (
        <SoldHistoryClientList sold={sold} accounts={accounts} />
      ) : filteredStock.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          <p className="text-slate-500 font-medium">No vehicles found matching your criteria.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {filteredStock.map(car => {
              const partnerPending = (car.partnerships || []).reduce((sum, p) => sum + (Number(p.investmentAmount) - Number(p.paidAmount || 0)), 0);
              const hasFirmPending = car.purchasePendingBalance > 0;
              const hasPartnerPending = partnerPending > 0;
              const daysInStock = calculateDaysInStock(car.purchaseDate);
              const isBooked = car.tokens?.some(t => t.status === 'ACTIVE');
              
              // Cost breakdown math
              const totalCost = car.totalCost || 1;
              const purchPct = Math.round((car.purchasePrice / totalCost) * 100);
              const repairPct = 100 - purchPct;

              return (
                  <div 
                    key={car.id} 
                    className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex flex-col gap-1.5 interactive-card relative overflow-hidden"
                  >
                  <div className="flex justify-between items-start" onClick={() => setSelectedCar(car)}>
                    <div className="w-full">
                      <div className="flex items-start justify-between">
                        <h3 className="m-0 text-slate-900 font-extrabold text-[15px] tracking-tight flex items-center gap-1.5 flex-wrap leading-tight">
                          {car.make} {car.model}
                          {car.isLegacy && <span className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold border border-amber-200">OLD</span>}
                          {isBooked && <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold border border-blue-200">BOOKED</span>}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 rounded-sm">
                          {car.registration || 'UNREG'}
                        </span>
                        {car.partnerships && car.partnerships.length > 0 && <span className="text-[8px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold">Partnered</span>}
                        {!car.isLegacy && daysInStock !== null && (
                          <div className={`flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                            daysInStock > 60 ? 'bg-red-100 text-red-700' : daysInStock > 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <Clock size={8} /> {daysInStock}D
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 border-t border-slate-100 mt-0.5" onClick={() => setSelectedCar(car)}>
                    <div className="col-span-2 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500">Cost Breakdown</span>
                        <span className="font-black text-slate-900 text-[13px]">₹{car.totalCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-slate-400" style={{ width: `${purchPct}%` }}></div>
                        <div className="h-full bg-red-400" style={{ width: `${repairPct}%` }}></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] font-bold text-slate-400">Purch: ₹{car.purchasePrice.toLocaleString('en-IN')}</span>
                        {car.totalExpenses > 0 && <span className="text-[8px] font-bold text-red-400">Repairs: +₹{car.totalExpenses.toLocaleString('en-IN')}</span>}
                      </div>
                    </div>

                    {(hasFirmPending || hasPartnerPending) && (
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Pending</span>
                        {hasFirmPending && (
                          <div className="font-bold text-amber-600 text-[11px] flex items-center justify-start gap-1 leading-tight">
                            ₹{car.purchasePendingBalance.toLocaleString('en-IN')}
                            <span className="text-[8px] text-amber-600/70 uppercase">Firm</span>
                          </div>
                        )}
                        {hasPartnerPending && (
                          <div className="font-bold text-purple-600 text-[11px] flex items-center justify-start gap-1 leading-tight mt-0.5">
                            ₹{partnerPending.toLocaleString('en-IN')}
                            <span className="text-[8px] text-purple-600/70 uppercase">Ptr</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block w-full overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Vehicle Info</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Age</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Purchase Price</th>
                    <th className="py-4 px-6 text-xs font-bold text-amber-700 uppercase tracking-wider text-right">Pending Pay</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Repairs</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right rounded-tr-lg">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStock.map(car => {
                    const partnerPending = (car.partnerships || []).reduce((sum, p) => sum + (Number(p.investmentAmount) - Number(p.paidAmount || 0)), 0);
                    const hasFirmPending = car.purchasePendingBalance > 0;
                    const hasPartnerPending = partnerPending > 0;
                    const daysInStock = calculateDaysInStock(car.purchaseDate);
                    const isBooked = car.tokens?.some(t => t.status === 'ACTIVE');

                    const totalCost = car.totalCost || 1;
                    const purchPct = Math.round((car.purchasePrice / totalCost) * 100);
                    const repairPct = 100 - purchPct;

                    return (
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
                            {isBooked && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-blue-200">BOOKED</span>}
                            {car.partnerships && car.partnerships.length > 0 && <span className="text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Partnered</span>}
                          </div>
                          <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-widest inline-block shadow-sm">
                            {car.registration || 'UNREGISTERED'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {!car.isLegacy && daysInStock !== null ? (
                            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${
                              daysInStock > 60 ? 'bg-red-50 text-red-600 border border-red-100' : daysInStock > 30 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              <Clock size={12} /> {daysInStock} {daysInStock === 1 ? 'Day' : 'Days'}
                              {daysInStock > 60 && <AlertTriangle size={12} className="ml-1" />}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-slate-600 whitespace-nowrap">
                          ₹{car.purchasePrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {hasFirmPending && (
                            <div className="font-bold text-amber-600 flex items-center justify-end gap-1">
                              ₹{car.purchasePendingBalance.toLocaleString('en-IN')}
                              <span className="text-[10px] text-amber-600/70 uppercase">Firm</span>
                            </div>
                          )}
                          {hasPartnerPending && (
                            <div className={`font-bold text-purple-600 flex items-center justify-end gap-1 ${hasFirmPending ? 'mt-0.5' : ''}`}>
                              ₹{partnerPending.toLocaleString('en-IN')}
                              <span className="text-[10px] text-purple-600/70 uppercase">Ptr</span>
                            </div>
                          )}
                          {!hasFirmPending && !hasPartnerPending && <span className="text-slate-400 font-bold">-</span>}
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-red-500 whitespace-nowrap">
                          {car.totalExpenses > 0 ? `+ ₹${car.totalExpenses.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-4 px-6 text-right font-black text-slate-900 text-base whitespace-nowrap">
                          ₹{car.totalCost.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      </div>

        {/* SOLD HISTORY SECTION (Rendered at bottom only on ALL filter) */}
        {statusFilter === 'ALL' && (
          <div className="md:bg-white md:border md:border-slate-200 md:rounded-xl md:shadow-sm overflow-hidden flex flex-col mt-4 md:mt-0">
            <div className="px-2 md:px-6 py-3 md:py-5 md:border-b border-slate-100 md:bg-slate-50/50 flex items-center gap-2 mb-2 md:mb-0">
              <History size={18} className="text-slate-600" />
              <h2 className="m-0 text-slate-900 text-base md:text-lg font-bold">Recent Sales</h2>
            </div>
            
            <div className="p-0">
              <SoldHistoryClientList sold={sold} accounts={accounts} />
            </div>
          </div>
        )}

      <VehicleDetailsModal 
        car={selectedCar} 
        isOpen={!!selectedCar} 
        onClose={() => setSelectedCar(null)}
        accounts={accounts}
        onReceiveToken={() => {
          setSelectedCar(null);
          setReceivingTokenCar(selectedCar);
        }}
      />

      <ReceiveTokenModal
        vehicle={receivingTokenCar}
        isOpen={!!receivingTokenCar}
        onClose={() => setReceivingTokenCar(null)}
        accounts={accounts}
      />
    </div>
  );
}

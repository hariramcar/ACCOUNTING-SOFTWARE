import { getInventory, addVehicle } from '@/actions/inventory';
import { getAccounts } from '@/actions/rojmel';
import { CarFront, History, CheckCircle2 } from 'lucide-react';
import AddVehicleModal from './AddVehicleModal';
import SellVehicleModal from './SellVehicleModal';
import TopTokenButton from './TopTokenButton';
import InventoryClientList from './InventoryClientList';
import SoldHistoryClientList from './SoldHistoryClientList';

import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function InventoryPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/expenses');

  const cookieStore = await cookies();
  const globalMonth = cookieStore.get('global_month')?.value;
  
  let year, month;
  if (globalMonth) {
    const parts = globalMonth.split('-');
    year = Number(parts[0]);
    month = Number(parts[1]);
  } else {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth();
  }

  const { inStock, sold, allCurrentStock } = await getInventory(year, month);
  const { accounts } = await getAccounts();

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-4 md:gap-4 text-slate-900 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-4 mb-1 md:mb-2 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-4 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
              <CarFront size={18} className="md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 m-0">Vehicle Khata</h1>
          </div>
          <p className="hidden md:block text-xs md:text-sm text-slate-500 m-0 font-medium ml-0 md:ml-13 mt-1.5 md:mt-0">Manage inventory, track repairs, and monitor sales</p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:flex md:items-center md:gap-2.5 md:w-auto pb-1 md:pb-0 shrink-0">
          <SellVehicleModal inStock={allCurrentStock} accounts={accounts || []} />
          <TopTokenButton inStock={inStock} accounts={accounts || []} />
          <AddVehicleModal accounts={accounts || []} addVehicleAction={addVehicle} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 md:p-4 flex flex-col justify-between interactive-card shadow-sm">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 text-indigo-600">
            <CarFront size={14} className="md:w-4 md:h-4" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">In Stock</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-indigo-900">{inStock?.length || 0}</div>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 flex flex-col justify-between interactive-card shadow-sm">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 text-slate-500">
            <CheckCircle2 size={14} className="md:w-4 md:h-4" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Stock Value</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-800">
            ₹{(inStock?.reduce((acc, car) => acc + (car.totalCost || 0), 0) || 0).toLocaleString('en-IN')}
          </div>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 md:p-4 flex flex-col justify-between interactive-card shadow-sm">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 text-emerald-600">
            <History size={14} className="md:w-4 md:h-4" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Sold (Month)</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-900">{sold?.length || 0}</div>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 md:p-4 flex flex-col justify-between interactive-card shadow-sm">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 text-purple-600">
            <CheckCircle2 size={14} className="md:w-4 md:h-4" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Profit (Month)</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-purple-900">
            ₹{(sold?.reduce((acc, car) => acc + (car.profit || 0), 0) || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* INVENTORY LIST */}
        <div className="flex flex-col gap-6 md:gap-8">
          <InventoryClientList inStock={inStock} sold={sold} accounts={accounts || []} />
        </div>
      </div>
    </div>
  );
}

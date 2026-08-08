import { getInventory, addVehicle } from '@/actions/inventory';
import { getAccounts } from '@/actions/rojmel';
import { CarFront, History, CheckCircle2 } from 'lucide-react';
import AddVehicleModal from './AddVehicleModal';
import SellVehicleModal from './SellVehicleModal';
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

  const { inStock, sold } = await getInventory(year, month);
  const { accounts } = await getAccounts();

  return (
    <div className="w-full max-w-7xl mx-auto p-8 flex flex-col gap-8 text-slate-900">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
              <CarFront size={20} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vehicle Khata</h1>
          </div>
          <p className="text-slate-500 m-0 font-medium ml-13">Manage inventory, track repairs, and monitor sales</p>
        </div>
        <div className="flex gap-3">
          <SellVehicleModal inStock={inStock} accounts={accounts || []} />
          <AddVehicleModal accounts={accounts || []} addVehicleAction={addVehicle} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* INVENTORY LIST */}
        <div className="flex flex-col gap-8">
          
          {/* ACTIVE STOCK */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CarFront size={18} className="text-indigo-600" />
                <h2 className="m-0 text-slate-900 text-lg font-bold">Showroom Stock</h2>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-white border border-slate-200 px-3 py-1 rounded-full">{inStock?.length || 0} Cars</span>
            </div>
            
            <div className="p-6">
              <InventoryClientList inStock={inStock} accounts={accounts || []} />
            </div>
          </div>

          {/* SOLD HISTORY */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <History size={18} className="text-slate-600" />
              <h2 className="m-0 text-slate-900 text-lg font-bold">Recent Sales</h2>
            </div>
            
            <SoldHistoryClientList sold={sold} accounts={accounts || []} />
          </div>

        </div>
      </div>
    </div>
  );
}

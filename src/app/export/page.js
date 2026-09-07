import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getExportData } from '@/actions/export';
import { cookies } from 'next/headers';
import ExportInspectorClient from './ExportInspectorClient';

export const metadata = {
  title: 'Transaction Inspector & Export | Hariram Accounting',
  description: 'Inspect, filter, verify, and export all firm transactions and financial records.',
};

export default async function ExportPage({ searchParams }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/expenses');
  }

  const awaitedParams = await searchParams;
  const cookieStore = await cookies();
  const globalMonth = cookieStore.get('global_month')?.value;

  let y, mIndex;
  if (globalMonth) {
    const parts = globalMonth.split('-');
    y = Number(parts[0]);
    mIndex = Number(parts[1]);
  } else {
    const now = new Date();
    y = now.getFullYear();
    mIndex = now.getMonth();
  }

  const m = String(mIndex + 1).padStart(2, '0');
  const lastDay = new Date(y, mIndex + 1, 0).getDate();

  const defaultStart = `${y}-${m}-01`;
  const defaultEnd = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

  const startDate = awaitedParams?.startDate || defaultStart;
  const endDate = awaitedParams?.endDate || defaultEnd;

  const result = await getExportData(startDate, endDate);
  const initialData = result.success ? result.data : null;

  return (
    <ExportInspectorClient 
      initialData={initialData}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  );
}

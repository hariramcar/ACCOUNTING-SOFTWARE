import ProfitDashboard from './ProfitDashboard';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Profit Engine | Hariram Accounting',
};

export default async function ProfitPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/expenses');
  
  return <ProfitDashboard />;
}

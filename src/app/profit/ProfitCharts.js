'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function ProfitCharts({ data }) {
  if (!data) return null;

  const chartData = [
    {
      name: 'Gross Car Profit',
      Amount: data.totalGrossProfit,
      fill: '#10b981', // emerald-500
    },
    {
      name: 'Office Expenses',
      Amount: data.totalOfficeExpenseAmount,
      fill: '#ef4444', // red-500
    },
    {
      name: 'Car Repairs',
      Amount: data.totalCarExpenseAmount || 0,
      fill: '#f59e0b', // amber-500
    },
    {
      name: 'Net Profit',
      Amount: Math.abs(data.netProfit),
      fill: data.netProfit >= 0 ? '#4f46e5' : '#ef4444', // indigo-600 or red-500
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
          <p className="text-white font-black text-lg">
            ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        barSize={40}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
          dy={10}
        />
        <YAxis 
          hide 
        />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
        <Bar 
          dataKey="Amount" 
          radius={[6, 6, 0, 0]}
          animationDuration={1500}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

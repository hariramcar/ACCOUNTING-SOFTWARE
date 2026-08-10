'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProfitCharts({ data }) {
  if (!data) return null;

  const chartData = [
    { name: 'Gross Profit', value: data.totalGrossProfit || 0 },
    { name: 'Office Expenses', value: data.totalOfficeExpenseAmount || 0 },
    { name: 'Car Repairs', value: data.totalCarExpenseAmount || 0 },
    { name: 'Net Profit', value: Math.abs(data.netProfit || 0), isNegative: data.netProfit < 0 }
  ];

  // Colors for the slices
  const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#6366f1'];
  // If net profit is negative, we color it red instead of indigo
  if (data.netProfit < 0) {
    COLORS[3] = '#e11d48';
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataInfo = payload[0].payload;
      const val = dataInfo.value;
      const isNeg = dataInfo.isNegative;
      
      return (
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xl ring-1 ring-slate-900/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].fill }}></div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{dataInfo.name}</p>
          </div>
          <p className="font-black text-2xl tracking-tighter text-slate-800">
            {isNeg ? '-₹' : '₹'}{val.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-4">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
            <span className="text-xs sm:text-sm font-bold text-slate-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-[320px] sm:h-[380px] bg-white rounded-3xl relative flex flex-col justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={5}
            dataKey="value"
            animationDuration={1500}
            animationEasing="ease-out"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.1))' }}
              />
            ))}
          </Pie>
          <Legend content={renderCustomLegend} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

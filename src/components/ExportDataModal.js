'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, FileSpreadsheet, FileText, FileDown, Calendar, Check, Loader2, 
  Search, ArrowDownRight, ArrowUpRight, Filter, Eye, RefreshCw, 
  Car, Landmark, Receipt, AlertCircle, CheckCircle2, ChevronRight,
  TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getExportData } from '@/actions/export';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExportDataModal({ isOpen, onClose }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewTab, setPreviewTab] = useState('TRANSACTIONS');
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');

  // Initialize dates to current month upon open
  useEffect(() => {
    if (isOpen && (!startDate || !endDate)) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      
      const start = `${y}-${m}-01`;
      const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
      loadPreview(start, end);
    }
  }, [isOpen]);

  const loadPreview = async (start, end) => {
    if (!start || !end) return;
    setIsLoadingPreview(true);
    try {
      const res = await getExportData(start, end);
      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch transaction preview');
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
      toast.error('Failed to load transaction data');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDateChange = (type, val) => {
    let newStart = startDate;
    let newEnd = endDate;
    if (type === 'start') {
      newStart = val;
      setStartDate(val);
    } else {
      newEnd = val;
      setEndDate(val);
    }
    if (newStart && newEnd) {
      loadPreview(newStart, newEnd);
    }
  };

  const applyPreset = (preset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let start = '';
    let end = '';

    if (preset === 'today') {
      const day = String(now.getDate()).padStart(2, '0');
      const monthStr = String(m + 1).padStart(2, '0');
      start = `${y}-${monthStr}-${day}`;
      end = `${y}-${monthStr}-${day}`;
    } else if (preset === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(now.getDate() - 1);
      const day = String(yDate.getDate()).padStart(2, '0');
      const monthStr = String(yDate.getMonth() + 1).padStart(2, '0');
      start = `${yDate.getFullYear()}-${monthStr}-${day}`;
      end = `${yDate.getFullYear()}-${monthStr}-${day}`;
    } else if (preset === 'thisMonth') {
      const monthStr = String(m + 1).padStart(2, '0');
      const lastDay = new Date(y, m + 1, 0).getDate();
      start = `${y}-${monthStr}-01`;
      end = `${y}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    } else if (preset === 'lastMonth') {
      const lastMonthDate = new Date(y, m - 1, 1);
      const lmY = lastMonthDate.getFullYear();
      const lmM = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(lmY, lastMonthDate.getMonth() + 1, 0).getDate();
      start = `${lmY}-${lmM}-01`;
      end = `${lmY}-${lmM}-${String(lastDay).padStart(2, '0')}`;
    } else if (preset === 'allTime') {
      start = '2025-01-01';
      end = `${y}-12-31`;
    }

    setStartDate(start);
    setEndDate(end);
    loadPreview(start, end);
  };

  // Calculate high-level summary KPIs
  const metrics = useMemo(() => {
    if (!previewData) {
      return { totalTx: 0, totalCredit: 0, totalDebit: 0, netFlow: 0, totalVehicles: 0, totalExpenses: 0 };
    }
    const txs = previewData.transactions || [];
    let totalCredit = 0;
    let totalDebit = 0;
    txs.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'CREDIT') totalCredit += amt;
      else if (t.type === 'DEBIT') totalDebit += amt;
    });
    return {
      totalTx: txs.length,
      totalCredit,
      totalDebit,
      netFlow: totalCredit - totalDebit,
      totalVehicles: previewData.vehicles?.length || 0,
      totalExpenses: previewData.expenses?.length || 0
    };
  }, [previewData]);

  // Filter transactions for preview
  const filteredTxs = useMemo(() => {
    if (!previewData?.transactions) return [];
    let list = previewData.transactions;

    if (txTypeFilter === 'CREDIT') list = list.filter(t => t.type === 'CREDIT');
    else if (txTypeFilter === 'DEBIT') list = list.filter(t => t.type === 'DEBIT');
    else if (txTypeFilter === 'CASH') list = list.filter(t => t.transactionMode === 'CASH');
    else if (txTypeFilter === 'BANK') list = list.filter(t => t.transactionMode === 'BANK');

    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.account?.name?.toLowerCase().includes(q) ||
        t.amount?.toString().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [previewData, txTypeFilter, txSearch]);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates.');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading(`Generating verified ${format.toUpperCase()} report...`, { id: 'export-verified' });

      const result = await getExportData(startDate, endDate);
      if (!result.success) throw new Error(result.error);
      
      const { transactions, vehicles, accounts, expenses } = result.data;
      
      // Formatting Data for Excel/PDF
      const txData = transactions.map(t => {
        const v = t.referenceId ? vehicles.find(veh => veh.id === t.referenceId) : null;
        return {
          'Transaction ID': t.id,
          'Date': new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          'Amount (₹)': Number(t.amount),
          'Type': t.type,
          'Mode': t.transactionMode,
          'Category': t.category,
          'Description': t.description || '-',
          'Account Name': t.account?.name || 'N/A',
          'Vehicle / Ref': v ? `${v.make} ${v.model} (${v.registration || 'Unregistered'})` : '-',
          'Created Timestamp': new Date(t.createdAt).toISOString()
        };
      });

      const vData = vehicles.map(v => {
        const legacyCost = Number(v.legacyExpenses || 0);
        const standardRepairCost = v.expenses?.filter(e => e.expenseType === 'CAR_EXPENSE' && e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const totalRepairCost = standardRepairCost + legacyCost;
        const purchasePrice = Number(v.purchasePrice || 0);
        const totalCost = purchasePrice + totalRepairCost;
        
        return {
          'Vehicle ID': v.id,
          'Make': v.make,
          'Model': v.model,
          'Registration': v.registration || '-',
          'Status': v.status,
          'Purchase Price (₹)': purchasePrice,
          'Repair Cost (₹)': totalRepairCost,
          'Total Investment Cost (₹)': totalCost,
          'Sale Price (₹)': Number(v.salePrice || 0),
          'Net Profit (₹)': Number(v.profit || 0),
          'Purchase Date': v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('en-GB') : '-',
          'Sale Date': v.saleDate ? new Date(v.saleDate).toLocaleDateString('en-GB') : '-',
          'Customer Name': v.customerName || '-',
          'Customer Mobile': v.customerMobile || '-'
        };
      });

      const expData = (expenses || []).map(e => ({
        'Expense ID': e.id,
        'Date': new Date(e.date).toLocaleDateString('en-GB'),
        'Type': e.expenseType,
        'Amount (₹)': Number(e.amount),
        'Description': e.description,
        'Status': e.status,
        'Linked Vehicle': e.vehicle ? `${e.vehicle.make} ${e.vehicle.model} (${e.vehicle.registration})` : '-'
      }));

      const accData = accounts.map(a => ({
        'Account ID': a.id,
        'Account Name': a.name,
        'Type': a.type,
        'Opening Balance (₹)': Number(a.openingBalance),
        'Profit Share (%)': Number(a.profitShare || 0)
      }));

      const fileName = `HariramCars_Report_${startDate}_to_${endDate}`;

      if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), "Transactions");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vData), "Inventory");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expData), "Expenses");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accData), "Accounts");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        
      } else if (format === 'csv') {
        const txSheet = XLSX.utils.json_to_sheet(txData);
        const csvString = XLSX.utils.sheet_to_csv(txSheet);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_transactions.csv`;
        link.click();
        
      } else if (format === 'pdf') {
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text("Hariram Cars - Verified Transaction Report", 14, 18);
        
        doc.setFontSize(10);
        doc.text(`Period: ${startDate} to ${endDate} | Total Transactions: ${transactions.length} | Inflow: Rs ${metrics.totalCredit.toLocaleString('en-IN')} | Outflow: Rs ${metrics.totalDebit.toLocaleString('en-IN')}`, 14, 25);
        
        doc.setFontSize(12);
        doc.text("1. Transactions Register", 14, 34);
        
        autoTable(doc, {
          startY: 38,
          head: [['Date', 'Type', 'Mode', 'Amount (Rs)', 'Account', 'Description']],
          body: txData.map(t => [
            t['Date'],
            t['Type'], 
            t['Mode'],
            t['Amount (₹)'].toLocaleString('en-IN'), 
            t['Account Name'], 
            t['Description']
          ]),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 8 }
        });
        
        if (vData.length > 0) {
          doc.addPage();
          doc.setFontSize(14);
          doc.text("2. Vehicle Inventory & Sales", 14, 20);
          
          autoTable(doc, {
            startY: 25,
            head: [['Make', 'Model', 'Reg', 'Status', 'Cost (Rs)', 'Sale Price (Rs)', 'Profit (Rs)', 'Sale Date']],
            body: vData.map(v => [
              v['Make'], 
              v['Model'], 
              v['Registration'], 
              v['Status'], 
              v['Total Investment Cost (₹)'].toLocaleString('en-IN'), 
              v['Sale Price (₹)'].toLocaleString('en-IN'), 
              v['Net Profit (₹)'].toLocaleString('en-IN'), 
              v['Sale Date']
            ]),
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 }
          });
        }

        doc.save(`${fileName}.pdf`);
      }

      toast.success('Report generated & downloaded successfully!', { id: 'export-verified' });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to generate report.', { id: 'export-verified' });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col border border-slate-200 max-h-[92vh] my-auto">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
              <Eye size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 m-0">
                  Transaction Inspector & Data Exporter
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Verify Before Download
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 m-0 mt-0.5">
                Select your starting and ending date to inspect all transactions on-screen before generating your report.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shadow-sm shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTROLS SECTION: DATE RANGE & PRESETS */}
        <div className="p-4 sm:p-6 bg-white border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            
            {/* Date Pickers */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" /> Start Date
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold text-xs sm:text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" /> End Date
                </label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold text-xs sm:text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Quick Presets & Refresh Button */}
            <div className="lg:col-span-6 flex flex-wrap items-center justify-between sm:justify-end gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'thisMonth', label: 'This Month' },
                  { id: 'lastMonth', label: 'Last Month' },
                  { id: 'allTime', label: 'All Time' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 text-[11px] font-bold transition-all shadow-2xs"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => loadPreview(startDate, endDate)}
                disabled={isLoadingPreview || !startDate || !endDate}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                title="Refresh Live Data"
              >
                <RefreshCw size={13} className={isLoadingPreview ? 'animate-spin' : ''} />
                <span>{isLoadingPreview ? 'Loading...' : 'Inspect Live Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* LIVE PREVIEW CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 flex flex-col gap-4 min-h-[300px]">
          
          {/* TOP KPI SUMMARY BAR */}
          {previewData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Records</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900">{metrics.totalTx} <span className="text-xs font-semibold text-slate-500">txs</span></div>
              </div>

              <div className="bg-white border border-emerald-100 rounded-2xl p-3 sm:p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5 flex items-center gap-1">
                  <ArrowDownRight size={12} /> Money In (Credit)
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  +₹{metrics.totalCredit.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-white border border-rose-100 rounded-2xl p-3 sm:p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-0.5 flex items-center gap-1">
                  <ArrowUpRight size={12} /> Money Out (Debit)
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-600">
                  -₹{metrics.totalDebit.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-white border border-indigo-100 rounded-2xl p-3 sm:p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-0.5 flex items-center gap-1">
                  <Car size={12} /> Vehicles Active/Sold
                </span>
                <div className="text-xl sm:text-2xl font-black text-indigo-600">
                  {metrics.totalVehicles} <span className="text-xs font-semibold text-slate-500">cars</span>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TABS & FILTERS BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setPreviewTab('TRANSACTIONS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  previewTab === 'TRANSACTIONS' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText size={14} />
                <span>Transactions ({metrics.totalTx})</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('VEHICLES')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  previewTab === 'VEHICLES' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Car size={14} />
                <span>Vehicles ({metrics.totalVehicles})</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('EXPENSES')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  previewTab === 'EXPENSES' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Receipt size={14} />
                <span>Vouchers ({metrics.totalExpenses})</span>
              </button>
            </div>

            {/* In-table Search and Filters (for Transactions) */}
            {previewTab === 'TRANSACTIONS' && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search preview..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="CREDIT">Credits (+)</option>
                  <option value="DEBIT">Debits (-)</option>
                  <option value="CASH">Cash Only</option>
                  <option value="BANK">Bank Only</option>
                </select>
              </div>
            )}
          </div>

          {/* LOADING STATE */}
          {isLoadingPreview && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-xs">
              <Loader2 size={32} className="text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-800 m-0">Scanning ledger & database records...</p>
              <p className="text-xs text-slate-500 m-0 mt-1">Retrieving all entries between {startDate} and {endDate}</p>
            </div>
          )}

          {/* PREVIEW TAB 1: TRANSACTIONS TABLE */}
          {!isLoadingPreview && previewTab === 'TRANSACTIONS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Type / Mode</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Account</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTxs.length > 0 ? (
                      filteredTxs.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-600 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                                t.type === 'CREDIT' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {t.type}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {t.transactionMode || 'CASH'}
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900 max-w-xs truncate" title={t.description}>
                            {t.description || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-600 whitespace-nowrap">
                            {t.account?.name || '-'}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-black whitespace-nowrap text-sm ${
                            t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {t.type === 'CREDIT' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          No transactions match the selected dates and search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PREVIEW TAB 2: VEHICLES TABLE */}
          {!isLoadingPreview && previewTab === 'VEHICLES' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Vehicle</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Cost Details</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Sale Details</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData?.vehicles && previewData.vehicles.length > 0 ? (
                      previewData.vehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{v.make} {v.model}</div>
                            <div className="text-[10px] font-semibold text-slate-500">{v.registration || 'Unregistered'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                              v.status === 'SOLD' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            <div>Bought: ₹{Number(v.purchasePrice || 0).toLocaleString('en-IN')}</div>
                            {v.purchaseDate && <div className="text-[10px] text-slate-400">{new Date(v.purchaseDate).toLocaleDateString('en-GB')}</div>}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {v.status === 'SOLD' ? (
                              <>
                                <div>Sold: ₹{Number(v.salePrice || 0).toLocaleString('en-IN')}</div>
                                {v.saleDate && <div className="text-[10px] text-slate-400">{new Date(v.saleDate).toLocaleDateString('en-GB')}</div>}
                              </>
                            ) : (
                              <span className="text-slate-400 italic">In Showroom</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-sm">
                            {v.status === 'SOLD' && v.profit !== null ? (
                              <span className={Number(v.profit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {Number(v.profit) >= 0 ? '+' : ''}₹{Number(v.profit).toLocaleString('en-IN')}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          No vehicles found with activity in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PREVIEW TAB 3: EXPENSES / VOUCHERS TABLE */}
          {!isLoadingPreview && previewTab === 'EXPENSES' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider">Linked Car</th>
                      <th className="py-3 px-4 font-extrabold text-slate-500 uppercase tracking-wider text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData?.expenses && previewData.expenses.length > 0 ? (
                      previewData.expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-600 whitespace-nowrap">
                            {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {e.expenseType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{e.description}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-600">
                            {e.vehicle ? `${e.vehicle.make} ${e.vehicle.model} (${e.vehicle.registration})` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-rose-600">
                            ₹{Number(e.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          No expense vouchers found in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM ACTION BAR: FORMAT SELECTOR & GENERATE BUTTON */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Format Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Export Format:</span>
            <div className="grid grid-cols-3 gap-2 flex-1 sm:flex-initial">
              {[
                { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                { id: 'pdf', label: 'PDF (.pdf)', icon: FileText, color: 'text-rose-700 bg-rose-50 border-rose-300' },
                { id: 'csv', label: 'CSV (.csv)', icon: FileDown, color: 'text-indigo-700 bg-indigo-50 border-indigo-300' }
              ].map(fmt => {
                const Icon = fmt.icon;
                const isSelected = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected 
                        ? `${fmt.color} shadow-xs ring-2 ring-indigo-500/20` 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || !startDate || !endDate}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black tracking-wide text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              <span>{isExporting ? 'Generating Report...' : `Generate & Download (${format.toUpperCase()})`}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

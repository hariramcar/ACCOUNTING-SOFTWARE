'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Search, FileSpreadsheet, FileText, FileDown,
  RefreshCw, Loader2, ArrowDownRight, ArrowUpRight, Car,
  Landmark, Receipt, Eye, Filter, CheckCircle2,
  Wallet, Layers, Download, Printer, X, ExternalLink,
  ChevronDown, ArrowUpDown, Clock, Building2, User, Phone, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getExportData } from '@/actions/export';
import { attachVehicleToExpense } from '@/actions/expenses';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExportInspectorClient({ initialData, initialStartDate, initialEndDate }) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState('excel'); // 'excel' | 'pdf' | 'csv'

  // Tabs: TRANSACTIONS | VEHICLES | EXPENSES | ACCOUNTS
  const [activeTab, setActiveTab] = useState('TRANSACTIONS');

  // Transaction Filters
  const [txSearch, setTxSearch] = useState('');
  const [txFlowFilter, setTxFlowFilter] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT' | 'CASH' | 'BANK'
  const [txAccountFilter, setTxAccountFilter] = useState('ALL');
  const [txCategoryFilter, setTxCategoryFilter] = useState('ALL');
  const [txSortBy, setTxSortBy] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

  // Vehicle Filters
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'SOLD'

  // Expense Filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('ALL');

  // Inspection Modal & Vehicle Attachment
  const [inspectingTx, setInspectingTx] = useState(null);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isAttachingVehicle, setIsAttachingVehicle] = useState(false);

  const handleOpenDossier = (tx) => {
    setSelectedVehicleId(tx?.vehicle?.id || '');
    setIsEditingVehicle(false);
    setInspectingTx(tx);
  };

  const loadData = async (start, end) => {
    if (!start || !end) return;
    setIsLoading(true);
    try {
      const res = await getExportData(start, end);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch transaction data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading data');
    } finally {
      setIsLoading(false);
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
      loadData(newStart, newEnd);
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
    } else if (preset === 'last90') {
      const d90 = new Date();
      d90.setDate(now.getDate() - 90);
      const startDay = String(d90.getDate()).padStart(2, '0');
      const startMonth = String(d90.getMonth() + 1).padStart(2, '0');
      const endDay = String(now.getDate()).padStart(2, '0');
      const endMonth = String(m + 1).padStart(2, '0');
      start = `${d90.getFullYear()}-${startMonth}-${startDay}`;
      end = `${y}-${endMonth}-${endDay}`;
    } else if (preset === 'fullYear') {
      start = `${y}-01-01`;
      end = `${y}-12-31`;
    } else if (preset === 'allTime') {
      start = '2025-01-01';
      end = `${y}-12-31`;
    }

    setStartDate(start);
    setEndDate(end);
    loadData(start, end);
  };

  // High-Level Summary Calculations
  const metrics = useMemo(() => {
    if (!data) {
      return {
        totalTx: 0,
        totalCredit: 0,
        totalDebit: 0,
        netFlow: 0,
        cashCredit: 0,
        cashDebit: 0,
        bankCredit: 0,
        bankDebit: 0,
        totalVehicles: 0,
        soldVehiclesCount: 0,
        totalTradingProfit: 0,
        totalExpenses: 0,
        expensesSum: 0
      };
    }
    const txs = data.transactions || [];
    let totalCredit = 0;
    let totalDebit = 0;
    let cashCredit = 0;
    let cashDebit = 0;
    let bankCredit = 0;
    let bankDebit = 0;

    txs.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === 'CREDIT') {
        totalCredit += amt;
        if (t.transactionMode === 'CASH') cashCredit += amt;
        else bankCredit += amt;
      } else if (t.type === 'DEBIT') {
        totalDebit += amt;
        if (t.transactionMode === 'CASH') cashDebit += amt;
        else bankDebit += amt;
      }
    });

    // Sold vehicles in range and profit
    const vehicles = data.vehicles || [];
    const soldVehicles = vehicles.filter(v => v.status === 'SOLD');
    const totalTradingProfit = soldVehicles.reduce((sum, v) => sum + Number(v.profit || 0), 0);

    // Total expenses
    const expenses = data.expenses || [];
    const expensesSum = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return {
      totalTx: txs.length,
      totalCredit,
      totalDebit,
      netFlow: totalCredit - totalDebit,
      cashCredit,
      cashDebit,
      bankCredit,
      bankDebit,
      totalVehicles: vehicles.length,
      soldVehiclesCount: soldVehicles.length,
      totalTradingProfit,
      totalExpenses: expenses.length,
      expensesSum
    };
  }, [data]);

  // Unique lists for dropdown filters
  const accountOptions = useMemo(() => {
    if (!data?.accounts) return [];
    return data.accounts;
  }, [data]);

  const categoryOptions = useMemo(() => {
    if (!data?.transactions) return [];
    const cats = new Set(data.transactions.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [data]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    let list = [...data.transactions];

    // Flow filter
    if (txFlowFilter === 'CREDIT') list = list.filter(t => t.type === 'CREDIT');
    else if (txFlowFilter === 'DEBIT') list = list.filter(t => t.type === 'DEBIT');
    else if (txFlowFilter === 'CASH') list = list.filter(t => t.transactionMode === 'CASH');
    else if (txFlowFilter === 'BANK') list = list.filter(t => t.transactionMode === 'BANK');

    // Account filter
    if (txAccountFilter !== 'ALL') {
      list = list.filter(t => t.accountId === txAccountFilter);
    }

    // Category filter
    if (txCategoryFilter !== 'ALL') {
      list = list.filter(t => t.category === txCategoryFilter);
    }

    // Search query
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.account?.name?.toLowerCase().includes(q) ||
        t.amount?.toString().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.vehicle?.make?.toLowerCase().includes(q) ||
        t.vehicle?.model?.toLowerCase().includes(q) ||
        t.vehicle?.registration?.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (txSortBy === 'date-desc') {
        return new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt);
      } else if (txSortBy === 'date-asc') {
        return new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt);
      } else if (txSortBy === 'amount-desc') {
        return Number(b.amount) - Number(a.amount);
      } else if (txSortBy === 'amount-asc') {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });

    return list;
  }, [data, txFlowFilter, txAccountFilter, txCategoryFilter, txSearch, txSortBy]);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    if (!data?.vehicles) return [];
    let list = [...data.vehicles];

    if (vehicleStatusFilter !== 'ALL') {
      list = list.filter(v => v.status === vehicleStatusFilter);
    }

    if (vehicleSearch.trim()) {
      const q = vehicleSearch.toLowerCase();
      list = list.filter(v =>
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.registration?.toLowerCase().includes(q) ||
        v.customerName?.toLowerCase().includes(q) ||
        v.customerMobile?.includes(q)
      );
    }

    return list;
  }, [data, vehicleStatusFilter, vehicleSearch]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    if (!data?.expenses) return [];
    let list = [...data.expenses];

    if (expenseTypeFilter !== 'ALL') {
      list = list.filter(e => e.expenseType === expenseTypeFilter);
    }

    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.amount?.toString().includes(q) ||
        e.vehicle?.make?.toLowerCase().includes(q) ||
        e.vehicle?.model?.toLowerCase().includes(q) ||
        e.vehicle?.registration?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data, expenseTypeFilter, expenseSearch]);

  // Comprehensive Multi-Sheet Excel, PDF, CSV, and Print generator
  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates.');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading(`Generating verified ${format.toUpperCase()} report...`, { id: 'export-report' });

      const result = await getExportData(startDate, endDate);
      if (!result.success) throw new Error(result.error);

      const { transactions, vehicles, accounts, expenses } = result.data;

      const txData = transactions.map((t, idx) => ({
        'Sr. No': idx + 1,
        'Date': new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        'Flow': t.type === 'CREDIT' ? 'MONEY IN (CREDIT)' : 'MONEY OUT (DEBIT)',
        'Mode': t.transactionMode,
        'Amount (₹)': Number(t.amount),
        'Category': t.category?.replace(/_/g, ' ') || 'GENERAL',
        'Account': t.account?.name || 'N/A',
        'Account Type': t.account?.type || 'N/A',
        'Description': t.description || '-',
        'Linked Vehicle': t.vehicle ? `${t.vehicle.make} ${t.vehicle.model} (${t.vehicle.registration || 'Unregistered'})` : '-',
        'Transaction ID': t.id
      }));

      const vData = vehicles.map((v, idx) => {
        const legacyCost = Number(v.legacyExpenses || 0);
        const standardRepairCost = v.expenses?.filter(e => e.expenseType === 'CAR_EXPENSE' && e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const totalRepairCost = standardRepairCost + legacyCost;
        const purchasePrice = Number(v.purchasePrice || 0);
        const totalCost = purchasePrice + totalRepairCost;

        return {
          'Sr. No': idx + 1,
          'Vehicle': `${v.make} ${v.model}`,
          'Registration': v.registration || 'Unregistered',
          'Status': v.status,
          'Purchase Price (₹)': purchasePrice,
          'Total Repairs (₹)': totalRepairCost,
          'Total Investment (₹)': totalCost,
          'Sale Price (₹)': v.status === 'SOLD' ? Number(v.salePrice || 0) : '-',
          'Trading Margin / Profit (₹)': v.status === 'SOLD' && v.profit !== null ? Number(v.profit) : '-',
          'Purchase Date': v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('en-GB') : '-',
          'Sale Date': v.saleDate ? new Date(v.saleDate).toLocaleDateString('en-GB') : '-',
          'Customer Name': v.customerName || '-',
          'Customer Mobile': v.customerMobile || '-'
        };
      });

      const expData = (expenses || []).map((e, idx) => ({
        'Sr. No': idx + 1,
        'Date': new Date(e.date).toLocaleDateString('en-GB'),
        'Expense Type': e.expenseType?.replace(/_/g, ' '),
        'Amount (₹)': Number(e.amount),
        'Description': e.description,
        'Linked Vehicle': e.vehicle ? `${e.vehicle.make} ${e.vehicle.model} (${e.vehicle.registration})` : '-',
        'Status': e.status
      }));

      const accData = accounts.map((a, idx) => ({
        'Sr. No': idx + 1,
        'Account Name': a.name,
        'Type': a.type,
        'Opening Balance (₹)': Number(a.openingBalance || 0),
        'Period Inflow (₹)': Number(a.periodCredit || 0),
        'Period Outflow (₹)': Number(a.periodDebit || 0),
        'Net Movement (₹)': Number(a.periodNet || 0),
        'Period Transactions': Number(a.txCount || 0),
        'Profit Share (%)': Number(a.profitShare || 0)
      }));

      const summaryData = [
        { 'Metric': 'Report Title', 'Details': 'Hariram Cars - Verified Transaction & Audit Statement' },
        { 'Metric': 'Date Range', 'Details': `${startDate} to ${endDate}` },
        { 'Metric': 'Generated At', 'Details': new Date().toLocaleString('en-IN') },
        { 'Metric': 'Total Transactions', 'Details': transactions.length },
        { 'Metric': 'Total Money In (Credits)', 'Details': `₹ ${metrics.totalCredit.toLocaleString('en-IN')}` },
        { 'Metric': 'Total Money Out (Debits)', 'Details': `₹ ${metrics.totalDebit.toLocaleString('en-IN')}` },
        { 'Metric': 'Net Cash Flow', 'Details': `₹ ${metrics.netFlow.toLocaleString('en-IN')}` },
        { 'Metric': 'Cash Inflow / Outflow', 'Details': `+₹ ${metrics.cashCredit.toLocaleString('en-IN')} / -₹ ${metrics.cashDebit.toLocaleString('en-IN')}` },
        { 'Metric': 'Bank Inflow / Outflow', 'Details': `+₹ ${metrics.bankCredit.toLocaleString('en-IN')} / -₹ ${metrics.bankDebit.toLocaleString('en-IN')}` },
        { 'Metric': 'Vehicles Sold in Period', 'Details': metrics.soldVehiclesCount },
        { 'Metric': 'Realized Car Trading Margin', 'Details': `₹ ${metrics.totalTradingProfit.toLocaleString('en-IN')}` },
      ];

      const fileName = `HariramCars_Audit_${startDate}_to_${endDate}`;

      if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Executive Summary");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), "Transactions Register");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vData), "Vehicle Khata");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expData), "Expense Vouchers");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accData), "Accounts Summary");
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

        // Brand Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("HARIRAM CARS - FINANCIAL AUDIT STATEMENT", 14, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Statement Period: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 22);

        // KPI Summary Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 25, 269, 14, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Records: ${transactions.length}`, 18, 33);
        doc.text(`Money In: Rs ${metrics.totalCredit.toLocaleString('en-IN')}`, 70, 33);
        doc.text(`Money Out: Rs ${metrics.totalDebit.toLocaleString('en-IN')}`, 130, 33);
        doc.text(`Net Flow: Rs ${metrics.netFlow.toLocaleString('en-IN')}`, 190, 33);
        doc.text(`Cars Sold Margin: Rs ${metrics.totalTradingProfit.toLocaleString('en-IN')}`, 240, 33);

        // Section 1: Transactions Register
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("1. Transactions Register", 14, 45);

        autoTable(doc, {
          startY: 48,
          head: [['#', 'Date', 'Flow', 'Mode', 'Amount (Rs)', 'Account', 'Category', 'Description', 'Linked Car']],
          body: txData.map(t => [
            t['Sr. No'],
            t['Date'],
            t['Flow'].includes('IN') ? 'IN' : 'OUT',
            t['Mode'],
            t['Amount (₹)'].toLocaleString('en-IN'),
            t['Account'],
            t['Category'],
            t['Description'],
            t['Linked Vehicle']
          ]),
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 7, cellPadding: 2 }
        });

        // Section 2: Vehicles Khata (if any)
        if (vData.length > 0) {
          doc.addPage();
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text("2. Vehicle Khata & Margins", 14, 18);

          autoTable(doc, {
            startY: 23,
            head: [['#', 'Vehicle', 'Reg Plate', 'Status', 'Cost (Rs)', 'Sale Price (Rs)', 'Profit Margin (Rs)', 'Sale Date', 'Customer']],
            body: vData.map(v => [
              v['Sr. No'],
              v['Vehicle'],
              v['Registration'],
              v['Status'],
              typeof v['Total Investment (₹)'] === 'number' ? v['Total Investment (₹)'].toLocaleString('en-IN') : v['Total Investment (₹)'],
              typeof v['Sale Price (₹)'] === 'number' ? v['Sale Price (₹)'].toLocaleString('en-IN') : v['Sale Price (₹)'],
              typeof v['Trading Margin / Profit (₹)'] === 'number' ? v['Trading Margin / Profit (₹)'].toLocaleString('en-IN') : v['Trading Margin / Profit (₹)'],
              v['Sale Date'],
              v['Customer Name']
            ]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
            styles: { fontSize: 7, cellPadding: 2 }
          });
        }

        doc.save(`${fileName}.pdf`);
      }

      toast.success('Report generated & downloaded successfully!', { id: 'export-report' });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to generate report.', { id: 'export-report' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-2 sm:p-6 md:p-8 flex flex-col gap-6 text-slate-900 pb-32">

      {/* 1. TOP BREADCRUMB & EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1.5">
            <Link href="/users" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
              <ArrowLeft size={13} /> Back to Users & Staff
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Transaction Inspector</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Database
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 border border-indigo-500/30 shrink-0">
              <Eye size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 m-0">
                Transaction Inspector & Data Exporter
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 m-0 font-medium mt-0.5">
                Audit, inspect, and verify all live financial entries, vehicle margins, and bank flows prior to export.
              </p>
            </div>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            title="Print or Save as PDF"
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center gap-2 active:scale-98"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print Statement</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !startDate || !endDate}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 active:scale-98"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{isExporting ? 'Generating...' : `Download ${format.toUpperCase()}`}</span>
          </button>
        </div>
      </div>

      {/* 2. DATE FILTER & QUICK PRESETS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">

          {/* Start & End Date Pickers */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Presets & Live Refresh */}
          <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' },
                { id: 'last90', label: '90 Days' },
                { id: 'fullYear', label: 'This Year' },
                { id: 'allTime', label: 'All' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadData(startDate, endDate)}
              disabled={isLoading || !startDate || !endDate}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-2xs"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Scanning...' : 'Refresh Data'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. EXECUTIVE FINANCIAL DASHBOARD CARDS (5 METRICS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">

        {/* Metric 1: Total Volume */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Entries
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {metrics.totalTx}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-2">
            <span>Cash: <strong className="text-slate-700">{data?.transactions?.filter(t => t.transactionMode === 'CASH').length || 0}</strong></span>
            <span>•</span>
            <span>Bank: <strong className="text-slate-700">{data?.transactions?.filter(t => t.transactionMode === 'BANK').length || 0}</strong></span>
          </div>
        </div>

        {/* Metric 2: Money In */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1 flex items-center gap-1">
              <ArrowDownRight size={14} /> Total Inflow
            </span>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
              Credits
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
            +₹{metrics.totalCredit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-medium text-emerald-700/80 mt-1 flex items-center gap-2 truncate">
            <span>Cash: ₹{metrics.cashCredit.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>Bank: ₹{metrics.bankCredit.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Metric 3: Money Out */}
        <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-1 flex items-center gap-1">
              <ArrowUpRight size={14} /> Total Outflow
            </span>
            <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
              Debits
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
            -₹{metrics.totalDebit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-medium text-rose-700/80 mt-1 flex items-center gap-2 truncate">
            <span>Cash: ₹{metrics.cashDebit.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>Bank: ₹{metrics.bankDebit.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Metric 4: Net Cash Flow */}
        <div className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden ${metrics.netFlow >= 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'
          }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Net Cash Flow
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${metrics.netFlow >= 0
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}>
              {metrics.netFlow >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${metrics.netFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
            {metrics.netFlow >= 0 ? '+' : ''}₹{metrics.netFlow.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 truncate">
            Money In minus Money Out
          </div>
        </div>

        {/* Metric 5: Vehicle Sales Trading Profit */}
        <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block mb-1 flex items-center gap-1">
              <Car size={14} /> Car Profit Margin
            </span>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
              {metrics.soldVehiclesCount} Sold
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
            +₹{metrics.totalTradingProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-medium text-indigo-700/80 mt-1 truncate">
            {metrics.soldVehiclesCount} cars sold in this period
          </div>
        </div>

      </div>

      {/* 4. TABS NAVIGATION & MULTI-DIMENSIONAL FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col gap-3">

        {/* Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'TRANSACTIONS', label: 'Transactions Register', count: filteredTransactions.length, total: metrics.totalTx, icon: Layers },
              { id: 'VEHICLES', label: 'Vehicle Khata & Margins', count: filteredVehicles.length, total: metrics.totalVehicles, icon: Car },
              { id: 'EXPENSES', label: 'Daily Expense Vouchers', count: filteredExpenses.length, total: metrics.totalExpenses, icon: Receipt },
              { id: 'ACCOUNTS', label: 'Master Accounts', count: data?.accounts?.length || 0, total: data?.accounts?.length || 0, icon: Landmark },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-bold text-slate-400 hidden lg:block">
            Tip: Click any transaction row to open the complete inspection dossier
          </div>
        </div>

        {/* Filter controls row (Depends on active tab) */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">

            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search description, car, amount..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
              {txSearch && (
                <button
                  onClick={() => setTxSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Flow Filter */}
            <div className="lg:col-span-2">
              <select
                value={txFlowFilter}
                onChange={(e) => setTxFlowFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Flows & Modes</option>
                <option value="CREDIT">Credits Only (Money In)</option>
                <option value="DEBIT">Debits Only (Money Out)</option>
                <option value="CASH">Cash Mode Only</option>
                <option value="BANK">Bank Mode Only</option>
              </select>
            </div>

            {/* Account Filter */}
            <div className="lg:col-span-3">
              <select
                value={txAccountFilter}
                onChange={(e) => setTxAccountFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer truncate"
              >
                <option value="ALL">All Master Accounts</option>
                {accountOptions.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-2">
              <select
                value={txCategoryFilter}
                onChange={(e) => setTxCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="lg:col-span-1">
              <select
                value={txSortBy}
                onChange={(e) => setTxSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="date-desc">Newest</option>
                <option value="date-asc">Oldest</option>
                <option value="amount-desc">Highest ₹</option>
                <option value="amount-asc">Lowest ₹</option>
              </select>
            </div>

          </div>
        )}

        {/* Filter controls for VEHICLES */}
        {activeTab === 'VEHICLES' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Search make, model, registration, buyer..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <select
                value={vehicleStatusFilter}
                onChange={(e) => setVehicleStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Inventory Statuses</option>
                <option value="IN_STOCK">In Stock (Currently in Showroom)</option>
                <option value="SOLD">Sold Cars Only</option>
              </select>
            </div>
          </div>
        )}

        {/* Filter controls for EXPENSES */}
        {activeTab === 'EXPENSES' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Search expense description, vehicle..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <select
                value={expenseTypeFilter}
                onChange={(e) => setExpenseTypeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Expense Types</option>
                <option value="CAR_EXPENSE">Car Repairs & Expenses</option>
                <option value="OFFICE_EXPENSE">Showroom / Office Expenses</option>
              </select>
            </div>
          </div>
        )}

      </div>

      {/* 5. LIVE DATA TABLES */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Loader2 size={36} className="text-indigo-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-slate-800 m-0">Scanning financial records...</h3>
          <p className="text-sm text-slate-500 m-0 mt-1">Retrieving all verified entries between {startDate} and {endDate}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ALL TRANSACTIONS */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Date</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Flow / Mode</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Description</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Master Account</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Linked Vehicle</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Amount</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => handleOpenDossier(t)}
                          className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                        >
                          <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${t.type === 'CREDIT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                {t.type}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                                {t.transactionMode || 'CASH'}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs sm:max-w-sm">
                            <div className="line-clamp-2" title={t.description}>
                              {t.description || '-'}
                            </div>
                            {t.category && (
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">
                                {t.category.replace(/_/g, ' ')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                            <div>{t.account?.name || '-'}</div>
                            {t.account?.type && (
                              <div className="text-[10px] text-slate-400 font-semibold">{t.account.type}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {t.vehicle ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Car size={12} />
                                {t.vehicle.make} {t.vehicle.model} ({t.vehicle.registration})
                              </span>
                            ) : (!t.isOfficeExpense && !t.description?.toLowerCase().includes('(office)') && (t.isCarRepairExpense || t.expenseType === 'CAR_EXPENSE' || (t.expenseId && t.description?.toLowerCase().includes('car repair')))) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDossier(t);
                                  setIsEditingVehicle(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-all shadow-2xs"
                                title="Attach this repair expense to a specific car"
                              >
                                <Car size={11} /> + Attach Car
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                          <td className={`py-3 px-4 text-right font-black whitespace-nowrap text-sm sm:text-base ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            {t.type === 'CREDIT' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDossier(t);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Inspect full details"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          <Layers size={32} className="mx-auto mb-2 text-slate-300" />
                          <div className="font-bold text-slate-600 text-sm">No transactions found matching your criteria</div>
                          <div className="text-xs text-slate-400 mt-1">Try selecting a broader date range or clearing your search filters.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE KHATA & MARGINS */}
          {activeTab === 'VEHICLES' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Vehicle Details</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Purchase & Repairs</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Total Investment</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Sale Details</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVehicles.length > 0 ? (
                      filteredVehicles.map((v) => {
                        const legacyCost = Number(v.legacyExpenses || 0);
                        const standardRepairCost = v.expenses?.filter(e => e.expenseType === 'CAR_EXPENSE' && e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
                        const totalRepairCost = standardRepairCost + legacyCost;
                        const purchasePrice = Number(v.purchasePrice || 0);
                        const totalCost = purchasePrice + totalRepairCost;

                        return (
                          <tr key={v.id} className="hover:bg-slate-50/90 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                <Car size={15} className="text-indigo-600 shrink-0" />
                                {v.make} {v.model}
                              </div>
                              <div className="text-xs font-bold text-slate-500 mt-0.5">
                                {v.registration || 'Unregistered'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${v.status === 'SOLD'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                {v.status === 'SOLD' ? 'SOLD' : 'IN STOCK'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">Bought: ₹{purchasePrice.toLocaleString('en-IN')}</div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                Repairs: ₹{totalRepairCost.toLocaleString('en-IN')}
                              </div>
                              {v.purchaseDate && (
                                <div className="text-[10px] text-slate-400">
                                  {new Date(v.purchaseDate).toLocaleDateString('en-GB')}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                              ₹{totalCost.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4">
                              {v.status === 'SOLD' ? (
                                <>
                                  <div className="font-bold text-slate-900">₹{Number(v.salePrice || 0).toLocaleString('en-IN')}</div>
                                  {v.saleDate && (
                                    <div className="text-[11px] text-slate-400 font-medium">
                                      Sold: {new Date(v.saleDate).toLocaleDateString('en-GB')}
                                    </div>
                                  )}
                                  {v.customerName && (
                                    <div className="text-[10px] text-slate-500 font-semibold truncate max-w-xs">
                                      Buyer: {v.customerName} {v.customerMobile ? `(${v.customerMobile})` : ''}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Showroom Inventory</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-sm sm:text-base">
                              {v.status === 'SOLD' && v.profit !== null ? (
                                <span className={Number(v.profit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {Number(v.profit) >= 0 ? '+' : ''}₹{Number(v.profit).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <Car size={32} className="mx-auto mb-2 text-slate-300" />
                          <div className="font-bold text-slate-600 text-sm">No vehicles found in this period</div>
                          <div className="text-xs text-slate-400 mt-1">Try expanding the date range.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DAILY EXPENSE VOUCHERS */}
          {activeTab === 'EXPENSES' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Date</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Type</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Description</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Linked Car</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                            {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                              {e.expenseType?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{e.description}</td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {e.vehicle ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                <Car size={11} />
                                {e.vehicle.make} {e.vehicle.model} ({e.vehicle.registration})
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${e.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                              }`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 text-sm sm:text-base">
                            ₹{Number(e.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
                          <div className="font-bold text-slate-600 text-sm">No expense vouchers found in this date range</div>
                          <div className="text-xs text-slate-400 mt-1">Try expanding the date range.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MASTER ACCOUNTS SUMMARY */}
          {activeTab === 'ACCOUNTS' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Account Name</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Type</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Opening Balance</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Period Inflow (+)</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Period Outflow (-)</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Net Movement</th>
                      <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Profit Share (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.accounts && data.accounts.length > 0 ? (
                      data.accounts.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <Landmark size={15} className="text-indigo-600" />
                            {a.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                              {a.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            ₹{Number(a.openingBalance || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">
                            +₹{Number(a.periodCredit || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-rose-600">
                            -₹{Number(a.periodDebit || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-black">
                            <span className={Number(a.periodNet || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {Number(a.periodNet || 0) >= 0 ? '+' : ''}₹{Number(a.periodNet || 0).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-indigo-600">
                            {Number(a.profitShare || 0)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          No accounts registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. TRANSACTION INSPECTION MODAL (FULL DOSSIER) */}
      {inspectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Transaction Dossier
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2 m-0 flex items-center gap-2">
                  <span>₹{Number(inspectingTx.amount).toLocaleString('en-IN')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-black ${inspectingTx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                    {inspectingTx.type === 'CREDIT' ? 'MONEY IN (CREDIT)' : 'MONEY OUT (DEBIT)'}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setInspectingTx(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-4 text-xs sm:text-sm">

              {/* Date & Mode Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Transaction Date</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {new Date(inspectingTx.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Payment Mode</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {inspectingTx.transactionMode || 'CASH'}
                  </div>
                </div>
              </div>

              {/* Master Account */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Master Account / Party</div>
                <div className="font-black text-slate-900 text-base mt-0.5 flex items-center justify-between">
                  <span>{inspectingTx.account?.name || 'N/A'}</span>
                  {inspectingTx.account?.type && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                      {inspectingTx.account.type}
                    </span>
                  )}
                </div>
                {inspectingTx.account?.openingBalance && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Opening Balance: ₹{Number(inspectingTx.account.openingBalance).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Description & Remarks</div>
                <div className="font-semibold text-slate-900 mt-1 leading-relaxed">
                  {inspectingTx.description || 'No description recorded'}
                </div>
                {inspectingTx.category && (
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                      Category: {inspectingTx.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Linked Vehicle / Expense Vehicle Linker */}
              {(!inspectingTx.isOfficeExpense && !inspectingTx.description?.toLowerCase().includes('(office)') && (inspectingTx.isCarRepairExpense || inspectingTx.expenseType === 'CAR_EXPENSE' || (inspectingTx.expenseId && inspectingTx.description?.toLowerCase().includes('car repair')))) ? (
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <Car size={14} /> Car Expense Link
                    </span>
                    {!isEditingVehicle && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId(inspectingTx.vehicle?.id || '');
                          setIsEditingVehicle(true);
                        }}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs"
                      >
                        {inspectingTx.vehicle ? 'Change Attached Car' : '+ Attach Car'}
                      </button>
                    )}
                  </div>

                  {isEditingVehicle ? (
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-3">
                      <div className="text-xs font-bold text-slate-700">
                        Select vehicle to link with this expense transaction:
                      </div>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">-- No Vehicle (General Office Expense) --</option>
                        {(data.allVehicles || []).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.make} {v.model} ({v.registration || 'No Reg'}) [{v.status}]
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isAttachingVehicle}
                          onClick={() => setIsEditingVehicle(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isAttachingVehicle}
                          onClick={async () => {
                            setIsAttachingVehicle(true);
                            try {
                              const res = await attachVehicleToExpense(inspectingTx.expenseId, selectedVehicleId || null);
                              if (res.success) {
                                toast.success(selectedVehicleId ? 'Vehicle linked to expense successfully!' : 'Vehicle unlinked');
                                const newVehicle = (data.allVehicles || []).find(v => v.id === selectedVehicleId) || null;
                                const cleanBase = (inspectingTx.description || '').replace(/^Auto-Entry\s*(\([^)]*\))?:\s*/, '').replace(/\s*-\s*[A-Z0-9\s]+(\([A-Z0-9\s]+\))?$/, '');
                                const carPrefix = selectedVehicleId ? 'Car Repair' : (inspectingTx.category === 'EXPENSE' ? 'Car Repair' : 'Office');
                                const vehicleSuffix = newVehicle ? ` - ${newVehicle.make} ${newVehicle.model} (${newVehicle.registration || 'Unregistered'})` : '';
                                const newDesc = `Auto-Entry (${carPrefix}): ${cleanBase}${vehicleSuffix}`;

                                setInspectingTx(prev => ({
                                  ...prev,
                                  vehicle: newVehicle,
                                  description: newDesc
                                }));

                                setData(prev => ({
                                  ...prev,
                                  transactions: (prev.transactions || []).map(t =>
                                    t.id === inspectingTx.id
                                      ? { ...t, vehicle: newVehicle, description: newDesc }
                                      : t
                                  )
                                }));
                                setIsEditingVehicle(false);
                              } else {
                                toast.error(res.error || 'Failed to attach vehicle');
                              }
                            } catch (err) {
                              console.error(err);
                              toast.error('Error attaching vehicle');
                            } finally {
                              setIsAttachingVehicle(false);
                            }
                          }}
                          className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {isAttachingVehicle ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          <span>Save Link</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {inspectingTx.vehicle ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-base font-black text-slate-900">
                              {inspectingTx.vehicle.make} {inspectingTx.vehicle.model}
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                              {inspectingTx.vehicle.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-600">
                            Registration: <strong className="text-indigo-900">{inspectingTx.vehicle.registration || 'Unregistered'}</strong>
                          </div>
                          <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Vehicle Khata Link:</span>
                            <Link
                              href="/inventory"
                              className="font-bold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1"
                            >
                              Open Vehicle Khata <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                          <span>No vehicle attached to this expense yet.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVehicleId('');
                              setIsEditingVehicle(true);
                            }}
                            className="text-indigo-600 font-bold hover:underline"
                          >
                            + Link to a car
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                inspectingTx.vehicle && (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <Car size={14} /> Linked Vehicle
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                        {inspectingTx.vehicle.status}
                      </span>
                    </div>

                    <div className="text-base font-black text-slate-900">
                      {inspectingTx.vehicle.make} {inspectingTx.vehicle.model}
                    </div>
                    <div className="text-xs font-bold text-slate-600">
                      Registration: <strong className="text-indigo-900">{inspectingTx.vehicle.registration || 'Unregistered'}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-100/80 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Purchase Cost:</span>
                        <strong className="text-slate-800">₹{Number(inspectingTx.vehicle.purchasePrice || 0).toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Sale Price:</span>
                        <strong className="text-slate-800">
                          {inspectingTx.vehicle.salePrice ? `₹${Number(inspectingTx.vehicle.salePrice).toLocaleString('en-IN')}` : 'In Stock'}
                        </strong>
                      </div>
                    </div>

                    {inspectingTx.vehicle.profit !== null && inspectingTx.vehicle.profit !== undefined && (
                      <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Realized Trading Margin:</span>
                        <span className={`font-black ${Number(inspectingTx.vehicle.profit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {Number(inspectingTx.vehicle.profit) >= 0 ? '+' : ''}₹{Number(inspectingTx.vehicle.profit).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {inspectingTx.vehicle.customerName && (
                      <div className="text-[11px] text-slate-600 pt-1">
                        Buyer: <strong className="text-slate-800">{inspectingTx.vehicle.customerName}</strong> {inspectingTx.vehicle.customerMobile ? `(${inspectingTx.vehicle.customerMobile})` : ''}
                      </div>
                    )}

                    <div className="pt-2">
                      <Link
                        href="/inventory"
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1"
                      >
                        Open Vehicle Khata <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                )
              )}

              {/* Audit Meta */}
              <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                <div>System Transaction ID: <code className="text-slate-500 select-all font-mono">{inspectingTx.id}</code></div>
                {inspectingTx.referenceId && (
                  <div>Reference ID: <code className="text-slate-500 select-all font-mono">{inspectingTx.referenceId}</code></div>
                )}
                <div>Created Timestamp: {new Date(inspectingTx.createdAt).toLocaleString('en-IN')}</div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. FLOATING BOTTOM EXPORT CONTROL BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Format selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline-block">Format:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet, active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                { id: 'pdf', label: 'PDF (.pdf)', icon: FileText, active: 'border-rose-500 bg-rose-50 text-rose-700' },
                { id: 'csv', label: 'CSV (.csv)', icon: FileDown, active: 'border-indigo-500 bg-indigo-50 text-indigo-700' }
              ].map(f => {
                const Icon = f.icon;
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${isSelected
                        ? `${f.active} shadow-xs ring-2 ring-indigo-500/20`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <Icon size={14} />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline-block">
              Ready to export <strong className="text-slate-900">{metrics.totalTx}</strong> entries & <strong className="text-slate-900">{metrics.totalVehicles}</strong> vehicles
            </span>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || !startDate || !endDate}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isExporting ? 'Generating Report...' : `Generate & Download (${format.toUpperCase()})`}</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}

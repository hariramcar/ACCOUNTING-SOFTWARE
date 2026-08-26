'use client';

import { useState } from 'react';
import { X, FileSpreadsheet, FileText, FileDown, Calendar, Check, Loader2 } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates.');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading(`Generating premium ${format.toUpperCase()} report...`, { id: 'export-premium' });

      const result = await getExportData(startDate, endDate);
      if (!result.success) throw new Error(result.error);
      
      const { transactions, vehicles, accounts } = result.data;
      
      // Formatting Data for Excel/PDF (Disaster Recovery Ready)
      const txData = transactions.map(t => {
        const v = t.referenceId ? vehicles.find(veh => veh.id === t.referenceId) : null;
        return {
          ID: t.id,
          'Transaction Date (Precise)': new Date(t.date).toISOString(),
          Amount: Number(t.amount),
          Type: t.type,
          Mode: t.transactionMode,
          Category: t.category,
          Description: t.description || '-',
          'Account Name': t.account?.name || 'N/A',
          AccountID_RAW: t.accountId,
          'Vehicle/Ref Name': v ? `${v.make} ${v.model} (${v.registration || 'Unregistered'})` : '-',
          ReferenceID_RAW: t.referenceId || '',
          'Created At (Precise)': new Date(t.createdAt).toISOString()
        };
      });

      const vData = vehicles.map(v => {
        const repairCost = v.expenses?.filter(e => e.expenseType === 'CAR_EXPENSE' && e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        return {
          ID: v.id,
          Make: v.make,
          Model: v.model,
          Registration: v.registration || '-',
          Status: v.status,
          'Purchase Price': Number(v.purchasePrice || 0),
          'Repair Cost': repairCost,
          'Sale Price': Number(v.salePrice || 0),
          Profit: Number(v.profit || 0),
          'Purchase Date (Precise)': v.purchaseDate ? new Date(v.purchaseDate).toISOString() : '',
          'Sale Date (Precise)': v.saleDate ? new Date(v.saleDate).toISOString() : '',
          'Created At (Precise)': new Date(v.createdAt).toISOString(),
          PayableAccountID_RAW: v.payableAccountId || '',
          ReceivableAccountID_RAW: v.receivableAccountId || ''
        };
      });

      const accData = accounts.map(a => ({
        ID: a.id,
        Name: a.name,
        Type: a.type,
        'Opening Balance': Number(a.openingBalance),
        'Profit Share %': Number(a.profitShare || 0),
        'Created At (Precise)': new Date(a.createdAt).toISOString()
      }));

      const fileName = `HariramCars_Report_${startDate}_to_${endDate}`;

      if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), "Transactions");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vData), "Inventory");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accData), "Accounts");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        
      } else if (format === 'csv') {
        const txSheet = XLSX.utils.json_to_sheet(txData);
        const csvString = XLSX.utils.sheet_to_csv(txSheet);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.csv`;
        link.click();
        
      } else if (format === 'pdf') {
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(20);
        doc.text("Hariram Cars - Master Financial Report", 14, 20);
        
        doc.setFontSize(11);
        doc.text(`Reporting Period: ${startDate} to ${endDate}`, 14, 28);
        
        doc.setFontSize(14);
        doc.text("Transactions Ledger", 14, 40);
        
        autoTable(doc, {
          startY: 45,
          head: [['Date', 'Amount', 'Type', 'Mode', 'Category', 'Account', 'Description']],
          body: txData.map(t => [
            new Date(t['Transaction Date (Precise)']).toLocaleString('en-IN'), 
            `Rs ${t.Amount}`, 
            t.Type, 
            t.Mode, 
            t.Category, 
            t['Account Name'], 
            t.Description
          ]),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 8 }
        });
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Vehicle Inventory & Sales", 14, 20);
        
        autoTable(doc, {
          startY: 25,
          head: [['Make', 'Model', 'Reg', 'Status', 'Cost', 'Repair', 'Sale', 'Profit', 'Purchase Dt', 'Sale Dt']],
          body: vData.map(v => [
            v.Make, 
            v.Model, 
            v.Registration, 
            v.Status, 
            `Rs ${v['Purchase Price']}`, 
            `Rs ${v['Repair Cost']}`, 
            `Rs ${v['Sale Price']}`, 
            `Rs ${v.Profit}`, 
            v['Purchase Date (Precise)'] ? new Date(v['Purchase Date (Precise)']).toLocaleDateString('en-IN') : '-', 
            v['Sale Date (Precise)'] ? new Date(v['Sale Date (Precise)']).toLocaleDateString('en-IN') : '-'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8 }
        });

        doc.save(`${fileName}.pdf`);
      }

      toast.success('Premium report downloaded successfully!', { id: 'export-premium' });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to generate report.', { id: 'export-premium' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col border border-slate-200">
        <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">Export Data</h2>
            <p className="text-sm font-medium text-slate-500 m-0">Generate a premium multi-format report.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 flex flex-col gap-6 bg-white">
          
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-widest font-black text-slate-400">Date Range (Required)</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm"
                />
              </div>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-widest font-black text-slate-400">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${format === 'excel' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <div className={`p-2 rounded-xl ${format === 'excel' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100'}`}>
                  <FileSpreadsheet size={24} />
                </div>
                <span className="font-bold text-xs">Excel</span>
              </button>

              <button 
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${format === 'pdf' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <div className={`p-2 rounded-xl ${format === 'pdf' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100'}`}>
                  <FileText size={24} />
                </div>
                <span className="font-bold text-xs">PDF</span>
              </button>

              <button 
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${format === 'csv' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <div className={`p-2 rounded-xl ${format === 'csv' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100'}`}>
                  <FileDown size={24} />
                </div>
                <span className="font-bold text-xs">CSV</span>
              </button>
            </div>
          </div>

          <button 
            onClick={handleExport}
            disabled={isExporting || !startDate || !endDate}
            className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            {isExporting ? 'Generating Report...' : 'Generate & Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

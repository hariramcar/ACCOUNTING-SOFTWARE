import fs from 'fs';
import path from 'path';

const ledgerTabsPath = 'e:\\hariram motor\\accouting\\software\\src\\app\\history\\LedgerTabs.js';
let content = fs.readFileSync(ledgerTabsPath, 'utf8');

// 1. Add Pagination State
if (!content.includes('const [page, setPage]')) {
  content = content.replace(
    'const [filterType, setFilterType] = useState(\'ALL\');',
    `const [filterType, setFilterType] = useState('ALL');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Reset page on filter or tab change
  useMemo(() => {
    setPage(1);
  }, [activeTab, filterType, searchQuery]);`
  );
}

// 2. Paginate Data
if (!content.includes('const paginatedIncome =')) {
  content = content.replace(
    'const totalIncome = filteredIncome',
    `const paginatedIncome = filteredIncome.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const paginatedExpenses = filteredExpenses.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPagesIncome = Math.ceil((filteredIncome?.length || 0) / ITEMS_PER_PAGE);
  const totalPagesExpenses = Math.ceil((filteredExpenses?.length || 0) / ITEMS_PER_PAGE);

  const totalIncome = filteredIncome`
  );
}

// 3. Replace map iterators for Income
content = content.replace(/filteredIncome\.reduce\(\(acc, inc\)/g, 'paginatedIncome.reduce((acc, inc)');
content = content.replace(/filteredIncome\?\.map\(\(inc\)/g, 'paginatedIncome?.map(inc');

// 4. Replace map iterators for Expenses
content = content.replace(/filteredExpenses\.reduce\(\(acc, exp\)/g, 'paginatedExpenses.reduce((acc, exp)');
content = content.replace(/filteredExpenses\?\.map\(\(exp\)/g, 'paginatedExpenses?.map(exp');

// 5. Add Pagination UI Controls
const paginationUI = (tab) => `
  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 mt-4 shadow-sm">
    <button 
      onClick={() => setPage(p => Math.max(1, p - 1))}
      disabled={page === 1}
      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-50"
    >
      Previous
    </button>
    <span className="text-sm font-bold text-slate-500">
      Page {page} of {totalPages${tab}}
    </span>
    <button 
      onClick={() => setPage(p => Math.min(totalPages${tab}, p + 1))}
      disabled={page === totalPages${tab} || totalPages${tab} === 0}
      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-50"
    >
      Next
    </button>
  </div>
`;

if (!content.includes('Page {page} of {totalPagesIncome}')) {
  content = content.replace(
    '{(!filteredIncome || filteredIncome.length === 0) && (',
    paginationUI('Income') + '\n            {(!filteredIncome || filteredIncome.length === 0) && ('
  );
}

if (!content.includes('Page {page} of {totalPagesExpenses}')) {
  content = content.replace(
    '{(!filteredExpenses || filteredExpenses.length === 0) && (',
    paginationUI('Expenses') + '\n            {(!filteredExpenses || filteredExpenses.length === 0) && ('
  );
}

fs.writeFileSync(ledgerTabsPath, content);
console.log('Pagination applied to LedgerTabs.js');

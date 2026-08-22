import fs from 'fs';

function paginateFile(filePath, arrayVarName) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('const [page, setPage] = useState(1);')) {
    content = content.replace(
      'const [selectedCar, setSelectedCar] = useState(null);',
      `const [selectedCar, setSelectedCar] = useState(null);\n  const [page, setPage] = useState(1);\n  const ITEMS_PER_PAGE = 50;`
    );
  }

  // Find where it maps over the arrayVarName
  const regex = new RegExp(arrayVarName + '\\?\\.map', 'g');
  if (content.match(regex)) {
    content = content.replace(
      'return (',
      `const paginatedData = ${arrayVarName}?.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);\n  const totalPages = Math.ceil((${arrayVarName}?.length || 0) / ITEMS_PER_PAGE);\n\n  return (`
    );
    
    content = content.replace(regex, 'paginatedData?.map');
    
    // Add pagination controls before the last closing div
    const paginationUI = `
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 mt-4 shadow-sm w-full">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm font-bold text-slate-500">
          Page {page} of {totalPages}
        </span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>
    `;

    // A hacky way to inject at the end before closing div of the main container wrapper
    // We'll replace the last '</div>\n    </div>' with '</div>' + paginationUI + '</div>'
    // Let's just find the last </div>
    const lastDivIndex = content.lastIndexOf('</div>');
    if (lastDivIndex !== -1 && !content.includes('Page {page} of {totalPages}')) {
       content = content.substring(0, lastDivIndex) + paginationUI + content.substring(lastDivIndex);
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Paginated', filePath);
  }
}

paginateFile('e:\\hariram motor\\accouting\\software\\src\\app\\inventory\\SoldHistoryClientList.js', 'sold');
// For InventoryClientList, the variable is 'filteredStock'
paginateFile('e:\\hariram motor\\accouting\\software\\src\\app\\inventory\\InventoryClientList.js', 'filteredStock');

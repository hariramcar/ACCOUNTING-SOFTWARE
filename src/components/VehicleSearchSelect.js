'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function VehicleSearchSelect({ 
  vehicles, 
  value, 
  onChange, 
  name = "vehicleId", 
  placeholder = "Select a Car...", 
  required = false,
  className = "",
  showCost = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [internalValue, setInternalValue] = useState(value || '');
  const wrapperRef = useRef(null);
  
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedVehicle = vehicles.find(v => v.id === currentValue);

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(v => {
    const searchTerm = search.toLowerCase();
    const make = (v.make || '').toLowerCase();
    const model = (v.model || '').toLowerCase();
    const reg = (v.registration || '').toLowerCase();
    return make.includes(searchTerm) || model.includes(searchTerm) || reg.includes(searchTerm);
  });

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={currentValue || ''} required={required} />
      
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left outline-none ${className || `p-2.5 rounded-lg border bg-white text-sm font-medium transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${currentValue ? 'border-indigo-200 text-slate-900' : 'border-slate-200 text-slate-500'}`}`}
      >
        <span className="truncate">
          {selectedVehicle 
            ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.registration ? `(${selectedVehicle.registration})` : '(UNREGISTERED)'} ${selectedVehicle.status === 'SOLD' ? ' - SOLD' : ''} ${showCost && selectedVehicle.totalCost ? `- Cost: ₹${selectedVehicle.totalCost.toLocaleString('en-IN')}` : ''}`
            : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by make, model, or number..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none text-slate-700 bg-transparent"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {!required && (
              <button
                type="button"
                onClick={() => {
                  if (!isControlled) setInternalValue('');
                  if (onChange) onChange('');
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors text-slate-500 hover:bg-slate-50 italic border-b border-slate-50`}
              >
                -- No Specific Vehicle --
              </button>
            )}
            
            {filteredVehicles.length === 0 ? (
              <div className="p-3 text-sm text-center text-slate-500 italic">No cars found.</div>
            ) : (
              filteredVehicles.map(v => {
                const isSelected = currentValue === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      if (!isControlled) setInternalValue(v.id);
                      if (onChange) onChange(v.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className="flex flex-col">
                      <span>
                        {v.make} {v.model} <span className={`text-xs ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>({v.registration || 'UNREGISTERED'})</span>
                        {v.status === 'SOLD' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold">SOLD</span>}
                      </span>
                      {showCost && v.totalCost && (
                        <span className="text-[10px] text-emerald-600 mt-0.5 font-bold uppercase tracking-wider">Total Cost: ₹{v.totalCost.toLocaleString('en-IN')}</span>
                      )}
                    </span>
                    {isSelected && <Check size={16} className="shrink-0 ml-2" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export default function IndianNumberInput({ name, required, placeholder, defaultValue, className, step }) {
  const [displayValue, setDisplayValue] = useState('');
  const [rawValue, setRawValue] = useState(defaultValue || '');

  // Format initial value if provided
  useEffect(() => {
    if (defaultValue) {
      formatAndSet(String(defaultValue));
    }
  }, [defaultValue]);

  const formatAndSet = (val) => {
    // Remove all non-numeric characters except decimal point
    let numericString = val.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericString.split('.');
    if (parts.length > 2) {
      numericString = parts[0] + '.' + parts.slice(1).join('');
    }

    setRawValue(numericString);

    if (!numericString) {
      setDisplayValue('');
      return;
    }

    // Format according to Indian number system (en-IN)
    if (parts.length === 2) {
      // Has decimal
      const formattedInt = Number(parts[0]).toLocaleString('en-IN');
      setDisplayValue(`${formattedInt}.${parts[1]}`);
    } else {
      const formatted = Number(numericString).toLocaleString('en-IN');
      setDisplayValue(formatted !== 'NaN' ? formatted : '');
    }
  };

  const handleChange = (e) => {
    formatAndSet(e.target.value);
  };

  return (
    <>
      <input 
        type="text" 
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={className}
      />
      <input 
        type="hidden" 
        name={name} 
        value={rawValue} 
        step={step}
      />
    </>
  );
}

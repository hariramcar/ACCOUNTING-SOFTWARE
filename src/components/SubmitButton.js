'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, pendingText, className, disabled, ...props }) {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending || disabled}
      className={`${className} ${pending ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {pending ? (pendingText || children) : children}
    </button>
  );
}

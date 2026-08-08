'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { logout } from '@/actions/auth';
import GlobalMonthSelector from './GlobalMonthSelector';
import {
  LayoutDashboard,
  Car,
  Receipt,
  Landmark,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  ChevronRight,
  BookOpen,
  X
} from 'lucide-react';

export default function Sidebar({ session }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef(null);

  const navItems = [
    { name: 'Profit Dashboard', path: '/profit', icon: <LayoutDashboard size={20} />, role: 'ADMIN' },
    { name: 'Vehicle Khata', path: '/inventory', icon: <Car size={20} />, role: 'ADMIN' },
    { name: 'Ledger History', path: '/history', icon: <BookOpen size={20} />, role: 'ADMIN' },
    { name: 'My Monthly Ledger', path: '/staff-ledger', icon: <BookOpen size={20} />, role: 'STAFF' },
    { name: 'Daily Expenses', path: '/expenses', icon: <Receipt size={20} /> },
    { name: 'Master Capital', path: '/accounts', icon: <Landmark size={20} />, role: 'ADMIN' },
    { name: 'Users & Staff', path: '/users', icon: <ShieldCheck size={20} />, role: 'ADMIN' },
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    }
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  if (pathname === '/login' || pathname === '/setup' || pathname.startsWith('/store')) {
    return null;
  }

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-950 text-white px-4 py-3 shrink-0 z-40 relative shadow-md">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Car size={16} className="text-white" />
          </div>
          HARIRAM
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-300 hover:text-white p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Overlay for mobile */}
      {isExpanded && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        ref={sidebarRef}
        className={`
          fixed md:relative inset-y-0 left-0 z-50 flex flex-col bg-slate-950 text-slate-300 border-r border-slate-800 shadow-2xl flex-shrink-0 transition-all duration-300 ease-in-out h-full
          ${isExpanded
            ? 'translate-x-0 w-64 px-4 py-6'
            : '-translate-x-full md:translate-x-0 md:w-20 md:px-3 w-64 px-4 py-6'
          }
        `}
      >
        <div
          className="hidden md:flex items-center justify-center w-full mb-8 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? (
            <div className="w-[160px] h-[40px] relative transition-opacity duration-300">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Car size={18} className="text-white" />
                </div>
                HARIRAM
              </div>
            </div>
          ) : (
            <button className="flex items-center justify-center w-10 h-10 bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors border border-slate-700/50">
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* Mobile Sidebar Close Button */}
        <div className="md:hidden flex justify-between items-center mb-8 px-1">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Car size={18} className="text-white" />
            </div>
            HARIRAM
          </div>
          <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2 hidden md:block">
          {isExpanded ? 'Menu' : ' '}
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2 md:hidden">
          Menu
        </div>

        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.filter(item => !item.role || item.role === session?.role).map((item) => {
            const isActive = pathname === item.path;
            const showExpandedStyle = isExpanded || false; // always expanded on mobile
            return (
              <Link
                key={item.path}
                href={item.path}
                title={item.name}
                onClick={() => { if (window.innerWidth < 768) setIsExpanded(false); }}
                className={`group flex items-center gap-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${showExpandedStyle ? 'px-3 justify-start' : 'px-0 justify-center'} ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors`}>
                  {item.icon}
                </div>
                {/* On mobile, text is always visible since it's always expanded (w-64) */}
                <span className={`whitespace-nowrap text-sm flex-1 ${!isExpanded ? 'md:hidden' : ''}`}>{item.name}</span>
                {showExpandedStyle && isActive && <ChevronRight size={16} className="text-indigo-300 hidden md:block" />}
              </Link>
            );
          })}
        </nav>

        <GlobalMonthSelector isExpanded={isExpanded} />

        {/* User Info / Settings Footer */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${isExpanded ? 'px-3 py-2 justify-start' : 'md:p-0 md:justify-center px-3 py-2'}`}>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex-shrink-0 text-sm">
              {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {/* On mobile, name is always visible since drawer is always wide */}
            <div className={`overflow-hidden flex-1 ${!isExpanded ? 'md:hidden' : ''}`}>
              <div className="text-sm font-bold text-slate-200 truncate">{session?.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{session?.role}</div>
            </div>
          </div>
          <form action={logout} className={`mt-3 ${isExpanded ? 'px-3' : 'md:p-0 px-3'}`}>
            <button type="submit" title="Logout" className={`w-full flex items-center justify-center gap-2 text-slate-400 border border-transparent p-2 rounded-lg font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-sm ${isExpanded ? '' : 'md:aspect-square'}`}>
              <LogOut size={18} />
              <span className={`${!isExpanded ? 'md:hidden' : ''}`}>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

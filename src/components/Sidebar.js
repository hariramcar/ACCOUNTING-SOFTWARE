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
      {/* Mobile Bottom Navigation */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 px-2 pt-2 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        {navItems.filter(item => !item.role || item.role === session?.role).slice(0, 4).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsExpanded(false)}
              className={`flex flex-col items-center justify-center w-16 py-1 gap-1 rounded-xl transition-all ${
                isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className={`p-1.5 rounded-full ${isActive ? 'bg-indigo-50' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                {item.name.split(' ')[0]}
              </span>
            </Link>
          );
        })}

        {/* 'More' Button for Mobile */}
        {navItems.filter(item => !item.role || item.role === session?.role).length > 4 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex flex-col items-center justify-center w-16 py-1 gap-1 rounded-xl transition-all ${
              isExpanded ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-full ${isExpanded ? 'bg-indigo-50' : ''}`}>
              <Menu size={20} />
            </div>
            <span className={`text-[10px] font-bold tracking-tight ${isExpanded ? 'text-indigo-600' : 'text-slate-500'}`}>
              More
            </span>
          </button>
        )}
      </nav>

      {/* Mobile 'More' Sheet */}
      {isExpanded && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsExpanded(false)} />
          <div className="bg-slate-50 rounded-t-[2.5rem] p-6 pb-28 relative z-50 animate-in slide-in-from-bottom-full duration-300 shadow-2xl border-t border-slate-200">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6"></div>
            
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg m-0 leading-tight">{session?.name}</h3>
                <p className="text-xs uppercase tracking-widest text-slate-500 font-bold m-0">{session?.role}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {navItems.filter(item => !item.role || item.role === session?.role).slice(4).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm hover:shadow-md border border-slate-100 text-slate-700 font-semibold transition-all active:scale-95"
                >
                  <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                    {item.icon}
                  </div>
                  {item.name}
                  <ChevronRight size={18} className="ml-auto text-slate-300" />
                </Link>
              ))}
              
              <div className="h-px bg-slate-200 my-3 mx-2"></div>
              
              <GlobalMonthSelector isExpanded={true} />
              
              <form action={logout} className="mt-2">
                <button type="submit" className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-all active:scale-95">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm text-red-600">
                    <LogOut size={20} />
                  </div>
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          hidden md:flex flex-col bg-slate-950 text-slate-300 border-r border-slate-800 shadow-2xl flex-shrink-0 transition-all duration-300 ease-in-out h-full relative z-50
          ${isExpanded ? 'w-64 px-4 py-6' : 'w-20 px-3 py-6'}
        `}
      >
        <div
          className="flex items-center justify-center w-full mb-8 cursor-pointer"
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

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">
          {isExpanded ? 'Menu' : ' '}
        </div>

        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.filter(item => !item.role || item.role === session?.role).map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                title={item.name}
                className={`group flex items-center gap-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${isExpanded ? 'px-3 justify-start' : 'px-0 justify-center'} ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors`}>
                  {item.icon}
                </div>
                <span className={`whitespace-nowrap text-sm flex-1 ${!isExpanded ? 'hidden' : ''}`}>{item.name}</span>
                {isExpanded && isActive && <ChevronRight size={16} className="text-indigo-300" />}
              </Link>
            );
          })}
        </nav>

        <GlobalMonthSelector isExpanded={isExpanded} />

        {/* User Info / Settings Footer */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${isExpanded ? 'px-3 py-2 justify-start' : 'p-0 justify-center'}`}>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex-shrink-0 text-sm">
              {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={`overflow-hidden flex-1 ${!isExpanded ? 'hidden' : ''}`}>
              <div className="text-sm font-bold text-slate-200 truncate">{session?.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{session?.role}</div>
            </div>
          </div>
          <form action={logout} className={`mt-3 ${isExpanded ? 'px-3' : 'p-0'}`}>
            <button type="submit" title="Logout" className={`w-full flex items-center justify-center gap-2 text-slate-400 border border-transparent p-2 rounded-lg font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-sm ${isExpanded ? '' : 'aspect-square'}`}>
              <LogOut size={18} />
              <span className={`${!isExpanded ? 'hidden' : ''}`}>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

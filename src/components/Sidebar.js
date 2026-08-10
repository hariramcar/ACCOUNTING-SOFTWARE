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
    { name: 'Daily Expenses', path: '/expenses', icon: <Receipt size={20} /> },
    { name: 'Vehicle Khata', path: '/inventory', icon: <Car size={20} />, role: 'ADMIN' },
    { name: 'Ledger History', path: '/history', icon: <BookOpen size={20} />, role: 'ADMIN' },
    { name: 'Ledger', path: '/staff-ledger', icon: <BookOpen size={20} />, role: 'STAFF' },
    { name: 'Master Capital', path: '/accounts', icon: <Landmark size={20} />, role: 'ADMIN' },
    { name: 'Profit Dashboard', path: '/profit', icon: <LayoutDashboard size={20} />, role: 'ADMIN' },
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

  const allowedNavItems = navItems.filter(item => !item.role || item.role === session?.role);

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {session?.role === 'STAFF' ? (
          <nav className="bg-white/90 backdrop-blur-xl border border-slate-200 w-full rounded-2xl h-[4.5rem] flex justify-around items-center shadow-[0_8px_30px_rgb(0,0,0,0.08)] pointer-events-auto px-2 relative">
            {[
              { name: 'Daily', path: '/expenses', icon: <Receipt size={22} strokeWidth={2.5} /> },
              { name: 'Ledger', path: '/staff-ledger', icon: <BookOpen size={22} strokeWidth={2.5} /> }
            ].map(item => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsExpanded(false)}
                  className="flex flex-col items-center justify-center flex-1 h-full relative group gap-1"
                >
                  <div className={`transition-all duration-300 flex items-center justify-center rounded-xl p-2.5 ${isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600'
                    }`}>
                    {item.icon}
                  </div>
                  <span className={`text-[11px] font-bold tracking-wide transition-all duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-500'
                    }`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}

            {/* Profile Button for Staff */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex flex-col items-center justify-center flex-1 h-full relative group gap-1"
            >
              <div className={`transition-all duration-300 flex items-center justify-center rounded-xl p-2.5 ${isExpanded
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600'
                }`}>
                <div className="w-[22px] h-[22px] rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <span className={`text-[11px] font-bold tracking-wide transition-all duration-300 ${isExpanded ? 'text-indigo-600' : 'text-slate-500'
                }`}>
                Profile
              </span>
            </button>
          </nav>
        ) : (
          <nav className="bg-slate-950/95 backdrop-blur-xl border border-slate-800 w-full rounded-[2rem] h-[4.25rem] flex justify-around items-center shadow-2xl shadow-slate-900/50 pointer-events-auto px-1 relative">
            {allowedNavItems.slice(0, 4).map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsExpanded(false)}
                  className="flex flex-col items-center justify-center flex-1 h-full relative group"
                >
                  <div className={`absolute transition-all duration-300 flex items-center justify-center ${isActive
                      ? '-top-6 w-14 h-14 bg-slate-950 rounded-full border-[6px] border-slate-50 text-indigo-400 shadow-inner'
                      : 'top-3 text-slate-400 group-hover:text-slate-300 w-8 h-8'
                    }`}>
                    {item.icon}
                  </div>
                  <span className={`absolute bottom-2.5 text-[9px] font-bold tracking-widest uppercase transition-all duration-300 ${isActive ? 'text-indigo-400' : 'text-slate-300'
                    }`}>
                    {item.name.split(' ')[0]}
                  </span>
                </Link>
              );
            })}

            {/* 'More' Button for Mobile */}
            {allowedNavItems.length > 4 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex flex-col items-center justify-center flex-1 h-full relative group"
              >
                <div className={`absolute transition-all duration-300 flex items-center justify-center ${isExpanded
                    ? '-top-6 w-14 h-14 bg-slate-950 rounded-full border-[6px] border-slate-50 text-indigo-400 shadow-inner'
                    : 'top-3 text-slate-400 group-hover:text-slate-300 w-8 h-8'
                  }`}>
                  <Menu size={20} />
                </div>
                <span className={`absolute bottom-2.5 text-[9px] font-bold tracking-widest uppercase transition-all duration-300 ${isExpanded ? 'text-indigo-400' : 'text-slate-300'
                  }`}>
                  More
                </span>
              </button>
            )}
          </nav>
        )}
      </div>

      {/* Mobile 'More' Sheet */}
      {isExpanded && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsExpanded(false)} />
          <div className="bg-slate-950 rounded-t-[2.5rem] p-6 pb-28 relative z-50 animate-in slide-in-from-bottom-full duration-300 shadow-2xl border-t border-slate-800 text-slate-300">
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6"></div>

            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center font-bold text-lg">
                {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg m-0 leading-tight">{session?.name}</h3>
                <p className="text-xs uppercase tracking-widest text-slate-500 font-bold m-0">{session?.role}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {navItems.filter(item => !item.role || item.role === session?.role).slice(4).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 shadow-sm hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold transition-all active:scale-95"
                >
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                    {item.icon}
                  </div>
                  {item.name}
                  <ChevronRight size={18} className="ml-auto text-slate-600" />
                </Link>
              ))}

              <div className="h-px bg-slate-800 my-3 mx-2"></div>

              <GlobalMonthSelector isExpanded={true} />

              <form action={logout} className="mt-2">
                <button type="submit" className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-all active:scale-95 border border-red-500/20">
                  <div className="p-2.5 bg-transparent rounded-xl text-red-400">
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
            hidden md:flex flex-col bg-[#0A0F1C] text-slate-400 border border-slate-800/60 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex-shrink-0 transition-all duration-300 ease-in-out h-full relative group/sidebar
            ${isExpanded ? 'w-[260px] px-4 py-5' : 'w-[88px] px-3 py-5'}
          `}
        >
        <div
          className="flex items-center justify-center w-full mb-6 pb-6 border-b border-slate-800/60 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <div className="w-[180px] h-[40px] relative transition-opacity duration-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-indigo-400/30 flex-shrink-0">
                <Car size={20} className="text-white" />
              </div>
              <div className="font-black text-[1.1rem] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Hariram Cars
              </div>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
              <Car size={22} className="text-white" />
            </div>
          )}
          </div>

          <nav className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navItems.filter(item => !item.role || item.role === session?.role).map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={item.name}
                  className={`group flex items-center gap-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    isExpanded ? 'px-3 justify-start' : 'px-0 justify-center'
                  } ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0px_1px_1px_rgba(255,255,255,0.05)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className={`${isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-400 group-hover:text-slate-200'} transition-all`}>
                  {item.icon}
                </div>
                <span className={`whitespace-nowrap text-sm flex-1 transition-opacity duration-200 ${!isExpanded ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                  {item.name}
                </span>
                {isExpanded && isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
              </Link>
            );
          })}
        </nav>

          <div className="mt-2 mb-3">
            <GlobalMonthSelector isExpanded={isExpanded} />
          </div>

          {/* User Info / Settings Footer */}
          <div className="mt-auto pt-3 border-t border-slate-800/60 bg-[#0A0F1C]/80 backdrop-blur-sm -mx-4 px-4 -mb-5 pb-5 rounded-b-[1.5rem]">
            <div className={`flex items-center gap-3 mb-3 ${isExpanded ? 'px-1 justify-start' : 'justify-center'}`}>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex-shrink-0 text-sm shadow-inner">
              {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={`overflow-hidden flex-1 ${!isExpanded ? 'hidden' : ''}`}>
              <div className="text-sm font-bold text-slate-200 truncate">{session?.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{session?.role}</div>
            </div>
          </div>
          
          <form action={logout}>
            <button 
              type="submit" 
              title="Logout" 
              className={`w-full flex items-center justify-center gap-2 text-slate-400 bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all text-sm shadow-sm ${isExpanded ? '' : 'aspect-square'}`}
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span className={`${!isExpanded ? 'hidden' : ''} font-bold tracking-wide`}>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

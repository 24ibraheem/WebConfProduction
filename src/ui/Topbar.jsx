import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';

export default function Topbar({ onMenuClick }) {
  return (
    <div className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuClick} className="md:hidden text-slate-400 hover:text-white p-1">
          <Menu size={24} />
        </button>
        <h1 className="font-semibold text-slate-200 text-lg hidden sm:block">Admin Dashboard</h1>
        <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search meetings, participants..." 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-200">Admin User</div>
            <div className="text-xs text-slate-500">Administrator</div>
          </div>
          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
            <User size={18} className="text-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
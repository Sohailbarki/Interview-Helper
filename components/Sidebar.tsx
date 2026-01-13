
import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  PlayCircle, 
  Settings as SettingsIcon,
  BookOpen,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pkb', label: 'Knowledge Base', icon: Database },
    { id: 'session', label: 'Live Session', icon: PlayCircle },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-[100] shadow-sm">
      <div className="p-8 border-b border-slate-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <PlayCircle size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900">
              COACH.<span className="text-blue-600">AI</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Suite</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-8 space-y-1.5">
        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Core Platform</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`font-bold text-sm ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-50 bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Cloud Engine Linked</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

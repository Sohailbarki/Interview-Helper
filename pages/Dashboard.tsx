
import React, { useMemo } from 'react';
import { 
  Users, 
  Briefcase, 
  Clock, 
  TrendingUp,
  PlusCircle,
  FileText,
  ChevronRight
} from 'lucide-react';
import { databaseService } from '../services/databaseService';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const scenarios = databaseService.getScenarios();
  const sessions = databaseService.getSessions();

  const stats = useMemo(() => [
    { label: 'Scenarios Ready', value: scenarios.length.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Practice Sessions', value: sessions.length.toString(), icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Confidence Score', value: scenarios.length > 5 ? 'Elite' : 'Target', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ], [scenarios.length, sessions.length]);

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Performance Dashboard</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Focus on the prize.</h1>
          <p className="text-slate-500 mt-2 font-medium">Your knowledge vault contains {scenarios.length} high-impact professional narratives.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 rounded-[1.5rem] ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon size={28} />
              </div>
              <span className="text-4xl font-black text-slate-900">{stat.value}</span>
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center space-x-3">
              <Clock className="text-blue-600" size={20} />
              <span>Recent Engagement</span>
            </h2>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Full Audit</button>
          </div>
          
          <div className="space-y-4">
            {sessions.length > 0 ? (
              sessions.slice(-4).reverse().map((session) => (
                <div key={session.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center justify-between hover:border-blue-200 transition-all group shadow-sm">
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <Briefcase size={22} className="text-slate-400 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{session.role}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{session.company} • {new Date(session.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-1">
                    <ChevronRight size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 p-16 rounded-[3rem] text-center">
                <p className="text-slate-400 font-bold text-sm">No recorded sessions in current vault.</p>
                <button 
                  onClick={() => setActiveTab('session')}
                  className="mt-4 text-blue-600 text-xs font-black uppercase tracking-widest hover:underline"
                >
                  Link Hardware Now
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight px-2 flex items-center space-x-3">
            <Users className="text-indigo-600" size={20} />
            <span>AI Preparedness</span>
          </h2>
          <div className="bg-slate-900 p-10 rounded-[3rem] text-center shadow-2xl shadow-indigo-100">
            <div className="flex -space-x-3 justify-center mb-8">
               {[1,2,3,4].map((i) => (
                 <div key={i} className="w-14 h-14 rounded-full border-4 border-slate-900 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                    S{i}
                 </div>
               ))}
            </div>
            <p className="text-slate-300 text-sm font-bold leading-relaxed mb-8">
              "Your neural profile shows high alignment with senior business narratives."
            </p>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-8">
              <div 
                className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                style={{ width: `${Math.min(100, (scenarios.length / 8) * 100)}%` }}
              ></div>
            </div>
            <button className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl transition-all border border-white/5">
              Refine Strategy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

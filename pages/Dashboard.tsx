
import React, { useMemo } from 'react';
import { 
  Users, 
  Briefcase, 
  Clock, 
  TrendingUp,
  PlusCircle,
  FileText
} from 'lucide-react';
import { databaseService } from '../services/databaseService';

const Dashboard: React.FC = () => {
  const scenarios = databaseService.getScenarios();
  const sessions = databaseService.getSessions();

  const stats = useMemo(() => [
    { label: 'Saved Scenarios', value: scenarios.length.toString(), icon: FileText, color: 'text-blue-400' },
    { label: 'Saved Sessions', value: sessions.length.toString(), icon: Clock, color: 'text-indigo-400' },
    { label: 'Avg. Readiness', value: scenarios.length > 5 ? 'High' : 'Low', icon: TrendingUp, color: 'text-green-400' },
  ], [scenarios.length, sessions.length]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1">You have {scenarios.length} scenarios prepared for your next interview.</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <PlusCircle size={20} />
          <span>Quick Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <stat.icon size={24} className={stat.color} />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-slate-400 text-sm mt-4 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Clock className="text-slate-500" size={20} />
            <span>Recent Activity</span>
          </h2>
          {sessions.length > 0 ? (
            sessions.slice(-3).reverse().map((session) => (
              <div key={session.id} className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="bg-slate-700 w-10 h-10 rounded-lg flex items-center justify-center">
                     <Briefcase size={20} className="text-slate-300" />
                  </div>
                  <div>
                    <h4 className="font-medium">{session.role}</h4>
                    <p className="text-xs text-slate-500">{session.company} • {new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-white text-sm">View Log</button>
              </div>
            ))
          ) : (
            <div className="bg-slate-800/20 border border-slate-800 border-dashed p-10 rounded-xl text-center text-slate-500 italic text-sm">
              No sessions recorded yet.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Users className="text-slate-500" size={20} />
            <span>Playbook Progress</span>
          </h2>
          <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-xl text-center">
            <div className="flex -space-x-2 justify-center mb-4">
               {[1,2,3,4].map((i) => (
                 <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    S{i}
                 </div>
               ))}
            </div>
            <p className="text-slate-400 text-sm">You've covered {Math.min(100, (scenarios.length / 10) * 100)}% of common behavioral topics.</p>
            <button className="mt-4 text-blue-400 text-sm font-medium hover:underline">View Roadmap</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

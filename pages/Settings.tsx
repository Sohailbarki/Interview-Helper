
import React, { useState } from 'react';
import { 
  Shield, 
  Cpu, 
  Sun,
  Lock,
  CloudOff,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { AppSettings } from '../types';
import { databaseService } from '../services/databaseService';

interface SettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleReset = () => {
    databaseService.clearAll();
    setResetDone(true);
    setShowResetConfirm(false);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-32">
      <div>
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="text-slate-400 mt-1">Manage AI providers, privacy levels, and your local knowledge vault.</p>
      </div>

      <div className="space-y-6">
        {/* Privacy Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="px-8 py-5 bg-slate-800/30 border-b border-slate-800 flex items-center space-x-3">
            <Shield size={20} className="text-blue-400" />
            <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Privacy Governance</h3>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="max-w-md">
                <p className="font-bold text-slate-100">AI Privacy Mode</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  "Local Only" keeps data on your device but limits complex reasoning. "Cloud Allowed" uses Gemini/OpenAI for high-quality STAR answer composition.
                </p>
              </div>
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-fit">
                <button 
                  onClick={() => updateSetting('privacyMode', 'local_only')}
                  className={`px-5 py-2 text-xs rounded-xl font-bold transition-all flex items-center space-x-2 ${settings.privacyMode === 'local_only' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  <Lock size={12} />
                  <span>Local Only</span>
                </button>
                <button 
                  onClick={() => updateSetting('privacyMode', 'cloud_allowed')}
                  className={`px-5 py-2 text-xs rounded-xl font-bold transition-all flex items-center space-x-2 ${settings.privacyMode === 'cloud_allowed' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  <Sun size={12} />
                  <span>Cloud Active</span>
                </button>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
               <div className="text-xs text-slate-500">
                 Clear all scenarios, career documents, and session histories.
               </div>
               {!showResetConfirm ? (
                 <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center space-x-2 bg-red-500/5 px-4 py-2 rounded-xl border border-red-500/20 transition-all"
                 >
                   <Trash2 size={14} />
                   <span>Purge All Data</span>
                 </button>
               ) : (
                 <div className="flex items-center space-x-3">
                   <span className="text-xs text-red-500 font-bold flex items-center space-x-1">
                     <AlertTriangle size={14} />
                     <span>Are you sure?</span>
                   </span>
                   <button onClick={handleReset} className="bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">Yes, Delete</button>
                   <button onClick={() => setShowResetConfirm(false)} className="text-slate-500 text-[10px] font-bold">Cancel</button>
                 </div>
               )}
            </div>
            {resetDone && (
              <div className="p-3 bg-green-500/10 text-green-500 rounded-xl text-center text-xs font-bold flex items-center justify-center space-x-2">
                <CheckCircle size={14} />
                <span>Resetting application vault...</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Engine Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="px-8 py-5 bg-slate-800/30 border-b border-slate-800 flex items-center space-x-3">
            <Cpu size={20} className="text-indigo-400" />
            <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">AI Inference Engine</h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Master Provider</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                value={settings.aiProvider}
                onChange={e => updateSetting('aiProvider', e.target.value)}
              >
                <option value="gemini">Google Gemini 3.0 Flash</option>
                <option value="openai">OpenAI GPT-4o Mini</option>
                <option value="local">Ollama (Llama 3 Local)</option>
              </select>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Primary engine for composing interview answers. Local mode requires an active Ollama instance.
              </p>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">ASR Method</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                value={settings.asrMode}
                onChange={e => updateSetting('asrMode', e.target.value)}
              >
                <option value="browser">Web Speech API (Real-time)</option>
                <option value="local">Whisper Local (Experimental)</option>
              </select>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Method for converting spoken interviewer questions into text for smart matching.
              </p>
            </div>
          </div>
        </div>

        {/* UI Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="px-8 py-5 bg-slate-800/30 border-b border-slate-800 flex items-center space-x-3">
            <Sun size={20} className="text-yellow-400" />
            <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs">Interface Customization</h3>
          </div>
          <div className="p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Overlay Font Size</label>
                    <span className="text-xs font-bold text-blue-400">{settings.fontSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="14" max="32" 
                    value={settings.fontSize}
                    onChange={e => updateSetting('fontSize', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
               </div>
               <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Overlay Opacity</label>
                    <span className="text-xs font-bold text-blue-400">{settings.opacity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" max="100" 
                    value={settings.opacity}
                    onChange={e => updateSetting('opacity', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
               </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 bg-slate-950 rounded-2xl border border-slate-800">
               <div>
                  <h4 className="text-sm font-bold text-slate-200">Teleprompter Speed</h4>
                  <p className="text-[10px] text-slate-600 mt-1">Adjust words per minute for the auto-scrolling prompter.</p>
               </div>
               <div className="flex items-center space-x-4 w-full md:w-48">
                  <input 
                    type="range" 
                    min="10" max="100" 
                    value={settings.teleprompterSpeed}
                    onChange={e => updateSetting('teleprompterSpeed', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs font-mono font-bold text-slate-400">{settings.teleprompterSpeed}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

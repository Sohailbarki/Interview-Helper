
import React, { useState } from 'react';
import { 
  Shield, 
  Cpu, 
  Key,
  Type,
  Eye,
  EyeOff,
  Globe,
  AlertTriangle,
  Zap,
  Info,
  Mic,
  Maximize2,
  Columns,
  Award,
  Terminal,
  Users
} from 'lucide-react';
import { AppSettings } from '../types';
import { databaseService } from '../services/databaseService';

interface SettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const updateSetting = (key: keyof AppSettings, value: any) => {
    let nextSettings = { ...settings, [key]: value };
    
    // Auto-update model when provider changes
    if (key === 'aiProvider') {
      if (value === 'openai') {
        nextSettings.aiModel = 'gpt-4o';
      } else {
        nextSettings.aiModel = 'gemini-3-flash-preview';
      }
    }
    
    setSettings(nextSettings);
  };

  const handleReset = () => {
    databaseService.clearAll();
    window.location.reload();
  };

  return (
    <div className="p-12 max-w-5xl mx-auto space-y-10 pb-32">
      <div className="flex flex-col space-y-2 mb-8">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Global Preferences</p>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Environment</h1>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* AI INFRASTRUCTURE */}
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
          <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center space-x-4">
            <Globe size={24} className="text-blue-600" />
            <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-900">Intelligence Source</h3>
          </div>
          <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Provider Engine</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 text-sm font-bold text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                  value={settings.aiProvider}
                  onChange={e => updateSetting('aiProvider', e.target.value)}
                >
                  <option value="gemini">Google Gemini (Experimental Series)</option>
                  <option value="openai">OpenAI (ChatGPT GPT-4o Support)</option>
                </select>
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start space-x-3">
                  <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                    Gemini uses system-wide credentials. OpenAI requires a personal key and has higher rate limits.
                  </p>
                </div>
              </div>

              {settings.aiProvider === 'openai' && (
                <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Model Variant</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 text-sm font-bold text-slate-900 focus:border-blue-400 outline-none"
                    value={settings.aiModel}
                    onChange={e => updateSetting('aiModel', e.target.value)}
                  >
                    <option value="gpt-4o">GPT-4o (High Performance)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Ultra Fast)</option>
                  </select>
                </div>
              )}

              {settings.aiProvider === 'gemini' && (
                <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Model Variant</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 text-sm font-bold text-slate-900 focus:border-blue-400 outline-none"
                    value={settings.aiModel}
                    onChange={e => updateSetting('aiModel', e.target.value)}
                  >
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Recommended)</option>
                    <option value="gemini-3-pro-preview">Gemini 3 Pro (Deep Reasoning)</option>
                  </select>
                </div>
              )}

              <div className="md:col-span-2 space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between px-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">OpenAI API Access Key</label>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center space-x-1">
                    <Zap size={10} />
                    <span>AES-256 Local Encrypted</span>
                  </span>
                </div>
                <div className="relative group">
                  <input 
                    type={showKey ? "text" : "password"}
                    placeholder="sk-proj-..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 pr-16 text-sm font-mono text-slate-900 focus:border-blue-400 focus:bg-white transition-all outline-none"
                    value={settings.openaiApiKey || ''}
                    onChange={e => updateSetting('openaiApiKey', e.target.value)}
                  />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-900">
                    {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">Found at platform.openai.com/api-keys. Only required for ChatGPT mode.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ASR CONFIGURATION */}
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
          <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center space-x-4">
            <Mic size={24} className="text-blue-600" />
            <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-900">Speech Recognition</h3>
          </div>
          <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recognition Mode</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 text-sm font-bold text-slate-900 focus:border-blue-400 outline-none"
                  value={settings.asrMode}
                  onChange={e => updateSetting('asrMode', e.target.value)}
                >
                  <option value="browser">Web Speech API (Standard)</option>
                  <option value="local">Local Whisper (Experimental)</option>
                </select>
              </div>
              <div className="space-y-8 flex flex-col justify-center">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ASR Confidence Threshold</span>
                    <span className="text-xl font-black text-blue-600 font-mono">{(settings.asrConfidenceThreshold * 100).toFixed(0)}%</span>
                 </div>
                 <input 
                  type="range" min="0" max="1" step="0.05"
                  value={settings.asrConfidenceThreshold}
                  onChange={e => updateSetting('asrConfidenceThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                 />
                 <p className="text-[10px] text-slate-400 font-medium italic px-2">
                   Higher values filter out background noise but may miss quiet speech. Recommended: 0.5 - 0.7.
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* INTERFACE OPTIMIZATION */}
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
          <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center space-x-4">
            <Type size={24} className="text-blue-600" />
            <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-900">Visual Experience</h3>
          </div>
          <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Engine Font</label>
                <div className="flex space-x-4">
                  {(['Inter', 'JetBrains Mono'] as const).map((font) => (
                    <button
                      key={font}
                      onClick={() => updateSetting('fontFamily', font)}
                      className={`flex-1 p-6 rounded-[1.5rem] border-2 transition-all text-left ${settings.fontFamily === font ? 'border-blue-600 bg-blue-50/20' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                    >
                      <span className={`text-xl font-black block mb-1 ${font === 'JetBrains Mono' ? 'font-mono' : ''} text-slate-900`}>Aa</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{font}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-8 flex flex-col justify-center">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Font Size</span>
                    <span className="text-xl font-black text-blue-600 font-mono">{settings.fontSize}px</span>
                 </div>
                 <input 
                  type="range" min="12" max="100" 
                  value={settings.fontSize}
                  onChange={e => updateSetting('fontSize', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                 />
              </div>
            </div>
          </div>
        </div>

        {/* LAYOUT CUSTOMIZATION */}
        <div className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
          <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center space-x-4">
            <Columns size={24} className="text-blue-600" />
            <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-900">Layout Dimensions</h3>
          </div>
          <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synthesis Panel Width</span>
                    <span className="text-xl font-black text-blue-600 font-mono">{settings.synthesisWidth}px</span>
                 </div>
                 <input 
                  type="range" min="400" max="1200" 
                  value={settings.synthesisWidth}
                  onChange={e => updateSetting('synthesisWidth', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                 />
              </div>
              <div className="space-y-8">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Footer Height</span>
                    <span className="text-xl font-black text-blue-600 font-mono">{settings.footerHeight}px</span>
                 </div>
                 <input 
                  type="range" min="80" max="300" 
                  value={settings.footerHeight}
                  onChange={e => updateSetting('footerHeight', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                 />
              </div>
            </div>
          </div>
        </div>

        {/* SYSTEM RECOVERY */}
        <div className="p-10 bg-red-50 border border-red-100 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center text-red-600">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-red-900 uppercase text-xs tracking-widest">Master Reset</h4>
              <p className="text-xs text-red-700/60 font-medium">Permanently clear the Knowledge Vault and system history.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {showResetConfirm ? (
              <div className="flex items-center space-x-4 animate-in zoom-in duration-300">
                <button onClick={handleReset} className="px-10 py-5 bg-red-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200">Confirm Destroy</button>
                <button onClick={() => setShowResetConfirm(false)} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-900">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="px-10 py-5 bg-white border border-red-200 text-red-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
              >
                Clear Data Vault
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;


import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import InterviewSession from './pages/InterviewSession';
import Settings from './pages/Settings';
import { AppSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('coach_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with DEFAULT_SETTINGS to ensure all keys exist
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('coach_settings', JSON.stringify(settings));
  }, [settings]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'pkb':
        return <KnowledgeBase setActiveTab={setActiveTab} />;
      case 'session':
        return <InterviewSession settings={settings} setSettings={setSettings} />;
      case 'settings':
        return <Settings settings={settings} setSettings={setSettings} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 bg-slate-50/50 overflow-y-auto">
        <div className="min-h-full">
          {renderContent()}
        </div>
      </main>

      {/* Global Hotkey Listener */}
      <HotkeyManager setActiveTab={setActiveTab} />
    </div>
  );
};

const HotkeyManager: React.FC<{ setActiveTab: (t: string) => void }> = ({ setActiveTab }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey) {
        if (e.key === 'd') setActiveTab('dashboard');
        if (e.key === 'p') setActiveTab('pkb');
        if (e.key === 's') setActiveTab('session');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return null;
};

export default App;

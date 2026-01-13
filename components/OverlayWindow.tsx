
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Clipboard,
  Zap,
  Sparkles,
  Target,
  Mic,
  RotateCcw,
  Type as TypeIcon,
  Plus,
  Minus,
  Activity,
  MessageSquare,
  RefreshCw,
  Cpu,
  Gauge,
  ArrowUp,
  ArrowDown,
  Layout
} from 'lucide-react';

interface OverlayWindowProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedAnswer: any | null;
  settings: any;
  transcript: string;
  isListening?: boolean;
  isAnalyzing?: boolean;
}

const OverlayWindow: React.FC<OverlayWindowProps> = ({ 
  isOpen, 
  onClose, 
  suggestedAnswer, 
  settings,
  transcript,
  isListening = false,
  isAnalyzing = false
}) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [mode, setMode] = useState<'prompter' | 'copilot'>('copilot');
  const [localSpeed, setLocalSpeed] = useState(settings.teleprompterSpeed);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [showTranscript, setShowTranscript] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRequestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalSpeed(settings.teleprompterSpeed);
    setLocalFontSize(settings.fontSize);
  }, [settings.teleprompterSpeed, settings.fontSize]);

  // Handle scroll progress tracking
  const handleScrollUpdate = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(isNaN(progress) ? 0 : progress);
    }
  }, []);

  // Smooth Scrolling Animation Loop
  const animateScroll = useCallback((time: number) => {
    if (lastTimeRef.current !== 0 && isScrolling && scrollContainerRef.current) {
      const deltaTime = time - lastTimeRef.current;
      const moveAmount = (localSpeed * deltaTime) / 100;
      scrollContainerRef.current.scrollTop += moveAmount;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        setIsScrolling(false);
      }
      handleScrollUpdate();
    }
    lastTimeRef.current = time;
    scrollRequestRef.current = requestAnimationFrame(animateScroll);
  }, [isScrolling, localSpeed, handleScrollUpdate]);

  useEffect(() => {
    if (isScrolling && mode === 'prompter') {
      scrollRequestRef.current = requestAnimationFrame(animateScroll);
    } else {
      cancelAnimationFrame(scrollRequestRef.current);
      lastTimeRef.current = 0;
    }
    return () => cancelAnimationFrame(scrollRequestRef.current);
  }, [isScrolling, mode, animateScroll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsScrolling(prev => !prev);
      } 
      if (mode === 'prompter') {
        if (e.key === 'ArrowUp') { e.preventDefault(); setLocalSpeed(prev => Math.min(prev + 5, 200)); }
        if (e.key === 'ArrowDown') { e.preventDefault(); setLocalSpeed(prev => Math.max(prev - 5, 5)); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode]);

  const resetScroll = () => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    setIsScrolling(false);
    setScrollProgress(0);
  };

  if (!isOpen) return null;

  const fontClass = settings.fontFamily === 'JetBrains Mono' ? 'font-mono' : '';

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-slate-900/98 border border-slate-700/50 rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] flex flex-col z-[1000] overflow-hidden backdrop-blur-3xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-10 ${fontClass}`}
      style={{ 
        opacity: settings.opacity / 100,
        width: `${settings.overlayWidth || 600}px`
      }}
    >
      {/* HUD Header */}
      <div className="px-10 py-6 bg-slate-950/50 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}></div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              {isListening ? 'Capturing' : 'Standby'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isAnalyzing ? 'text-blue-400 animate-spin' : 'text-slate-600'}`}>
                {isAnalyzing ? <RefreshCw size={14} /> : <Cpu size={14} />}
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              {isAnalyzing ? 'Inferencing' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/5">
            <button onClick={() => setMode('copilot')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'copilot' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Cards</button>
            <button onClick={() => setMode('prompter')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'prompter' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Script</button>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-red-500/20 rounded-xl text-slate-500 transition-colors ml-2"><X size={20} /></button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[450px] max-h-[650px] flex flex-col overflow-hidden">
        {mode === 'prompter' && (
          <div className="absolute top-[40%] h-[20%] pointer-events-none z-10 border-y border-blue-500/20 bg-blue-500/5 backdrop-blur-[2px]"></div>
        )}

        <div 
          ref={scrollContainerRef}
          onScroll={handleScrollUpdate}
          className="flex-1 overflow-y-auto p-12 custom-scrollbar relative z-0"
        >
          {mode === 'prompter' ? (
            <div className="pb-[400px] pt-[200px]">
              <p 
                className={`leading-[1.8] whitespace-pre-wrap font-black text-slate-100 transition-all duration-300 text-center tracking-tight`}
                style={{ fontSize: `${localFontSize}px` }}
              >
                {suggestedAnswer?.answer || (isAnalyzing ? "Processing neural response..." : "Capture audio to generate prompter script...")}
              </p>
            </div>
          ) : (
            <div className="space-y-10 pb-10">
              {suggestedAnswer ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="p-10 bg-blue-600/10 border border-blue-500/30 rounded-[2.5rem] relative shadow-2xl">
                    <span className="text-[12px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 block">Impact Hook</span>
                    <p className="text-3xl font-black text-white leading-tight italic">"{suggestedAnswer.hook}"</p>
                  </div>
                  
                  <div className="space-y-6">
                    <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center space-x-3 px-4">
                        <Target size={16} />
                        <span>Core Principles</span>
                    </span>
                    <div className="grid grid-cols-1 gap-4">
                      {suggestedAnswer.bullets?.map((b: string, i: number) => (
                        <div key={i} className="bg-slate-800/40 p-6 rounded-[1.5rem] border border-white/5 flex items-start space-x-5 transition-all">
                          <div className="mt-2 w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
                          <span className="text-lg font-black text-slate-200 leading-snug">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 opacity-20 space-y-6">
                    <Activity size={100} strokeWidth={1} className="text-slate-400" />
                    <p className="text-2xl font-black uppercase tracking-[0.5em] text-white">System Standby</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-10 py-8 bg-slate-950/90 border-t border-white/5">
        {mode === 'prompter' ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center bg-slate-800/60 p-1 rounded-2xl border border-white/5">
                        <button onClick={() => setLocalSpeed(prev => Math.max(prev - 5, 5))} className="p-2.5 hover:bg-slate-700 rounded-xl"><Minus size={16} /></button>
                        <div className="px-4 text-center min-w-[60px]">
                            <span className="text-sm font-black font-mono text-blue-400">{localSpeed}</span>
                        </div>
                        <button onClick={() => setLocalSpeed(prev => Math.min(prev + 5, 200))} className="p-2.5 hover:bg-slate-700 rounded-xl"><Plus size={16} /></button>
                    </div>
                </div>
            </div>
            <button 
                onClick={() => setIsScrolling(!isScrolling)}
                className={`w-18 h-18 rounded-[2rem] flex items-center justify-center transition-all ${
                  isScrolling ? 'bg-red-500 shadow-red-900/40' : 'bg-blue-600 shadow-blue-900/40'
                }`}
            >
                {isScrolling ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-slate-500">
                <Layout size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Neural Logic Processor Active</span>
            </div>
            <button onClick={onClose} className="bg-slate-800 text-slate-400 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5">Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayWindow;

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
  ArrowDown
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

  // Smooth Scrolling Animation Loop - Frame-independent
  const animateScroll = useCallback((time: number) => {
    if (lastTimeRef.current !== 0 && isScrolling && scrollContainerRef.current) {
      const deltaTime = time - lastTimeRef.current;
      // Normalizing speed: roughly (pixels per second) / 10
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

  // Keyboard Shortcuts & Accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Prevent space from scrolling page
      if (e.code === 'Space') {
        e.preventDefault();
        setIsScrolling(prev => !prev);
      } 
      // Speed adjustments via arrows
      if (mode === 'prompter') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setLocalSpeed(prev => Math.min(prev + 5, 200));
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setLocalSpeed(prev => Math.max(prev - 5, 5));
        }
      }
      // Toggle transcript visibility
      if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowTranscript(prev => !prev);
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

  return (
    <div 
      className="fixed bottom-6 right-6 w-[600px] bg-slate-900/98 border border-slate-700/50 rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] flex flex-col z-[1000] overflow-hidden backdrop-blur-3xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-10"
      style={{ opacity: settings.opacity / 100 }}
      role="dialog"
      aria-label="Interview Copilot Overlay"
    >
      {/* 1. HUD / STATUS BAR */}
      <div className="px-10 py-6 bg-slate-950/50 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Mic Status */}
          <div className="flex items-center space-x-3">
            <div className={`relative flex items-center justify-center`}>
                <div className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}></div>
                {isListening && <div className="absolute inset-0 bg-red-500/40 rounded-full animate-ping"></div>}
            </div>
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isListening ? 'text-red-400' : 'text-slate-500'}`}>
              {isListening ? 'Vocal Capture' : 'Mic Idle'}
            </span>
          </div>

          {/* AI Status */}
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isAnalyzing ? 'text-blue-400 animate-spin' : 'text-slate-600'}`}>
                {isAnalyzing ? <RefreshCw size={14} /> : <Cpu size={14} />}
            </div>
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isAnalyzing ? 'text-blue-400' : 'text-slate-500'}`}>
              {isAnalyzing ? 'Analyzing' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button 
              onClick={() => { setMode('copilot'); setIsScrolling(false); }}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center space-x-2 ${mode === 'copilot' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              aria-pressed={mode === 'copilot'}
            >
              <Target size={14} />
              <span>Cards</span>
            </button>
            <button 
              onClick={() => { setMode('prompter'); resetScroll(); }}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center space-x-2 ${mode === 'prompter' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              aria-pressed={mode === 'prompter'}
            >
              <MessageSquare size={14} />
              <span>Script</span>
            </button>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-slate-500 transition-colors ml-2 border border-white/5"
            aria-label="Close Overlay"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT VIEW */}
      <div className="relative flex-1 min-h-[450px] max-h-[650px] flex flex-col overflow-hidden">
        
        {mode === 'prompter' && (
          <>
            {/* Scroll Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 z-50">
                <div 
                  className="h-full bg-blue-500 transition-all duration-200" 
                  style={{ width: `${scrollProgress}%` }}
                ></div>
            </div>

            {/* Reading Focus Zone */}
            <div className="absolute inset-x-0 top-[40%] h-[20%] pointer-events-none z-10 border-y border-blue-500/20 bg-blue-500/5 backdrop-blur-[2px]">
                <div className="absolute -left-1 top-0 bottom-0 w-1.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
                <div className="absolute -right-1 top-0 bottom-0 w-1.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
            </div>
          </>
        )}

        <div 
          ref={scrollContainerRef}
          onScroll={handleScrollUpdate}
          className="flex-1 overflow-y-auto p-12 custom-scrollbar relative z-0"
        >
          {mode === 'prompter' ? (
            <div className="pb-[400px] pt-[200px]">
              <p 
                className="leading-[1.8] whitespace-pre-wrap font-semibold text-slate-100 transition-all duration-300 text-center tracking-tight"
                style={{ fontSize: `${localFontSize}px` }}
              >
                {suggestedAnswer?.answer || (isAnalyzing ? "Synthesizing response strategy..." : "Waiting for interview conversation to trigger script...")}
              </p>
            </div>
          ) : (
            <div className="space-y-10 pb-10">
              {suggestedAnswer ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="p-10 bg-blue-600/10 border border-blue-500/30 rounded-[2.5rem] relative overflow-hidden group/hook shadow-2xl">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover/hook:scale-125 transition-transform duration-700">
                        <Sparkles size={80} className="text-blue-400" />
                    </div>
                    <span className="text-[12px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 block">Recommended Opening</span>
                    <p className="text-3xl font-bold text-white leading-tight italic">
                      "{suggestedAnswer.hook}"
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center space-x-3 px-4">
                        <Target size={16} />
                        <span>Key Evidence to Emphasize</span>
                    </span>
                    <div className="grid grid-cols-1 gap-4">
                      {suggestedAnswer.bullets?.map((b: string, i: number) => (
                        <div key={i} className="bg-slate-800/40 p-6 rounded-[1.5rem] border border-white/5 flex items-start space-x-5 transition-all hover:bg-slate-800/60 hover:border-blue-500/30">
                          <div className="mt-2 w-3 h-3 rounded-full bg-blue-500 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                          <span className="text-lg font-bold text-slate-200 leading-snug">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 bg-slate-800/30 rounded-[2rem] border border-white/5 shadow-inner">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3 block">Neural Strategy Guide</span>
                    <p className="text-sm text-slate-400 font-bold leading-relaxed italic">{suggestedAnswer.strategy}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 opacity-20 space-y-6">
                    <Activity size={100} strokeWidth={1} className="text-slate-400 animate-pulse" />
                    <p className="text-2xl font-black uppercase tracking-[0.5em] text-white">System Armed</p>
                    <p className="text-slate-500 font-bold max-w-xs text-center">The AI is monitoring the audio feed for question cues.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. LIVE TRANSCRIPTION TICKER (PERSISTENT) */}
      <div className={`transition-all duration-500 border-t border-white/5 overflow-hidden ${showTranscript ? 'h-36' : 'h-0'}`}>
        <div className="p-8 bg-slate-950/70 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <MessageSquare size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Continuous Transcription Loop</span>
                </div>
                {isListening && <div className="flex items-center space-x-2">
                    <span className="text-[8px] font-black text-blue-500 uppercase animate-pulse">Live</span>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                </div>}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar-thin pr-4">
                <p className="text-base font-mono text-slate-400 leading-relaxed font-medium">
                    {transcript ? (
                        <>
                            <span className="text-slate-700 mr-3 font-black text-[11px] tracking-widest bg-slate-900 px-2 py-1 rounded">STREAM IN</span>
                            {transcript}
                            <span className="inline-block w-2 h-5 bg-blue-500/60 ml-2 animate-pulse align-middle rounded-sm"></span>
                        </>
                    ) : (
                        <span className="text-slate-700 italic text-sm">Silent Feed. Monitoring local hardware for speech patterns...</span>
                    )}
                </p>
            </div>
        </div>
      </div>

      {/* 4. FOOTER CONTROLS */}
      <div className="px-10 py-8 bg-slate-950/90 border-t border-white/5">
        {mode === 'prompter' ? (
          <div className="flex items-center justify-between gap-10">
            <div className="flex items-center space-x-6">
                {/* Speed Controls */}
                <div className="flex flex-col space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Scroll Speed</label>
                    <div className="flex items-center bg-slate-800/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <button 
                          onClick={() => setLocalSpeed(prev => Math.max(prev - 5, 5))} 
                          className="p-2.5 hover:bg-slate-700 rounded-xl transition-colors"
                          aria-label="Decrease Speed"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="px-5 flex flex-col items-center min-w-[70px]">
                            <span className="text-sm font-black font-mono text-blue-400 leading-none">{localSpeed}</span>
                            <span className="text-[8px] font-black text-slate-600 uppercase mt-1">WPM</span>
                        </div>
                        <button 
                          onClick={() => setLocalSpeed(prev => Math.min(prev + 5, 200))} 
                          className="p-2.5 hover:bg-slate-700 rounded-xl transition-colors"
                          aria-label="Increase Speed"
                        >
                          <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Font Size Controls */}
                <div className="flex flex-col space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Type Size</label>
                    <div className="flex items-center bg-slate-800/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <button 
                          onClick={() => setLocalFontSize(prev => Math.max(prev - 2, 14))} 
                          className="p-2.5 hover:bg-slate-700 rounded-xl transition-colors"
                          aria-label="Decrease Font Size"
                        >
                          <TypeIcon size={14} />
                        </button>
                        <span className="px-4 text-sm font-black font-mono text-blue-400">{localFontSize}</span>
                        <button 
                          onClick={() => setLocalFontSize(prev => Math.min(prev + 2, 56))} 
                          className="p-2.5 hover:bg-slate-700 rounded-xl transition-colors"
                          aria-label="Increase Font Size"
                        >
                          <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-5">
              <button 
                  onClick={resetScroll} 
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 border border-white/5 transition-all active:scale-95 group shadow-lg"
                  title="Reset to Top"
              >
                  <RotateCcw size={22} className="group-hover:rotate-[-45deg] transition-transform" />
              </button>

              <button 
                  onClick={() => setIsScrolling(!isScrolling)}
                  className={`w-18 h-18 rounded-[2rem] flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
                    isScrolling 
                      ? 'bg-red-500 shadow-red-900/40 hover:bg-red-600' 
                      : 'bg-blue-600 shadow-blue-900/40 hover:bg-blue-500 hover:scale-105'
                  }`}
                  aria-label={isScrolling ? "Pause Script" : "Play Script"}
              >
                  {isScrolling ? (
                    <Pause size={32} fill="currentColor" className="text-white" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1.5 text-white" />
                  )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-slate-500">
                <div className="bg-slate-800 p-3 rounded-xl border border-white/5"><Activity size={16} /></div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Grounding Engine Active</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase">Context Matching 100% Efficiency</span>
                </div>
            </div>
            <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border transition-all active:scale-95 ${
                  showTranscript 
                    ? 'bg-slate-800 text-slate-300 border-white/10 shadow-lg' 
                    : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}
            >
                {showTranscript ? 'Hide Data Stream' : 'Reveal Feed'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayWindow;

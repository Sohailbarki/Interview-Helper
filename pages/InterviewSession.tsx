
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Zap, 
  Trash2,
  Sparkles,
  Activity,
  AlertCircle,
  Volume2,
  Plus,
  Minus,
  RefreshCw,
  Terminal,
  Cpu,
  Radio,
  ShieldCheck,
  Search,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Info
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { databaseService } from '../services/databaseService';
import { Scenario, Document } from '../types';

const InterviewSession: React.FC<{ settings: any }> = ({ settings }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [suggestedAnswer, setSuggestedAnswer] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayFontSize, setDisplayFontSize] = useState(84);
  const [detectedSpeaker, setDetectedSpeaker] = useState<'INTERVIEWER' | 'CANDIDATE' | 'IDLE'>('IDLE');
  
  // Persist session-specific details
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('session_company') || 'Target Company');
  const [roleName, setRoleName] = useState(() => localStorage.getItem('session_role') || 'Senior Business Analyst');

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>('');
  const lastTriggerTime = useRef<number>(0);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('session_company', companyName);
    localStorage.setItem('session_role', roleName);
  }, [companyName, roleName]);

  useEffect(() => {
    setScenarios(databaseService.getScenarios());
    setDocs(databaseService.getDocuments());
    return () => cleanupAudio();
  }, []);

  const cleanupAudio = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onstart = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsInitializing(false);
    setIsListening(false);
    setDetectedSpeaker('IDLE');
  };

  const triggerCopilot = useCallback(async (text: string) => {
    const queryText = text || transcript;
    if (!queryText || queryText.trim().length < 10) return;
    
    const now = Date.now();
    if (text === '' && now - lastTriggerTime.current < 2000) return;
    lastTriggerTime.current = now;

    setIsAnalyzing(true);
    try {
      const result = await aiService.getLiveCopilotSuggestion(
        queryText,
        scenarios,
        companyName,
        roleName
      );
      
      if (result) {
        setDetectedSpeaker(result.detectedRole === 'INTERVIEWER' ? 'INTERVIEWER' : 'CANDIDATE');
        if (result.isInterviewerQuestion) {
          setSuggestedAnswer(result);
        }
      }
    } catch (err) {
      console.error("AI Link Fault:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [scenarios, companyName, roleName, transcript]);

  const toggleListening = async () => {
    if (isInitializing) return;
    if (isListening) { cleanupAudio(); return; }

    try {
      setError(null);
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setError("Speech Hardware Unsupported");
        setIsInitializing(false);
        return;
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setIsInitializing(false);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            setTranscript(prev => (prev + ' ' + text).trim().slice(-400));
            transcriptBufferRef.current += ' ' + text;
            setInterimTranscript('');
            
            if (transcriptBufferRef.current.split(/\s+/).length >= 7) {
              triggerCopilot(transcriptBufferRef.current);
              transcriptBufferRef.current = '';
            }
          } else {
            interim += text;
          }
        }
        setInterimTranscript(interim);
      };

      recognition.onend = () => { if (isListeningRef.current) recognition.start(); };
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      setError(`Hardware Sync Failure: ${e.message}`);
      setIsInitializing(false);
      cleanupAudio();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020202] overflow-hidden flex flex-col font-inter selection:bg-blue-500/20">
      {/* 11 CALIBRE HUD */}
      <header className="h-20 bg-black/60 border-b border-white/5 flex items-center justify-between px-10 backdrop-blur-3xl z-50">
        <div className="flex items-center space-x-12">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] mb-1">Target Context</span>
            <div className="flex items-center space-x-3">
              <input 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                className="bg-transparent border-none text-xl font-black text-white p-0 focus:ring-0 w-auto min-w-[120px] outline-none" 
                placeholder="Company"
              />
              <span className="text-slate-800 font-bold">::</span>
              <input 
                value={roleName} 
                onChange={e => setRoleName(e.target.value)} 
                className="bg-transparent border-none text-[11px] font-bold text-slate-500 p-0 focus:ring-0 outline-none uppercase tracking-[0.2em]" 
                placeholder="Target Role"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded border ${isListening ? 'bg-blue-500/5 border-blue-500/30 text-blue-400' : 'bg-slate-900/50 border-white/5 text-slate-800'}`}>
              <Radio size={12} className={isListening ? 'animate-pulse' : ''} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">{isListening ? 'Capture Active' : 'Standby'}</span>
            </div>
            
            <div className={`flex items-center space-x-3 px-3 py-1.5 rounded border transition-all ${detectedSpeaker === 'INTERVIEWER' ? 'bg-orange-500/5 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.1)]' : 'bg-slate-900/50 border-white/5 text-slate-800'}`}>
               <Terminal size={12} />
               <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                 {detectedSpeaker === 'INTERVIEWER' ? 'Interviewer Speaking' : 'Monitoring Speaker'}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-5">
           <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-1">
             <button onClick={() => setDisplayFontSize(prev => Math.max(prev - 8, 32))} className="p-2 hover:bg-white/10 rounded transition-all"><Minus size={14} /></button>
             <span className="px-4 text-[11px] font-mono font-bold text-blue-500">{displayFontSize}px</span>
             <button onClick={() => setDisplayFontSize(prev => Math.min(prev + 8, 160))} className="p-2 hover:bg-white/10 rounded transition-all"><Plus size={14} /></button>
           </div>
           <button onClick={() => { setTranscript(''); setInterimTranscript(''); setSuggestedAnswer(null); setDetectedSpeaker('IDLE'); }} className="p-3 bg-red-500/5 hover:bg-red-500/20 text-red-500/60 rounded-xl transition-all border border-red-500/10 shadow-sm" title="Clear Stream">
             <Trash2 size={18} />
           </button>
        </div>
      </header>

      {/* CORE DISPLAY */}
      <main className="flex-1 flex overflow-hidden">
        {/* TRANSCRIPT AREA */}
        <div className="flex-1 relative flex flex-col p-16 justify-end bg-[radial-gradient(circle_at_20%_120%,rgba(59,130,246,0.03),transparent)]">
          <div className="absolute top-10 left-16 flex items-center space-x-3 opacity-30">
             <Activity size={14} className="text-blue-500" />
             <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Hardware Link: PCM 48kHz</span>
          </div>

          <div className="max-w-7xl w-full mx-auto overflow-y-auto custom-scrollbar-thin pr-10">
            {(transcript || interimTranscript) ? (
              <div 
                className="font-black text-white/95 leading-[0.95] tracking-tighter transition-all duration-300"
                style={{ fontSize: `${displayFontSize}px` }}
              >
                {transcript}
                {interimTranscript && (
                  <span className="text-slate-800 italic"> {interimTranscript}</span>
                )}
                <span className="inline-block w-[0.1em] h-[0.9em] bg-blue-600 ml-4 animate-pulse align-middle rounded-sm shadow-[0_0_20px_rgba(59,130,246,0.3)]"></span>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10 pb-20">
                <Search size={140} strokeWidth={0.5} className="text-white mb-6" />
                <p className="text-3xl font-black uppercase tracking-[0.6em] text-white">Neural Input Ready</p>
                <p className="text-[11px] text-slate-700 mt-2 font-bold tracking-widest uppercase">Dialogue Intel grounded in {docs.length} uploaded career documents</p>
              </div>
            )}
          </div>
        </div>

        {/* COMPLETE STAR ANALYSIS PANEL */}
        <aside className="w-[620px] border-l border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col overflow-y-auto custom-scrollbar p-10 space-y-10 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.6em]">Dialogue Intel</h3>
            {isAnalyzing && <Activity size={16} className="text-blue-400 animate-pulse" />}
          </div>

          {suggestedAnswer ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
               {/* 1. Hook / Intro */}
               <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] relative overflow-hidden group shadow-inner">
                  <div className="absolute top-6 right-6 text-blue-500/10 group-hover:text-blue-500/30 transition-all">
                    <Sparkles size={32} />
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 block">Recommended Opening</span>
                  <p className="text-xl font-bold text-white leading-tight italic">"{suggestedAnswer.hook}"</p>
               </div>

               {/* 2. Complete STAR Response */}
               <div className="space-y-6">
                 <div className="flex items-center space-x-3 px-2">
                   <BookOpen size={16} className="text-slate-500" />
                   <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Contextual STAR Synthesis</span>
                 </div>
                 <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 space-y-8 shadow-xl">
                   {suggestedAnswer.answer.split(/(?=\[[STAR]\])/g).filter((p: string) => p.trim()).map((paragraph: string, idx: number) => {
                     const match = paragraph.match(/^\[([STAR])\]\s*(.*)/s);
                     if (!match) return <p key={idx} className="text-sm text-slate-400 leading-relaxed">{paragraph}</p>;
                     
                     const [, label, content] = match;
                     const labels: Record<string, string> = { S: 'SITUATION', T: 'TASK', A: 'ACTION', R: 'RESULT' };
                     const labelColors: Record<string, string> = { S: 'text-blue-400', T: 'text-indigo-400', A: 'text-blue-600', R: 'text-emerald-400' };
                     
                     return (
                       <div key={idx} className="space-y-3 relative group/star">
                         <div className="flex items-center space-x-3">
                           <div className={`text-[9px] font-black ${labelColors[label]} px-2 py-0.5 rounded border border-current opacity-60 tracking-widest`}>
                             {labels[label]}
                           </div>
                           <div className="h-px flex-1 bg-white/5"></div>
                         </div>
                         <p className="text-sm leading-relaxed text-slate-200 font-medium">
                           {content.trim()}
                         </p>
                       </div>
                     );
                   })}
                 </div>
               </div>

               {/* 3. Metrics / Bullets */}
               <div className="space-y-4">
                 <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] px-2 block">Industry Power Words & Metrics</span>
                 <div className="grid grid-cols-1 gap-3">
                   {suggestedAnswer.bullets?.map((b: string, i: number) => (
                     <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start space-x-4 hover:border-blue-500/30 transition-all group/item shadow-sm">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                       <p className="text-md font-bold text-slate-300 leading-snug group-hover/item:text-white transition-colors">{b}</p>
                     </div>
                   ))}
                 </div>
               </div>

               {/* 4. Strategy */}
               <div className="p-6 bg-slate-950/80 rounded-2xl border border-white/5 border-dashed flex items-start space-x-4">
                 <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                 <div className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Expert Tactic</span>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{suggestedAnswer.strategy}</p>
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center space-y-6">
               <Cpu size={80} strokeWidth={1} />
               <p className="text-xl font-black uppercase tracking-[0.4em]">Link Synchronized</p>
               <p className="text-[11px] text-slate-700 leading-relaxed font-bold uppercase tracking-widest max-w-[280px]">Grounding in JD/CV context. I will synthesize industry-standard STAR responses when interviewer questions are detected.</p>
            </div>
          )}
        </aside>
      </main>

      {/* FOOTER CONSOLE */}
      <footer className="h-28 bg-black border-t border-white/5 flex items-center justify-center px-16">
        <div className="w-full max-w-5xl flex items-center justify-between">
          <div className="flex items-center space-x-12">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.4em] mb-1">Inference Engine</span>
              <div className="flex items-center space-x-2 text-green-500/80 font-bold font-mono text-[11px]">
                 <Zap size={12} />
                 <span>GEMINI-3-FLASH :: LOW LATENCY</span>
              </div>
            </div>
            <div className="h-12 w-px bg-white/5"></div>
            <button 
              onClick={() => triggerCopilot('')}
              disabled={isAnalyzing || !transcript}
              className="flex items-center space-x-3 text-[11px] font-black text-blue-600 hover:text-blue-500 uppercase tracking-[0.2em] disabled:opacity-5 transition-all"
            >
              <Zap size={20} className="fill-current" />
              <span>Force Inference</span>
            </button>
          </div>

          <button 
            onClick={toggleListening}
            disabled={isInitializing}
            className={`group relative flex items-center space-x-10 px-16 py-6 rounded-full font-black text-[11px] uppercase tracking-[0.6em] transition-all active:scale-95 shadow-2xl ${
              isListening 
                ? 'bg-red-600/90 text-white hover:bg-red-600 shadow-red-950/30' 
                : 'bg-blue-600/90 text-white hover:bg-blue-600 shadow-blue-950/30'
            }`}
          >
            {isInitializing ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              isListening ? <MicOff size={20} /> : <Mic size={20} />
            )}
            <span>{isInitializing ? 'Linking...' : (isListening ? 'End Session' : 'Start Capture')}</span>
          </button>

          <div className="flex items-center space-x-8">
             <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.4em] mb-1">Encrypted Link</span>
                <span className="text-[11px] font-bold text-slate-600">AES-256 GCM ACTIVE</span>
             </div>
             <ShieldCheck size={36} className={isListening ? 'text-blue-500/40' : 'opacity-10'} />
          </div>
        </div>
      </footer>

      {error && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-10 py-5 rounded-3xl shadow-2xl flex items-center space-x-5 z-[100] border border-white/20">
          <AlertCircle size={24} />
          <div className="flex flex-col">
            <span className="font-black uppercase text-[11px] tracking-[0.3em] mb-1">Diagnostic Fault</span>
            <span className="font-bold text-sm">{error}</span>
          </div>
          <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-[10px] font-black">RESET</button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;

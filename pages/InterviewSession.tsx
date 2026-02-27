
import { 
  Mic, 
  MicOff, 
  Trash2,
  Sparkles,
  Activity,
  Plus,
  Minus,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Fingerprint,
  BookOpen,
  Info,
  UserCheck,
  MessageCircle,
  Layout,
  AlertCircle,
  Clock,
  ShieldCheck,
  Save,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  Target,
  Trophy,
  Workflow,
  Search,
  ExternalLink,
  Globe,
  Award,
  Zap,
  Terminal,
  Users,
  MessageSquareQuote,
  Boxes,
  ScrollText,
  BrainCircuit
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { aiService } from '../services/aiService';
import { databaseService } from '../services/databaseService';
import { Scenario, Document, FormatType, AppSettings } from '../types';

interface Segment {
  text: string;
  role: 'INTERVIEWER' | 'CANDIDATE' | 'UNKNOWN';
  timestamp: number;
}

const InterviewSession: React.FC<{ settings: AppSettings }> = ({ settings }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [suggestedAnswer, setSuggestedAnswer] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayFontSize, setDisplayFontSize] = useState(settings.fontSize || 56);
  const [preferredFormat, setPreferredFormat] = useState<FormatType>(FormatType.STAR);
  const [manualLock, setManualLock] = useState<'INTERVIEWER' | 'CANDIDATE' | null>(null);
  const [voiceProfile, setVoiceProfile] = useState(() => localStorage.getItem('user_voice_habits') || "");
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('session_company') || 'Target Company');
  const [roleName, setRoleName] = useState(() => localStorage.getItem('session_role') || 'Senior Lead');
  const [hasApiKey, setHasApiKey] = useState(true);
  const [usedScenarioTitles, setUsedScenarioTitles] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const manualLockRef = useRef<'INTERVIEWER' | 'CANDIDATE' | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);
  const interimTimeoutRef = useRef<number | null>(null);
  const segmentsRef = useRef<Segment[]>([]);

  const preferredFormatRef = useRef<FormatType>(preferredFormat);
  const companyNameRef = useRef<string>(companyName);
  const roleNameRef = useRef<string>(roleName);

  useEffect(() => { preferredFormatRef.current = preferredFormat; }, [preferredFormat]);
  useEffect(() => { companyNameRef.current = companyName; }, [companyName]);
  useEffect(() => { roleNameRef.current = roleName; }, [roleName]);
  useEffect(() => { manualLockRef.current = manualLock; }, [manualLock]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);

  useEffect(() => {
    localStorage.setItem('session_company', companyName);
    localStorage.setItem('session_role', roleName);
  }, [companyName, roleName]);

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [segments, interimTranscript]);

  const triggerCopilot = useCallback(async (text: string, forceRole?: 'INTERVIEWER' | 'CANDIDATE', bypassDebounce: boolean = false) => {
    const queryText = text.trim();
    if (queryText.length < 15) return;

    const now = Date.now();
    
    // CRITICAL: If Candidate Lock is active, block all automatic synthesis to prevent overwriting the current help
    if (manualLockRef.current === 'CANDIDATE' && !forceRole && !bypassDebounce) return;

    // Intelligent debounce: allow faster triggers if question markers are detected
    const isLikelyQuestion = queryText.includes('?') || /^(why|how|what|can you|tell me|explain)/i.test(queryText);
    const debounceLimit = isLikelyQuestion ? 1500 : 4000;
    
    if (!bypassDebounce && now - lastTriggerTimeRef.current < debounceLimit && !forceRole) return;
    
    lastTriggerTimeRef.current = now;
    setIsAnalyzing(true);

    try {
      const result = await aiService.getLiveCopilotSuggestion(
        queryText,
        segmentsRef.current,
        databaseService.getScenarios(),
        companyNameRef.current,
        roleNameRef.current,
        preferredFormatRef.current,
        voiceProfile,
        settings, 
        forceRole || manualLockRef.current,
        usedScenarioTitles
      );
      
      if (result) {
        const finalRole = (forceRole || manualLockRef.current || result.detectedRole) as 'INTERVIEWER' | 'CANDIDATE';
        
        // Only update segments if this is a fresh capture, not a format toggle
        if (!bypassDebounce) {
          setSegments(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === finalRole && (Date.now() - last.timestamp < 30000)) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                text: (last.text + " " + queryText).trim(),
                timestamp: Date.now()
              };
              return updated;
            }
            return [...prev, { text: queryText, role: finalRole, timestamp: Date.now() }];
          });
        }
        
        // If Candidate Lock is active, we NEVER update the suggested answer unless it's a forced re-render (like format change)
        if (manualLockRef.current === 'CANDIDATE' && !bypassDebounce) return;

        if (result.isInterviewerQuestion || finalRole === 'INTERVIEWER' || bypassDebounce) {
          setSuggestedAnswer(result);
          if (result.scenarioTitle && !usedScenarioTitles.includes(result.scenarioTitle)) {
            setUsedScenarioTitles(prev => [...prev, result.scenarioTitle]);
          }
        }
      }
    } catch (err: any) {
      console.warn("Synthesis Engine Lag:", err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [voiceProfile, settings]);

  useEffect(() => {
    const combined = (transcript + ' ' + interimTranscript).trim();
    if (combined.length > 20) {
      triggerCopilot(combined, undefined, true);
    }
  }, [preferredFormat]);

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
    if (interimTimeoutRef.current) {
      window.clearTimeout(interimTimeoutRef.current);
    }
    setIsInitializing(false);
    setIsListening(false);
  };

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected || !!process.env.GEMINI_API_KEY);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const toggleListening = async () => {
    if (isListening) { cleanupAudio(); return; }
    try {
      setError(null);
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) throw new Error("Speech API Unavailable.");

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
          const confidence = res[0].confidence;
          
          // Only filter final results by confidence to avoid blocking real-time interim feedback
          if (res.isFinal && confidence < (settings.asrConfidenceThreshold || 0)) {
            console.log(`ASR Low Confidence (${confidence.toFixed(2)}), skipping segment.`);
            continue;
          }

          const text = res[0].transcript;
          if (res.isFinal) {
            setTranscript(prev => (prev + ' ' + text).trim().slice(-3000));
            transcriptBufferRef.current += ' ' + text;
            
            const words = transcriptBufferRef.current.trim().split(/\s+/);
            if (words.length >= 12) {
              triggerCopilot(transcriptBufferRef.current);
              transcriptBufferRef.current = '';
            }
          } else { 
            interim += text; 
          }
        }
        setInterimTranscript(interim);

        // Responsive interim trigger for faster feedback
        if (interim.split(/\s+/).length >= 15) {
          if (interimTimeoutRef.current) window.clearTimeout(interimTimeoutRef.current);
          interimTimeoutRef.current = window.setTimeout(() => {
            if (interimTranscript) triggerCopilot(interimTranscript);
          }, 1200);
        }
      };
      
      recognition.onend = () => { 
        if (isListeningRef.current) {
          try { recognition.start(); } catch (e) { cleanupAudio(); }
        }
      };

      recognition.onerror = (e: any) => { 
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setError(`ASR Link Error: ${e.error}`);
          cleanupAudio(); 
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      setError(`Hardware Fail: ${e.message}`);
      setIsInitializing(false);
      cleanupAudio();
    }
  };

  const handleManualLock = (role: 'INTERVIEWER' | 'CANDIDATE') => {
    const newLock = manualLock === role ? null : role;
    setManualLock(newLock);
    manualLockRef.current = newLock; // Immediate sync for the ref
    
    const combined = (transcript + ' ' + interimTranscript).trim();
    if (newLock && combined.length > 5) {
      triggerCopilot(combined, newLock, true);
      if (newLock === 'INTERVIEWER') {
        setTranscript(''); 
        setInterimTranscript(''); 
        transcriptBufferRef.current = '';
      }
    }
  };

  const getTagMetadata = (tag: string) => {
    const map: any = {
      S: { label: 'Situation', color: 'bg-slate-900' },
      T: { label: 'Task', color: 'bg-blue-600' },
      A: { label: 'Action', color: 'bg-indigo-600' },
      R: { label: 'Result', color: 'bg-emerald-600' },
      L: { label: 'Logic', color: 'bg-violet-600' },
      I: { label: 'Expertise', color: 'bg-cyan-600' },
      Tr: { label: 'Wisdom', color: 'bg-amber-600' },
      V: { label: 'Impact', color: 'bg-indigo-700' }
    };
    return map[tag] || { label: 'Insight', color: 'bg-slate-500' };
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-inter">
      {/* HUD Header */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-10 z-50">
        <div className="flex items-center space-x-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Session Context</span>
            <div className="flex items-center space-x-2 group">
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="bg-transparent border-none text-lg font-black text-slate-900 p-0 focus:ring-0 w-auto min-w-[120px] outline-none" placeholder="Company" />
              <span className="text-slate-300 font-bold text-base">/</span>
              <input value={roleName} onChange={e => setRoleName(e.target.value)} className="bg-transparent border-none text-[10px] font-bold text-slate-500 p-0 focus:ring-0 outline-none uppercase tracking-widest" placeholder="Role" />
            </div>
          </div>
          
          <div className="h-10 w-px bg-slate-100"></div>
          
          <div className="flex items-center space-x-8">
            <div className="flex flex-col space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <ScrollText size={10} /> Narrative
              </span>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                {[FormatType.STAR, FormatType.CAR].map((f) => (
                  <button 
                    key={f} 
                    onClick={() => setPreferredFormat(f as FormatType)} 
                    className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${preferredFormat === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100"></div>

            <div className="flex flex-col space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <BrainCircuit size={10} /> Strategy
              </span>
              <button 
                onClick={() => setPreferredFormat(FormatType.LOGICAL)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${preferredFormat === FormatType.LOGICAL ? 'bg-violet-600 border-violet-600 text-white shadow-xl shadow-violet-100' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}
              >
                <Boxes size={14} />
                Logic
              </button>
            </div>
          </div>
          
          <div className="h-10 w-px bg-slate-100"></div>

          <div className="flex flex-col space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inference Core</span>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 rounded-xl">
                <Cpu size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    Gemini 3 Flash
                </span>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-1">
          {!hasApiKey && (
            <button 
              onClick={handleSelectKey}
              className="mr-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-amber-100"
            >
              Select Key
            </button>
          )}
          <button onClick={() => setDisplayFontSize(prev => Math.max(prev - 8, 12))} className="p-3 hover:bg-white rounded-xl text-slate-400"><Minus size={18} /></button>
          <span className="px-6 text-sm font-black text-blue-600 font-mono min-w-[80px] text-center">{displayFontSize}px</span>
          <button onClick={() => setDisplayFontSize(prev => Math.min(prev + 8, 160))} className="p-3 hover:bg-white rounded-xl text-slate-400"><Plus size={18} /></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Transcription Feed */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-100 relative bg-slate-50/20">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar-thin">
            {segments.length === 0 && !interimTranscript && !isInitializing && (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6">
                 <div className="p-8 bg-slate-100 rounded-full animate-pulse">
                    <Mic size={80} className="text-slate-300" />
                 </div>
                 <p className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">Listening Hardware Offline</p>
                 <p className="text-[10px] text-slate-400 font-bold max-w-xs uppercase leading-relaxed text-center">Press Initiate to start real-time context decoding.</p>
              </div>
            )}
            {segments.map((seg, i) => (
              <div key={i} className={`flex flex-col ${seg.role === 'INTERVIEWER' ? 'items-start' : 'items-end'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-2 h-2 rounded-full ${seg.role === 'INTERVIEWER' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${seg.role === 'INTERVIEWER' ? 'text-orange-500' : 'text-emerald-600'}`}>
                    {seg.role} {manualLock === seg.role ? '• LOCKED' : ''}
                  </span>
                </div>
                <div className={`max-w-[85%] p-10 rounded-[3.5rem] text-2xl font-medium leading-relaxed shadow-sm transition-all ${seg.role === 'INTERVIEWER' ? 'bg-white border border-slate-200 text-slate-800' : 'bg-emerald-50/50 border border-emerald-100 text-emerald-900 font-semibold'}`}>{seg.text}</div>
              </div>
            ))}
            {interimTranscript && (
              <div className={`flex flex-col ${manualLock === 'INTERVIEWER' ? 'items-start' : 'items-end'} opacity-50`}>
                <div className="max-w-[85%] p-10 rounded-[3.5rem] text-2xl font-medium leading-relaxed italic text-slate-400">{interimTranscript}...</div>
              </div>
            )}
          </div>
          
          <div className="h-[240px] bg-white border-t border-slate-100 p-10 relative flex items-center shadow-inner overflow-hidden shrink-0">
             {manualLock && (
               <div className="absolute top-4 right-8 flex items-center space-x-2 px-4 py-1.5 bg-blue-600 text-white rounded-full animate-pulse shadow-xl z-20">
                  <Lock size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{manualLock} FOCUS MODE</span>
               </div>
             )}
             <div className="font-black leading-[1.05] tracking-tight transition-all text-slate-900 w-full z-10" style={{ fontSize: `${Math.min(displayFontSize, 44)}px` }}>
                {manualLock === 'CANDIDATE' ? <span className="text-slate-200 italic opacity-30 select-none">ASR Bypass Active.</span> : (
                  <>
                    <span className="opacity-40">{transcript.split(' ').slice(-15, -5).join(' ')} </span>
                    <span>{transcript.split(' ').slice(-5).join(' ')}</span>
                    {interimTranscript && <span className="text-blue-600/40"> {interimTranscript}</span>}
                    <span className="inline-block w-[0.1em] h-[0.9em] ml-3 bg-blue-600 animate-pulse align-middle rounded-sm"></span>
                  </>
                )}
             </div>
          </div>
        </div>

        {/* Right: Intelligence Panel */}
        <aside className="bg-slate-50 flex flex-col shadow-2xl relative z-[60]" style={{ width: `${settings.synthesisWidth}px` }}>
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Zap size={14} />
              </div>
              <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.3em]">
                Live Logic Processor
              </h3>
            </div>
            <div className={`flex items-center space-x-3 ${isAnalyzing ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>
              {isAnalyzing && <RefreshCw size={14} className="animate-spin" />}
              <span className="text-[8px] font-black uppercase tracking-widest">{isAnalyzing ? 'Synthesizing...' : 'Awaiting Data'}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {suggestedAnswer ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                 {/* Intent HUD */}
                 <div className="p-4 bg-slate-900 border border-white/10 rounded-xl shadow-2xl border-l-4 border-l-blue-500 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Fingerprint size={60} className="text-blue-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                         <MessageSquareQuote size={12} className="text-blue-400" />
                         <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Intent Decoded</span>
                      </div>
                      <div className={`flex items-center space-x-2 px-2 py-0.5 rounded-md ${suggestedAnswer.questionType === 'TECHNICAL' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                         <span className="text-[7px] font-black uppercase tracking-tighter">{suggestedAnswer.questionType}</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-200 leading-relaxed italic mb-2">"{suggestedAnswer.detectedQuestion}"</p>
                    {suggestedAnswer.interviewerIntent && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest block mb-1">Interviewer is looking for:</span>
                        <p className="text-[10px] font-medium text-blue-300/80 leading-tight">{suggestedAnswer.interviewerIntent}</p>
                      </div>
                    )}
                 </div>

                 <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Award size={40} className="text-blue-600" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.3em] underline decoration-blue-100 underline-offset-4 font-['Calibri',_sans-serif]">The Hook</span>
                      {suggestedAnswer.scenarioTitle && (
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 italic">
                          Source: {suggestedAnswer.scenarioTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-black italic text-slate-900 leading-tight font-['Calibri',_sans-serif]">"{suggestedAnswer.hook}"</p>
                 </div>
                 
                 <div className="space-y-4">
                    {suggestedAnswer.answer.split(/(?=\[[STARCILT]\]|\[Tr\]|\[V\])/g).filter((p: string) => p.trim()).map((part: string, idx: number) => {
                       const match = part.match(/^\[([STARCILTV]|Tr)\]\s*(.*)/s);
                       if (!match) return <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm"><p className="text-base font-medium text-slate-800 leading-relaxed font-['Calibri',_sans-serif]">{part.trim()}</p></div>;
                       
                       const meta = getTagMetadata(match[1]);
                       
                       return (
                         <div key={idx} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                            <div className={`${meta.color} px-4 py-2 text-white text-[12px] font-black uppercase tracking-widest flex justify-between items-center font-['Calibri',_sans-serif]`}>
                              <span className="flex items-center gap-2">
                                 {match[1] === 'S' && <Globe size={10} />}
                                 {match[1] === 'T' && <Target size={10} />}
                                 {match[1] === 'A' && <Zap size={10} />}
                                 {match[1] === 'R' && <Trophy size={10} />}
                                 {match[1] === 'L' && <BrainCircuit size={10} />}
                                 {meta.label}
                              </span>
                              {(match[1] === 'A' || match[1] === 'I') && <Activity size={10} className="text-white/50 animate-pulse" />}
                            </div>
                            <div className="p-4 text-base font-medium text-slate-800 leading-relaxed font-['Calibri',_sans-serif]">{match[2].trim()}</div>
                         </div>
                       );
                    })}
                 </div>

                 <div className="space-y-2 px-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grounding Tokens</span>
                    <div className="flex flex-wrap gap-2">
                      {suggestedAnswer.bullets?.map((b: string, i: number) => (
                        <div key={i} className="bg-white border border-slate-100 px-3 py-1.5 rounded-xl flex items-center space-x-2 shadow-sm hover:border-blue-300 group">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)] group-hover:scale-125 transition-transform"></div>
                           <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{b}</span>
                        </div>
                      ))}
                    </div>
                 </div>

                 <div className="p-4 bg-slate-900 rounded-xl shadow-2xl flex items-start space-x-4 border border-white/5">
                   <div className="p-3 bg-blue-600 rounded-xl">
                    <TrendingUp size={18} className="text-white" />
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Delivery Strategy</span>
                      <p className="text-sm font-bold text-slate-200 leading-relaxed italic">"{suggestedAnswer.strategy}"</p>
                   </div>
                 </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10 text-center space-y-12 py-20">
                 <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 blur-[100px] opacity-20 rounded-full animate-pulse"></div>
                    <Cpu size={140} className="text-slate-900 relative z-10" />
                 </div>
                 <div className="space-y-4">
                    <p className="text-3xl font-black uppercase tracking-[0.6em] text-slate-900">Decoding...</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 max-w-xs leading-relaxed text-center">Awaiting interviewer question for high-speed synthesis.</p>
                 </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="bg-white border-t border-slate-100 px-12 flex items-center justify-between z-[100] shrink-0" style={{ height: `${settings.footerHeight}px` }}>
        <div className="flex items-center space-x-6">
          <button onClick={() => handleManualLock('INTERVIEWER')} className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] border-2 transition-all ${manualLock === 'INTERVIEWER' ? 'bg-orange-600 border-orange-600 text-white shadow-orange-100' : 'bg-white border-orange-100 text-orange-600 hover:bg-orange-50'}`}>Interviewer Lock</button>
          <button onClick={() => handleManualLock('CANDIDATE')} className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] border-2 transition-all ${manualLock === 'CANDIDATE' ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-100' : 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}>Candidate Lock</button>
        </div>
        
        <button onClick={toggleListening} disabled={isInitializing} className={`h-16 px-24 rounded-[2rem] font-black uppercase tracking-[0.6em] text-[10px] shadow-2xl transition-all active:scale-95 flex items-center space-x-5 ${isListening ? 'bg-red-600 text-white shadow-red-200' : 'bg-blue-600 text-white hover:scale-105 shadow-blue-200'}`}>
          {isInitializing ? <RefreshCw className="animate-spin" size={24} /> : (isListening ? <MicOff size={24} /> : <Mic size={24} />)}
          <span>{isInitializing ? 'Linking' : (isListening ? 'Terminate' : 'Initiate Session')}</span>
        </button>

        <div className="flex flex-col items-end opacity-20 group hover:opacity-100 transition-opacity">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hardware Status</span>
           <Activity size={24} className={isListening ? 'text-blue-600' : 'text-slate-200'} />
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-red-600 text-white px-10 py-6 rounded-[2.5rem] shadow-2xl z-[2000] flex items-center space-x-6 border border-white/20 animate-in fade-in slide-in-from-bottom-6 backdrop-blur-xl">
          <AlertCircle size={24} />
          <span className="text-sm font-black uppercase tracking-widest">{error}</span>
          <button onClick={() => setError(null)} className="ml-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">✕</button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;

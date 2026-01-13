
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Search
} from 'lucide-react';
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
  const [detectedSpeaker, setDetectedSpeaker] = useState<'INTERVIEWER' | 'CANDIDATE' | 'IDLE'>('IDLE');
  const [preferredFormat, setPreferredFormat] = useState<FormatType>(FormatType.STAR);
  const [roleConfidence, setRoleConfidence] = useState(0);
  const [manualLock, setManualLock] = useState<'INTERVIEWER' | 'CANDIDATE' | null>(null);

  const [isEnrollingVoice, setIsEnrollingVoice] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [voiceProfile, setVoiceProfile] = useState(() => localStorage.getItem('user_voice_habits') || "");
  
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('session_company') || 'Target Company');
  const [roleName, setRoleName] = useState(() => localStorage.getItem('session_role') || 'Senior Lead');

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>('');
  const lastTriggerTime = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use a ref for manualLock to access current state inside the recognition callback
  const manualLockRef = useRef<'INTERVIEWER' | 'CANDIDATE' | null>(null);

  useEffect(() => {
    manualLockRef.current = manualLock;
  }, [manualLock]);

  useEffect(() => {
    localStorage.setItem('session_company', companyName);
    localStorage.setItem('session_role', roleName);
  }, [companyName, roleName]);

  useEffect(() => {
    setScenarios(databaseService.getScenarios());
    setDocs(databaseService.getDocuments());
    return () => cleanupAudio();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, interimTranscript]);

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
    setIsEnrollingVoice(false);
  };

  const startVoiceEnrollment = async () => {
    if (isListening) cleanupAudio();
    setIsEnrollingVoice(true);
    setEnrollmentProgress(0);
    transcriptBufferRef.current = "";
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptBufferRef.current += event.results[i][0].transcript + " ";
            const words = transcriptBufferRef.current.trim().split(/\s+/).length;
            const progress = Math.min((words / 30) * 100, 100);
            setEnrollmentProgress(progress);
            if (words >= 30) finishEnrollment(transcriptBufferRef.current);
          }
        }
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      setError("Microphone link failed. Check hardware settings.");
      setIsEnrollingVoice(false);
    }
  };

  const finishEnrollment = async (sample: string) => {
    setIsEnrollingVoice(false);
    setIsAnalyzing(true);
    try {
      const habits = await aiService.generateVoiceProfile(sample);
      setVoiceProfile(habits);
      localStorage.setItem('user_voice_habits', habits);
    } catch (e) {
      setError("Voice analysis interrupted.");
    } finally {
      setIsAnalyzing(false);
      cleanupAudio();
    }
  };

  const triggerCopilot = useCallback(async (text: string, forceRole?: 'INTERVIEWER' | 'CANDIDATE') => {
    const queryText = (text || transcript + ' ' + interimTranscript).trim();
    const activeRole = forceRole || manualLock;
    
    if (!activeRole && queryText.length < 10) return;
    
    const now = Date.now();
    if (!activeRole && now - lastTriggerTime.current < 2500) return;
    lastTriggerTime.current = now;

    setIsAnalyzing(true);
    setError(null);
    try {
      const currentScenarios = databaseService.getScenarios();
      const result = await aiService.getLiveCopilotSuggestion(
        queryText,
        currentScenarios,
        companyName,
        roleName,
        preferredFormat,
        voiceProfile,
        settings,
        activeRole
      );
      
      if (result) {
        setRoleConfidence(result.confidence);
        const finalRole = activeRole || result.detectedRole;
        setDetectedSpeaker(finalRole);
        
        setSegments(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === finalRole) {
            const newSegments = [...prev];
            newSegments[newSegments.length - 1] = {
              ...last,
              text: (last.text + ' ' + queryText).trim()
            };
            return newSegments;
          }
          return [...prev, { text: queryText, role: finalRole as any, timestamp: now }];
        });

        // Sticky logic: don't overwrite prompter if candidate is speaking
        if (activeRole === 'CANDIDATE' || finalRole === 'CANDIDATE') {
          // Keep current view
        } else if (result.isInterviewerQuestion || finalRole === 'INTERVIEWER') {
          setSuggestedAnswer(result);
        }
      }
    } catch (err: any) {
      console.error("Inference Error:", err);
      setError(err.message || "Engine Error. Retrying connection...");
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyName, roleName, transcript, interimTranscript, preferredFormat, voiceProfile, settings, manualLock]);

  const toggleListening = async () => {
    if (isListening) { cleanupAudio(); return; }
    try {
      setError(null);
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) throw new Error("Voice Link unsupported in this browser.");

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => { setIsListening(true); setIsInitializing(false); isListeningRef.current = true; };
      recognition.onresult = (event: any) => {
        // Stop recording/processing if Candidate is manually selected for privacy
        if (manualLockRef.current === 'CANDIDATE') {
          setInterimTranscript(''); // Clear visual feedback
          return;
        }

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            setTranscript(prev => (prev + ' ' + text).trim().slice(-1500));
            transcriptBufferRef.current += ' ' + text;
            if (transcriptBufferRef.current.split(' ').length >= 6) {
              triggerCopilot(transcriptBufferRef.current);
              transcriptBufferRef.current = '';
            }
          } else { interim += text; }
        }
        setInterimTranscript(interim);
      };
      
      // Strict user control: only restart if explicitly desired
      recognition.onend = () => { if (isListeningRef.current) recognition.start(); };
      
      recognition.onerror = (e: any) => { 
        const errorMsg = e.error || "Unknown recognition error";
        if (errorMsg === 'no-speech' || errorMsg === 'aborted') {
          console.debug("Speech Recognition Status:", errorMsg);
          return;
        }
        console.error("Speech Recognition Error:", errorMsg, e); 
        setError(`Speech Recognition Link Lost: ${errorMsg}`);
        cleanupAudio(); 
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      setError(`Microphone Link Failed: ${e.message}`);
      setIsInitializing(false);
      cleanupAudio();
    }
  };

  const handleManualInference = (role: 'INTERVIEWER' | 'CANDIDATE') => {
    const combined = (transcript + ' ' + interimTranscript).trim();
    if (manualLock === role) {
      setManualLock(null);
    } else {
      setManualLock(role);
      // Immediately process existing buffer if switching to INTERVIEWER
      if (role === 'INTERVIEWER' && combined.length > 2) {
        triggerCopilot(combined, role);
        setTranscript('');
        setInterimTranscript('');
        transcriptBufferRef.current = '';
      }
      // If locking to CANDIDATE, clear buffers as we prioritize privacy in that mode
      if (role === 'CANDIDATE') {
        setTranscript('');
        setInterimTranscript('');
        transcriptBufferRef.current = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-inter">
      {/* HUD Header */}
      <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 z-50">
        <div className="flex items-center space-x-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Persona</span>
            <div className="flex items-center space-x-3 group">
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="bg-transparent border-none text-2xl font-black text-slate-900 p-0 focus:ring-0 w-auto min-w-[150px] outline-none" placeholder="Company" />
              <span className="text-slate-300 font-bold text-xl">/</span>
              <input value={roleName} onChange={e => setRoleName(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-500 p-0 focus:ring-0 outline-none uppercase tracking-widest" placeholder="Role" />
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100"></div>
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
            {Object.values(FormatType).map((f) => (
              <button 
                key={f} 
                onClick={() => setPreferredFormat(f as FormatType)} 
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preferredFormat === f ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-8">
           <button 
              onClick={startVoiceEnrollment}
              disabled={isListening || isInitializing || isEnrollingVoice}
              className={`flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border shadow-sm ${
                voiceProfile ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'
              } disabled:opacity-40`}
           >
             {voiceProfile ? <CheckCircle2 size={16} /> : <Fingerprint size={16} />}
             <span>{voiceProfile ? 'Evidence Profile Ready' : 'Build Evidence Profile'}</span>
           </button>
           <div className="h-10 w-px bg-slate-100"></div>
           <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-1">
             <button onClick={() => setDisplayFontSize(prev => Math.max(prev - 8, 12))} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-colors"><Minus size={18} /></button>
             <span className="px-6 text-sm font-black text-blue-600 font-mono min-w-[80px] text-center">{displayFontSize}px</span>
             <button onClick={() => setDisplayFontSize(prev => Math.min(prev + 8, 160))} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-colors"><Plus size={18} /></button>
           </div>
        </div>
      </header>

      {/* Main Stream View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Live Feed */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-100 relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-12 bg-slate-50/10 custom-scrollbar-thin">
            {isEnrollingVoice && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl animate-pulse">
                  <Mic size={40} />
                </div>
                <div className="max-w-md space-y-4">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Profiling Voice</h2>
                  <p className="text-slate-500 font-medium leading-relaxed italic">Speak naturally about your career milestones to establish your linguistic fingerprint.</p>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${enrollmentProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}
            {!isEnrollingVoice && segments.map((seg, i) => (
              <div key={i} className={`flex flex-col ${seg.role === 'INTERVIEWER' ? 'items-start' : 'items-end'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${seg.role === 'INTERVIEWER' ? 'text-orange-500' : 'text-emerald-600'}`}>
                    {seg.role} {seg.role === manualLock ? '(LOCKED)' : ''}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${seg.role === 'INTERVIEWER' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                </div>
                <div className={`max-w-[85%] p-10 rounded-[3.5rem] text-2xl font-medium leading-relaxed shadow-sm transition-all hover:shadow-md ${
                  seg.role === 'INTERVIEWER' ? 'bg-white border border-slate-200 text-slate-800' : 'bg-emerald-50/50 border border-emerald-100 text-emerald-900 font-semibold'
                }`}>
                  {seg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="h-[220px] bg-white border-t border-slate-100 p-8 relative flex items-center shadow-inner overflow-hidden shrink-0">
             <div className="absolute top-4 left-8 flex items-center space-x-3 opacity-30">
                <ShieldCheck size={14} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest">Neural Grounding Stream :: Secure Link</span>
             </div>
             
             {manualLock && (
               <div className="absolute top-4 right-8 flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg animate-pulse shadow-lg">
                  <Lock size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{manualLock} LOCK ACTIVE</span>
               </div>
             )}

             <div className="font-black leading-[1.05] tracking-tight transition-all text-slate-900 w-full" style={{ fontSize: `${Math.min(displayFontSize, 48)}px` }}>
                {manualLock === 'CANDIDATE' ? (
                  <span className="text-slate-300 font-medium italic opacity-50 select-none">Candidate response mode active — audio capturing paused.</span>
                ) : (
                  <>
                    {transcript.split(' ').slice(-12).join(' ')}
                    {interimTranscript && <span className="text-slate-300"> {interimTranscript}</span>}
                    <span className="inline-block w-[0.1em] h-[0.9em] ml-3 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)] animate-pulse align-middle rounded-sm"></span>
                  </>
                )}
             </div>
          </div>
        </div>

        {/* Right: Synthesis Panel */}
        <aside 
          className="bg-slate-50 flex flex-col shadow-2xl relative z-[60]"
          style={{ width: `${settings.synthesisWidth}px` }}
        >
          <div className="p-10 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em]">Evidence-Based Response</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{settings.aiProvider === 'openai' ? `OpenAI ${settings.aiModel}` : 'Gemini 2.0'}</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 flex items-center justify-center ${isAnalyzing ? 'text-blue-600 animate-spin' : 'text-slate-300'}`}>
                <RefreshCw size={18} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAnalyzing ? 'Analyzing' : 'Ready'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
            {suggestedAnswer ? (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-700">
                 {/* Grounding Check */}
                 <div className="flex items-center space-x-3 px-4">
                    <Search size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Evidence Match: High Grounding</span>
                 </div>

                 <div className="p-12 bg-white border border-slate-100 rounded-[3.5rem] relative shadow-2xl shadow-slate-200/50 group">
                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4 block">Recommended Opening</span>
                    <p className="text-3xl font-black italic text-slate-900 leading-tight">"{suggestedAnswer.hook}"</p>
                 </div>

                 <div className="space-y-8">
                   <div className="flex items-center justify-between px-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <Workflow size={20} />
                        </div>
                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">{suggestedAnswer.formatType} Structure</span>
                      </div>
                   </div>

                   <div className="space-y-6">
                      {suggestedAnswer.answer.split(/(?=\[[STARC]\])/g).filter((p: string) => p.trim()).map((part: string, idx: number) => {
                         const match = part.match(/^\[([STARC])\]\s*(.*)/s);
                         if (!match) return (
                           <div key={idx} className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm transition-all group hover:shadow-xl hover:border-blue-100">
                             <p className="text-lg font-medium text-slate-800 leading-relaxed">{part.trim()}</p>
                           </div>
                         );
                         
                         const [, label, content] = match;
                         const labelMap: any = { S: 'Situation', T: 'Task', A: 'Action', R: 'Result', C: 'Context' };
                         const iconMap: any = { S: <Target size={16}/>, T: <Clock size={16}/>, A: <Activity size={16}/>, R: <Trophy size={16}/>, C: <Layout size={16}/> };
                         const colorMap: any = { S: 'bg-slate-900', T: 'bg-blue-600', A: 'bg-indigo-600', R: 'bg-emerald-600', C: 'bg-slate-700' };
                         
                         return (
                           <div key={idx} className="bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden group hover:shadow-xl hover:border-blue-100 transition-all">
                              <div className={`${colorMap[label]} px-10 py-4 flex items-center justify-between text-white`}>
                                <div className="flex items-center space-x-3">
                                    {iconMap[label]}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{labelMap[label]}</span>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                              </div>
                              <div className="p-10">
                                <p className="text-lg font-medium text-slate-800 leading-relaxed">{content.trim()}</p>
                              </div>
                           </div>
                         );
                      })}
                   </div>
                 </div>

                 <div className="p-10 bg-slate-900 rounded-[3.5rem] shadow-2xl flex items-start space-x-8 border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                   <div className="w-14 h-14 rounded-3xl bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0 border border-blue-600/20">
                      <TrendingUp size={28} />
                   </div>
                   <div className="space-y-2">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Expert Directive</span>
                      <p className="text-base font-bold text-slate-200 leading-relaxed italic">"{suggestedAnswer.strategy}"</p>
                   </div>
                 </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-8">
                 <Cpu size={140} strokeWidth={0.5} className="text-slate-300 animate-pulse" />
                 <p className="text-3xl font-black uppercase tracking-[0.6em]">System Standby</p>
                 <p className="text-xs font-bold uppercase tracking-widest text-slate-400 max-w-[320px]">Analyzing audio against evidence vault...</p>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Control Station (Speaker Ribbon) */}
      <footer 
        className="bg-white border-t border-slate-100 px-12 flex items-center justify-between shadow-[0_-15px_40px_-10px_rgba(0,0,0,0.05)] z-[100] shrink-0"
        style={{ height: `${settings.footerHeight}px` }}
      >
        <div className="flex items-center space-x-8 h-full">
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Sync Lock</span>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleManualInference('INTERVIEWER')}
                className={`flex items-center space-x-3 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] transition-all border-2 shadow-lg active:scale-95 ${
                  manualLock === 'INTERVIEWER' ? 'bg-orange-600 border-orange-600 text-white scale-105' : 'bg-white border-orange-100 text-orange-600 hover:bg-orange-50'
                }`}
              >
                {manualLock === 'INTERVIEWER' ? <Lock size={16} /> : <MessageCircle size={16} />}
                <span>Interviewer</span>
              </button>
              <button 
                onClick={() => handleManualInference('CANDIDATE')}
                className={`flex items-center space-x-3 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] transition-all border-2 shadow-lg active:scale-95 ${
                  manualLock === 'CANDIDATE' ? 'bg-emerald-600 border-emerald-600 text-white scale-105' : 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {manualLock === 'CANDIDATE' ? <Lock size={16} /> : <UserCheck size={16} />}
                <span>Candidate</span>
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={toggleListening}
          disabled={isInitializing || isEnrollingVoice}
          className={`relative z-10 h-14 px-20 rounded-[2rem] font-black uppercase tracking-[0.6em] text-[10px] transition-all active:scale-95 shadow-xl flex items-center space-x-4 ${
            isListening ? 'bg-red-600 text-white shadow-red-200' : 'bg-blue-600 text-white hover:scale-105 shadow-blue-200'
          } disabled:opacity-40`}
        >
          {isInitializing ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            isListening ? <MicOff size={20} /> : <Mic size={20} />
          )}
          <span>{isInitializing ? 'Linking' : (isListening ? 'Stop Link' : 'Start Link')}</span>
        </button>

        <div className="flex items-center space-x-8">
           <div className="flex flex-col items-end opacity-40">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
              <Activity size={24} className={`transition-all duration-1000 ${isListening ? 'text-blue-600' : 'text-slate-200'}`} />
           </div>
        </div>
      </footer>

      {error && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 bg-red-600 text-white px-10 py-6 rounded-[2.5rem] shadow-2xl z-[2000] flex items-center space-x-6 animate-in fade-in slide-in-from-top-6 border border-white/20 backdrop-blur-xl">
          <AlertCircle size={24} />
          <span className="text-sm font-black uppercase tracking-widest">{error}</span>
          <button onClick={() => setError(null)} className="ml-6 hover:scale-110 transition-transform bg-white/10 p-2 rounded-full">✕</button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;

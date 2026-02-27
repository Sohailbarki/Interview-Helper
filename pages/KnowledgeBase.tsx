
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  FileText,
  Loader2,
  XCircle,
  Save,
  FileCode,
  FileUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Scenario, FormatType, Document } from '../types';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const KnowledgeBase: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingScenario, setEditingScenario] = useState<Partial<Scenario>>({
    title: '',
    format: FormatType.STAR,
    situation: '',
    task: '',
    action: '',
    result: '',
    tags: []
  });

  const [editingDoc, setEditingDoc] = useState<Partial<Document>>({
    title: '',
    type: 'CV',
    content: ''
  });

  useEffect(() => {
    setScenarios(databaseService.getScenarios());
    setDocs(databaseService.getDocuments());
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveScenario = () => {
    if (!editingScenario.title) return;
    const newScenario: Scenario = {
      id: editingScenario.id || Date.now().toString(),
      title: editingScenario.title || '',
      format: editingScenario.format || FormatType.STAR,
      situation: editingScenario.situation || '',
      task: editingScenario.task || '',
      action: editingScenario.action || '',
      result: editingScenario.result || '',
      tags: editingScenario.tags || []
    };
    databaseService.saveScenario(newScenario);
    setScenarios(databaseService.getScenarios());
    setIsModalOpen(false);
    showToast("Scenario synced to vault");
  };

  const handleSaveDoc = () => {
    if (!editingDoc.content) return;
    const newDoc: Document = {
      id: editingDoc.id || Date.now().toString(),
      title: editingDoc.title || 'Professional Context',
      type: editingDoc.type || 'CV',
      content: editingDoc.content || '',
      createdAt: new Date().toISOString()
    };
    databaseService.saveDocument(newDoc);
    setDocs(databaseService.getDocuments());
    setIsDocModalOpen(false);
    setEditingDoc({ title: '', type: 'CV', content: '' });
    showToast("Document successfully synced");
  };

  const handleDeleteScenario = (id: string) => {
    if (confirm('Permanently remove this scenario from the vault?')) {
      databaseService.deleteScenario(id);
      setScenarios(databaseService.getScenarios());
      showToast("Scenario purged");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setProcessingProgress(0);
    setProcessingStatus('Initializing...');
    
    if (file.size > MAX_FILE_SIZE) { 
      setFileError("File limit exceeded (5MB)."); 
      return; 
    }
    
    setIsProcessingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";
      
      if (file.name.endsWith(".pdf")) {
        setProcessingStatus('Loading PDF structure...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        
        loadingTask.onProgress = (progressData: { loaded: number, total: number }) => {
          const percent = Math.round((progressData.loaded / progressData.total) * 100);
          setProcessingProgress(percent);
        };

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        for (let i = 1; i <= numPages; i++) {
          setProcessingStatus(`Extracting page ${i} of ${numPages}...`);
          setProcessingProgress(Math.round((i / numPages) * 100));
          
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          } catch (pageErr) {
            console.error(`Error on page ${i}:`, pageErr);
            text += `\n[Error extracting page ${i}]\n`;
          }
        }
      } else if (file.name.endsWith(".docx")) {
        setProcessingStatus('Parsing DOCX structure...');
        setProcessingProgress(30);
        
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result.messages.length > 0) {
          console.warn("Mammoth messages:", result.messages);
        }
        
        text = result.value;
        setProcessingProgress(100);
        setProcessingStatus('Extraction complete.');
      } else {
        throw new Error("Format unsupported. Please use PDF or DOCX.");
      }
      
      if (!text.trim()) {
        throw new Error("No readable text content found in the document.");
      }
      
      setEditingDoc({ ...editingDoc, title: file.name, content: text });
      showToast("Content extracted successfully");
    } catch (err: any) { 
      console.error("File processing error:", err);
      setFileError(`Extraction Failed: ${err.message}`); 
    } finally { 
      setIsProcessingFile(false); 
      setProcessingProgress(0);
      setProcessingStatus('');
    }
  };

  const filteredScenarios = scenarios.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-12 bg-white min-h-screen relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[300] flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <CheckCircle2 size={18} />
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Knowledge Infrastructure</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">The Neural Vault.</h1>
          <p className="text-slate-500 mt-2 font-medium">Equip your AI assistant with the context of your career history.</p>
        </div>
        <div className="flex space-x-4">
          <button onClick={() => setIsDocModalOpen(true)} className="flex items-center space-x-3 bg-white hover:bg-slate-50 text-slate-900 px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest border border-slate-200 transition-all shadow-sm">
            <FileCode size={18} className="text-blue-600" />
            <span>Sync Assets</span>
          </button>
          <button onClick={() => { setEditingScenario({ title: '', format: FormatType.STAR, situation: '', task: '', action: '', result: '', tags: [] }); setIsModalOpen(true); }} className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95">
            <Plus size={18} />
            <span>New Narrative</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {docs.map(doc => (
          <div key={doc.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center justify-between group shadow-sm hover:border-blue-200 transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">{doc.title}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{doc.type}</p>
              </div>
            </div>
            <button onClick={() => { databaseService.deleteDocument(doc.id); setDocs(databaseService.getDocuments()); showToast("Asset removed"); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
        <input 
          type="text" 
          placeholder="Filter scenarios by competencies, role, or project keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 rounded-[2.5rem] py-6 pl-16 pr-8 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredScenarios.map((s) => (
          <div key={s.id} className="bg-white border border-slate-100 rounded-[3rem] p-10 hover:shadow-2xl hover:shadow-slate-100 hover:border-blue-100 transition-all group flex flex-col relative">
            <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                <button onClick={() => { setEditingScenario(s); setIsModalOpen(true); }} className="p-3 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl text-slate-400 transition-all"><Edit3 size={16} /></button>
                <button onClick={() => handleDeleteScenario(s.id)} className="p-3 bg-slate-50 hover:bg-red-500 hover:text-white rounded-2xl text-slate-400 transition-all"><Trash2 size={16} /></button>
            </div>
            <div className="mb-6">
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl tracking-widest shadow-sm">{s.format}</span>
              <h3 className="font-black text-xl mt-4 text-slate-900 tracking-tight leading-tight">{s.title}</h3>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed flex-1 italic line-clamp-4">"{s.action || 'Focus area defined.'}"</p>
            <div className="flex flex-wrap gap-2 mt-8">
              {s.tags.map(tag => (
                <span key={tag} className="text-[9px] font-black bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg uppercase tracking-wider">#{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-white">
            <div className="p-12 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Draft Narrative.</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">STAR / CAR Framework Structure</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 rounded-3xl hover:bg-red-50 hover:text-red-500 transition-all"><XCircle size={32} strokeWidth={1.5} /></button>
            </div>
            <div className="p-12 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Headline</label>
                <input 
                  type="text" placeholder="e.g. Scaling User Acquisition"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 outline-none focus:bg-white focus:border-blue-400 font-bold text-slate-900 transition-all"
                  value={editingScenario.title}
                  onChange={e => setEditingScenario({...editingScenario, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Core Action & Evidence</label>
                <textarea 
                  placeholder="Describe your primary technical or leadership actions..." rows={6}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 outline-none focus:bg-white focus:border-blue-400 font-medium text-slate-800 transition-all"
                  value={editingScenario.action}
                  onChange={e => setEditingScenario({...editingScenario, action: e.target.value})}
                />
              </div>
              <button onClick={handleSaveScenario} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-slate-200 transition-all hover:bg-black active:scale-95">Sync to Vault</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Doc Modal with Preview */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-12 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Sync Assets.</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Grounding documents for AI context</p>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 rounded-3xl hover:bg-red-50 hover:text-red-500 transition-all"><XCircle size={32} strokeWidth={1.5} /></button>
            </div>
            
            <div className="p-12 space-y-8 overflow-y-auto">
              {!editingDoc.content ? (
                <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[3rem] p-16 bg-slate-50/30 hover:border-blue-100 transition-all group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx" className="hidden" />
                  {isProcessingFile ? (
                    <div className="flex flex-col items-center space-y-6 w-full px-8">
                      <div className="relative flex items-center justify-center">
                        <RefreshCw size={64} className="text-blue-600 animate-spin opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-black text-blue-600">{processingProgress}%</span>
                        </div>
                      </div>
                      <div className="w-full space-y-2">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full transition-all duration-300 ease-out"
                            style={{ width: `${processingProgress}%` }}
                          />
                        </div>
                        <p className="font-black text-slate-900 uppercase tracking-widest text-[10px] text-center animate-pulse">
                          {processingStatus}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <FileUp size={48} className="text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
                      <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Drop Experience</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PDF / DOCX Limit 5MB</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileText size={16} />
                      </div>
                      <span className="font-black text-slate-900 uppercase tracking-tighter text-sm">{editingDoc.title}</span>
                    </div>
                    <button onClick={() => setEditingDoc({type:'CV', content:''})} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Clear</button>
                  </div>
                  
                  <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar-thin">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {editingDoc.content}
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <select 
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest text-slate-900 outline-none"
                      value={editingDoc.type}
                      onChange={e => setEditingDoc({...editingDoc, type: e.target.value as any})}
                    >
                      <option value="CV">Curriculum Vitae</option>
                      <option value="JD">Job Description</option>
                      <option value="Notes">Context Notes</option>
                    </select>
                    <button onClick={handleSaveDoc} className="flex-1 bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center space-x-3">
                      <Save size={16} />
                      <span>Sync to Vault</span>
                    </button>
                  </div>
                </div>
              )}
              {fileError && <p className="text-red-500 text-center text-xs font-black uppercase">{fileError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

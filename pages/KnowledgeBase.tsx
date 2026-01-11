
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Tag, 
  Edit3, 
  Trash2, 
  FileText,
  Upload,
  CheckCircle,
  Loader2,
  XCircle,
  Save,
  FileCode,
  FileUp,
  AlertCircle,
  File
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Scenario, FormatType, Document } from '../types';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const KnowledgeBase: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingScenario, setEditingScenario] = useState<Partial<Scenario>>({
    format: FormatType.STAR,
    tags: []
  });

  const [editingDoc, setEditingDoc] = useState<Partial<Document>>({
    type: 'CV',
    content: ''
  });

  useEffect(() => {
    setScenarios(databaseService.getScenarios());
    setDocs(databaseService.getDocuments());
  }, []);

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
    setEditingDoc({ type: 'CV', content: '' });
    setFileError(null);
  };

  const handleDeleteScenario = (id: string) => {
    if (confirm('Delete this scenario?')) {
      databaseService.deleteScenario(id);
      setScenarios(databaseService.getScenarios());
    }
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm('Remove this document from AI context?')) {
      databaseService.deleteDocument(id);
      setDocs(databaseService.getDocuments());
    }
  };

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Limit is 5MB.");
      return;
    }

    setIsProcessingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        text = await extractTextFromPDF(arrayBuffer);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        file.name.endsWith(".docx")
      ) {
        text = await extractTextFromDocx(arrayBuffer);
      } else {
        throw new Error("Unsupported file format. Please upload PDF or DOCX.");
      }

      if (!text.trim()) {
        throw new Error("Could not extract any text from this file.");
      }

      // Auto-populate the form with extracted text
      setEditingDoc({
        ...editingDoc,
        title: file.name,
        content: text
      });

    } catch (err: any) {
      console.error("File processing failed:", err);
      setFileError(err.message || "Failed to process file.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredScenarios = scenarios.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
          <p className="text-slate-400 mt-1">Populate your AI context with STAR scenarios and your CV.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium border border-slate-700 transition-all"
          >
            <FileCode size={18} />
            <span>Manage CV/Docs</span>
          </button>
          <button 
            onClick={() => { setEditingScenario({ format: FormatType.STAR, tags: [] }); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all"
          >
            <Plus size={18} />
            <span>New Scenario</span>
          </button>
        </div>
      </div>

      {/* Docs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.length > 0 ? (
          docs.map(doc => (
            <div key={doc.id} className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between group transition-all hover:bg-blue-600/15">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-600/20 p-2.5 rounded-lg">
                  <FileText size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-100">{doc.title}</p>
                  <p className="text-[10px] text-blue-300/60 uppercase tracking-widest font-black">{doc.type} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 bg-slate-900/40 border-2 border-dashed border-slate-800 p-8 rounded-3xl text-center">
            <FileUp size={40} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500 font-medium">No documents uploaded. Your AI will lack personal context.</p>
            <button onClick={() => setIsDocModalOpen(true)} className="text-blue-500 text-sm font-bold mt-2 hover:underline">Upload CV / Resume</button>
          </div>
        )}
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search scenarios by role, skill, or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800 focus:border-blue-500/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredScenarios.map((s) => (
          <div key={s.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group relative flex flex-col">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <button onClick={() => { setEditingScenario(s); setIsModalOpen(true); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><Edit3 size={14} /></button>
                <button onClick={() => handleDeleteScenario(s.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"><Trash2 size={14} /></button>
            </div>
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase text-blue-500 bg-blue-500/10 px-2 py-1 rounded">{s.format}</span>
              <h3 className="font-bold text-lg mt-3 text-slate-100">{s.title}</h3>
            </div>
            <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed flex-1 italic">"{s.action || 'Focus: ' + s.title}"</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {s.tags.map(tag => (
                <span key={tag} className="text-[9px] font-bold bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">#{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Edit STAR Scenario</h2>
              <button onClick={() => setIsModalOpen(false)}><XCircle size={28} className="text-slate-500" /></button>
            </div>
            <div className="p-8 space-y-6">
              <input 
                type="text" placeholder="Scenario Title (e.g. Migration Project)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500"
                value={editingScenario.title}
                onChange={e => setEditingScenario({...editingScenario, title: e.target.value})}
              />
              <textarea 
                placeholder="The specific Action you took..." rows={5}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none"
                value={editingScenario.action}
                onChange={e => setEditingScenario({...editingScenario, action: e.target.value})}
              />
              <input 
                type="text" placeholder="Tags (comma separated)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 outline-none"
                value={editingScenario.tags?.join(', ')}
                onChange={e => setEditingScenario({...editingScenario, tags: e.target.value.split(',').map(t => t.trim())})}
              />
              <button onClick={handleSaveScenario} className="w-full bg-blue-600 py-3 rounded-xl font-bold">Save Scenario</button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-2xl font-bold">Professional Context</h2>
                <p className="text-sm text-slate-500">Add documents to ground your AI Copilot.</p>
              </div>
              <button onClick={() => { setIsDocModalOpen(false); setFileError(null); }}><XCircle size={28} className="text-slate-500" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6">
              {/* File Upload Area */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2rem] p-10 bg-slate-950/30 transition-all hover:border-blue-500/50 group">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx"
                  className="hidden"
                />
                
                {isProcessingFile ? (
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 size={48} className="text-blue-500 animate-spin" />
                    <p className="text-blue-400 font-black uppercase tracking-widest text-xs">Parsing Document Layers...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-blue-600/10 p-5 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                      <FileUp size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">Upload PDF or Word</p>
                      <p className="text-xs text-slate-500 mt-1">Up to 5MB. AI will extract core experience context.</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center space-x-3 text-red-400 text-xs font-bold">
                  <AlertCircle size={18} />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-600 text-[10px] font-black uppercase tracking-widest">Or Paste Manually</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Document Title</label>
                  <select 
                    value={editingDoc.type}
                    onChange={e => setEditingDoc({...editingDoc, type: e.target.value as any})}
                    className="bg-slate-800 text-xs font-bold p-1.5 rounded-lg border border-slate-700 outline-none"
                  >
                    <option value="CV">RESUME / CV</option>
                    <option value="JD">JOB DESCRIPTION</option>
                    <option value="Notes">RAW NOTES</option>
                  </select>
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Engineer CV 2024"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-blue-500"
                  value={editingDoc.title || ''}
                  onChange={e => setEditingDoc({...editingDoc, title: e.target.value})}
                />
                <textarea 
                  placeholder="Raw text for context..."
                  rows={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 outline-none font-mono text-sm"
                  value={editingDoc.content}
                  onChange={e => setEditingDoc({...editingDoc, content: e.target.value})}
                />
              </div>

              <button 
                onClick={handleSaveDoc} 
                disabled={!editingDoc.content}
                className="w-full bg-slate-100 hover:bg-white text-slate-900 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Save size={18} />
                <span>Sync with Knowledge Base</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

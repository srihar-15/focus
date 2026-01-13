
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  LearningConcept, 
  LCStatus, 
  AttachedFile 
} from '../types';
import { 
  ArrowLeft, 
  Upload, 
  File as FileIcon, 
  Trash2, 
  Calendar, 
  History, 
  Download,
  CheckCircle2,
  FileCode,
  FileImage,
  FileText,
  Star,
  Zap,
  Clock,
  X,
  Save,
  Maximize2,
  Link as LinkIcon,
  ExternalLink,
  Globe,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileSearch,
  BookOpen
} from 'lucide-react';
import { formatDistanceToNow, format, isAfter } from 'date-fns';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';

interface StagedFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  previewUrl?: string;
  abortController?: AbortController;
}

interface LCDetailProps {
  lc: LearningConcept;
  onBack: () => void;
  onUpload: (file: File, onProgress: (p: number) => void, signal?: AbortSignal) => Promise<void>;
  onAddLink: (title: string, url: string) => void;
  onRemoveFile: (fileId: string) => void;
  onMarkRevised: (quality: number) => void;
}

const LCDetail: React.FC<LCDetailProps> = ({ lc, onBack, onUpload, onAddLink, onRemoveFile, onMarkRevised }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRating, setShowRating] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ title: '', url: '' });

  // Cleanup effect for Blob URLs
  useEffect(() => {
    return () => {
      stagedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [stagedFiles, pdfBlobUrl]);

  // Handle PDF Blob conversion for reliable preview
  useEffect(() => {
    if (previewFile?.type === 'application/pdf') {
      try {
        const base64Content = previewFile.data.split(',')[1];
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (e) {
        console.error("PDF conversion failed", e);
      }
    } else {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }, [previewFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files) as File[];
      
      const newStaged: StagedFile[] = selectedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 11),
        file,
        status: 'pending',
        progress: 0,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      }));
      
      setStagedFiles(prev => [...prev, ...newStaged]);
      if (e.target) e.target.value = '';
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.status === 'uploading') {
        target.abortController?.abort();
      }
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadSingleFile = useCallback(async (stagedId: string) => {
    const controller = new AbortController();
    
    setStagedFiles(prev => prev.map(f => 
      f.id === stagedId ? { ...f, status: 'uploading', progress: 0, error: undefined, abortController: controller } : f
    ));
    
    try {
      const currentFiles = await new Promise<StagedFile[]>((resolve) => {
        setStagedFiles(prev => { resolve(prev); return prev; });
      });
      const target = currentFiles.find(f => f.id === stagedId);
      if (!target) return;
      
      await onUpload(target.file, (p) => {
        setStagedFiles(prev => prev.map(f => 
          f.id === stagedId ? { ...f, progress: p } : f
        ));
      }, controller.signal);
      
      setStagedFiles(prev => prev.map(f => 
        f.id === stagedId ? { ...f, status: 'success', progress: 100, abortController: undefined } : f
      ));
    } catch (err: any) {
      if (err.message === 'Upload cancelled by user.') {
        setStagedFiles(prev => prev.map(f => 
          f.id === stagedId ? { ...f, status: 'cancelled', abortController: undefined } : f
        ));
      } else {
        setStagedFiles(prev => prev.map(f => 
          f.id === stagedId ? { 
            ...f, 
            status: 'error', 
            error: err.message || "Upload failed",
            abortController: undefined
          } : f
        ));
      }
    }
  }, [onUpload]);

  const handleConfirmUpload = async () => {
    const toUpload = stagedFiles.filter(f => f.status === 'pending' || f.status === 'error' || f.status === 'cancelled');
    for (const staged of toUpload) {
      await uploadSingleFile(staged.id);
    }
  };

  const clearFinished = () => {
    setStagedFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const getFileIcon = (type: string, isSmall: boolean = false) => {
    const size = isSmall ? 16 : 24;
    if (type === 'link') return <Globe className="text-sky-500" size={size} />;
    if (type.includes('image')) return <FileImage className="text-blue-500" size={size} />;
    if (type.includes('code') || type.includes('javascript') || type.includes('json') || type.includes('text')) return <FileCode className="text-amber-500" size={size} />;
    if (type.includes('pdf')) return <FileText className="text-red-500" size={size} />;
    return <FileIcon className="text-gray-400" size={size} />;
  };

  const handleRatingSubmit = (q: number) => {
    onMarkRevised(q);
    setShowRating(false);
  };

  const isDue = lc.nextReviewAt ? !isAfter(new Date(lc.nextReviewAt), new Date()) : true;

  const decodeBase64Text = (base64: string) => {
    try {
      const content = base64.split(',')[1];
      return atob(content);
    } catch (e) {
      return "Unable to decode text content.";
    }
  };

  const getEmbedLink = (url: string) => {
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view(\?.*)?$/, '/preview').replace(/\/edit(\?.*)?$/, '/preview');
    }
    return url;
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    if (previewFile.type === 'link') {
      const embedUrl = getEmbedLink(previewFile.data);
      const isDrive = previewFile.data.includes('drive.google.com');

      return (
        <div className="flex flex-col w-full h-full">
          {isDrive ? (
             <iframe 
                src={embedUrl}
                className="w-full h-full border-0 bg-white"
                allow="autoplay"
                title="Google Drive Preview"
             />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 bg-white">
              <div className="w-20 h-20 bg-sky-50 text-sky-500 rounded-3xl flex items-center justify-center mb-6">
                <Globe size={40} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">External Resource</h4>
              <p className="text-gray-500 mb-8 max-w-sm">This material is stored externally. You can open it in a new tab to continue your studies.</p>
              <a 
                href={previewFile.data} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Open Resource <ExternalLink size={18} />
              </a>
            </div>
          )}
        </div>
      );
    }

    if (previewFile.type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center w-full h-full p-4 bg-gray-50">
          <img 
            src={previewFile.data} 
            alt={previewFile.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      );
    }

    if (previewFile.type === 'application/pdf') {
      if (!pdfBlobUrl) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 bg-white">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium">Preparing Study Viewer...</p>
        </div>
      );
      
      return (
        <div className="w-full h-full flex flex-col bg-gray-100 overflow-hidden relative">
           <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-gray-200 z-20 shadow-sm">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                 <FileText size={18} />
               </div>
               <div>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Document Preview</p>
                 <p className="text-xs font-bold text-gray-900 truncate max-w-xs">{previewFile.name}</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <button 
                onClick={() => window.open(pdfBlobUrl!, '_blank')}
                className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-xl transition-all flex items-center gap-2"
               >
                 <ExternalLink size={14} /> Full View
               </button>
               <a 
                href={pdfBlobUrl!} 
                download={previewFile.name}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2"
               >
                 <Download size={14} /> Download
               </a>
             </div>
           </div>
           
           <div className="flex-1 w-full bg-gray-200 relative overflow-hidden">
             {/* Use object for better compatibility & fallback */}
             <object 
                data={`${pdfBlobUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                type="application/pdf"
                className="w-full h-full"
             >
                <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-white space-y-6">
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                    <AlertCircle size={48} />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Unable to Preview Directly</h4>
                    <p className="text-gray-500">Your browser security settings or lack of PDF plugins are preventing the in-app viewer from loading this document.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                    <button 
                      onClick={() => window.open(pdfBlobUrl!, '_blank')}
                      className="flex-1 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all"
                    >
                      <Maximize2 size={20} /> Open in New Tab
                    </button>
                    <a 
                      href={pdfBlobUrl!} 
                      download={previewFile.name}
                      className="flex-1 px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all"
                    >
                      <Download size={20} /> Download PDF
                    </a>
                  </div>
                </div>
             </object>
           </div>
        </div>
      );
    }

    if (previewFile.type.includes('text') || previewFile.type.includes('json') || previewFile.type.includes('javascript')) {
      return (
        <div className="w-full h-full p-6 overflow-auto bg-gray-900">
          <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
            {decodeBase64Text(previewFile.data)}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 bg-white">
        <FileIcon size={64} className="mb-4 opacity-20" />
        <p className="text-lg">No integrated preview available.</p>
        <a 
          href={previewFile.data} 
          download={previewFile.name}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2"
        >
          <Download size={18} /> Download to View
        </a>
      </div>
    );
  };

  const isCurrentlyUploading = stagedFiles.some(f => f.status === 'uploading');
  const hasFinishedFiles = stagedFiles.some(f => f.status === 'success');
  const pendingOrErrorCount = stagedFiles.filter(f => f.status === 'pending' || f.status === 'error' || f.status === 'cancelled').length;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300 pb-20">
      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowLinkModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <LinkIcon className="text-indigo-600" size={24} />
              Link Study Resource
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resource Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Google Drive Lecture Notes"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={linkData.title}
                  onChange={(e) => setLinkData({...linkData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL</label>
                <input 
                  type="url" 
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={linkData.url}
                  onChange={(e) => setLinkData({...linkData, url: e.target.value})}
                />
              </div>
              <button 
                onClick={() => {
                  if (linkData.title && linkData.url) {
                    onAddLink(linkData.title, linkData.url);
                    setLinkData({ title: '', url: '' });
                    setShowLinkModal(false);
                  }
                }}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm" onClick={() => setPreviewFile(null)} />
          <div className="relative bg-white dark:bg-gray-800 w-full max-w-7xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <header className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-30">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                   <BookOpen size={20} />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-gray-900 truncate">{previewFile.name}</h3>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Integrated Concept Viewer</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2.5 text-gray-400 hover:text-red-500 transition-all bg-gray-50 hover:bg-red-50 rounded-2xl"
                >
                  <X size={24} />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-hidden bg-gray-50 relative">
              {renderPreviewContent()}
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between mb-8">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4">
            <ArrowLeft size={16} /> Back to Unit
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-gray-900">{lc.title}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${lc.status === LCStatus.NOT_UPLOADED ? 'bg-gray-100 text-gray-400' : lc.status === LCStatus.UPLOADED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {lc.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex gap-2 relative">
          {lc.status !== LCStatus.NOT_UPLOADED && !showRating && (
            <button onClick={() => setShowRating(true)} className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold shadow-lg transition-all hover:-translate-y-0.5 ${isDue ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700' : 'bg-gray-400 shadow-gray-200 cursor-default'}`}>
              <CheckCircle2 size={18} /> {isDue ? 'Mark as Revised' : 'Revise Early'}
            </button>
          )}

          {showRating && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xl absolute right-0 top-0 z-50 w-72">
              <p className="text-sm font-bold text-gray-900 mb-4 text-center">How well did you know this?</p>
              <div className="grid grid-cols-6 gap-1 mb-4">
                {[0, 1, 2, 3, 4, 5].map((q) => (
                  <button key={q} onClick={() => handleRatingSubmit(q)} className={`h-10 rounded-lg flex items-center justify-center font-bold text-sm ${q < 3 ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>{q}</button>
                ))}
              </div>
              <button onClick={() => setShowRating(false)} className="w-full py-2 text-xs text-gray-500 font-medium">Cancel</button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {stagedFiles.length > 0 && (
            <section className="bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-200 p-6 animate-in slide-in-from-top-4 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Upload size={18} /> Staging Area ({stagedFiles.length})
                </div>
                <div className="flex gap-2">
                  {hasFinishedFiles && !isCurrentlyUploading && (
                    <button onClick={clearFinished} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">Clear Finished</button>
                  )}
                  {pendingOrErrorCount > 0 && (
                    <button 
                      onClick={handleConfirmUpload} 
                      disabled={isCurrentlyUploading} 
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-50 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      {isCurrentlyUploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                      {stagedFiles.some(f => f.status === 'error' || f.status === 'cancelled') ? 'Retry' : 'Start Upload'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                {stagedFiles.map((staged) => (
                  <div key={staged.id} className={`
                    relative bg-white p-4 rounded-2xl border transition-all flex flex-col gap-3 overflow-hidden
                    ${staged.status === 'error' ? 'border-red-200 bg-red-50/30' : 
                      staged.status === 'success' ? 'border-emerald-100 opacity-80' : 
                      staged.status === 'cancelled' ? 'border-amber-200 bg-amber-50/20' : 'border-indigo-100 shadow-sm'}
                  `}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                        {staged.previewUrl ? <img src={staged.previewUrl} className="w-full h-full object-cover" /> : getFileIcon(staged.file.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate mb-0.5">{staged.file.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-medium">{(staged.file.size / 1024).toFixed(0)} KB</span>
                          {staged.status === 'uploading' && <span className="text-[10px] text-indigo-600 font-bold animate-pulse">Processing...</span>}
                          {staged.status === 'error' && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle size={10} /> {staged.error}</span>}
                          {staged.status === 'cancelled' && <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><X size={10} /> Cancelled</span>}
                          {staged.status === 'success' && <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Finished</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {(staged.status === 'error' || staged.status === 'cancelled') && !isCurrentlyUploading && (
                          <button onClick={() => uploadSingleFile(staged.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Retry">
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button onClick={() => removeStagedFile(staged.id)} className={`p-2 rounded-lg transition-colors ${staged.status === 'uploading' ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-red-500'}`} title={staged.status === 'uploading' ? 'Cancel Upload' : 'Remove'}>
                          <X size={20} />
                        </button>
                        {staged.status === 'uploading' && (
                          <div className="p-2">
                             <Loader2 size={16} className="text-indigo-600 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Individual Progress Bar */}
                    {(staged.status === 'uploading' || staged.status === 'success') && (
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${staged.status === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${staged.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileSearch size={18} className="text-indigo-600" />
                Study Materials
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setShowLinkModal(true)} className="text-sky-600 hover:bg-sky-50 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors">
                  <LinkIcon size={16} /> Link Drive
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 hover:bg-indigo-50 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors">
                  <Upload size={16} /> Upload
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            </div>
            
            <div className="divide-y divide-gray-50">
              {lc.files.length > 0 ? (
                lc.files.map(file => (
                  <div key={file.id} className="p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                    <button onClick={() => setPreviewFile(file)} className="flex-1 flex items-center gap-4 text-left">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 truncate max-w-xs md:max-w-md">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.type === 'link' ? 'Cloud Resource' : `${(file.size / 1024).toFixed(1)} KB`} • {format(new Date(file.uploadedAt), 'MMM d')}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      {file.type === 'link' ? (
                        <a href={file.data} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-sky-600"><ExternalLink size={18} /></a>
                      ) : (
                        <a href={file.data} download={file.name} className="p-2 text-gray-400 hover:text-indigo-600"><Download size={18} /></a>
                      )}
                      <button onClick={() => onRemoveFile(file.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><Upload size={24} /></div>
                  <h4 className="font-medium text-gray-900 mb-1">No materials</h4>
                  <p className="text-sm max-w-xs mx-auto">Upload files or link resources from Google Drive to start.</p>
                </div>
              )}
            </div>
          </section>

          {lc.revisionHistory.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Revision History</h3>
              <div className="space-y-4">
                {lc.revisionHistory.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${rec.quality >= 4 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{rec.quality}</div>
                      <span className="text-sm text-gray-600">{format(new Date(rec.date), 'PPP')}</span>
                    </div>
                    <span className="text-xs text-gray-400">Next review in {rec.interval}d</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-slate-900 rounded-2xl p-8 text-white">
            <h3 className="text-lg font-bold mb-4">Memory Optimization</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-indigo-400 text-xs font-bold uppercase mb-1">Ease Factor</p>
                <p className="text-xl font-mono">{lc.easeFactor.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-indigo-400 text-xs font-bold uppercase mb-1">Repetitions</p>
                <p className="text-xl font-mono">{lc.repetition}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-6">Tracking</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Zap size={20} /></div>
                <div><p className="text-xs text-gray-500 font-bold uppercase">Total Sessions</p><p className="text-xl font-bold">{lc.revisionCount}</p></div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Clock size={20} /></div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Next Review</p>
                  <p className={`text-xl font-bold ${isDue ? 'text-amber-600' : 'text-gray-900'}`}>{lc.nextReviewAt ? (isDue ? 'Due Now' : formatDistanceToNow(new Date(lc.nextReviewAt), { addSuffix: true })) : 'Immediate'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-2xl p-6 border ${isDue ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
            <p className={`text-sm leading-relaxed ${isDue ? 'text-amber-700' : 'text-indigo-700'}`}>
              {isDue ? 'This concept is ready for review. Regular spaced repetition is key to mastery.' : 'Stick to your schedule for best results!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LCDetail;

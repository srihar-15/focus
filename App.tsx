
import React, { useState, useEffect, useMemo } from 'react';
import { UserSession, LCStatus, StudyStats, AttachedFile, LearningConcept, Unit } from './types';
import { storageService } from './services/storageService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UnitList from './components/UnitList';
import UnitView from './components/UnitView';
import LCDetail from './components/LCDetail';
import { KeyRound, Lock, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>({ isAuthenticated: false, username: null });
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLCId, setSelectedLCId] = useState<string | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  const [units, setUnits] = useState<Unit[]>([]);
  const [allLCs, setAllLCs] = useState<LearningConcept[]>([]);
  const [dbTick, setDbTick] = useState(0);

  const DEFAULT_PIN = '1234';

  useEffect(() => {
    const loadData = async () => {
      try {
        await storageService.init();
        const loadedUnits = await storageService.getUnits();
        const loadedLCs = await storageService.getLCs();
        setUnits(loadedUnits);
        setAllLCs(loadedLCs);
      } catch (err) {
        console.error("Failed to load study data:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    loadData();
  }, [dbTick]);

  const stats: StudyStats = useMemo(() => {
    const uploaded = allLCs.filter(l => l.status !== LCStatus.NOT_UPLOADED).length;
    return {
      totalUnits: units.length,
      totalLCs: allLCs.length,
      uploadedCount: uploaded,
      remainingCount: allLCs.length - uploaded,
      needsRevisionCount: allLCs.filter(l => l.status === LCStatus.NEEDS_REVISION).length
    };
  }, [allLCs, units]);

  const recentLCs = useMemo(() => {
    return allLCs
      .filter(l => l.status !== LCStatus.NOT_UPLOADED)
      .sort((a, b) => {
        const dateA = a.lastRevisedAt || a.files[0]?.uploadedAt || '0';
        const dateB = b.lastRevisedAt || b.files[0]?.uploadedAt || '0';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 5);
  }, [allLCs]);

  // Generate context for the AI Assistant
  const aiContext = useMemo(() => {
    const progressText = `Student progress: ${stats.uploadedCount}/${stats.totalLCs} concepts mastered. `;
    const unitList = units.map(u => `Unit ${u.order}: ${u.title}`).join(', ');
    const currentView = selectedLCId ? `Currently viewing Concept ID ${selectedLCId}.` : 'Currently in general view.';
    return `${progressText} Curriculum includes: ${unitList}. ${currentView}`;
  }, [stats, units, selectedLCId]);

  const readFileAsBase64 = (file: File, onProgress: (p: number) => void, signal?: AbortSignal): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      const onAbort = () => {
        reader.abort();
        reject(new Error('Upload cancelled by user.'));
      };

      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener('abort', onAbort);
      }

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 90);
          onProgress(percent);
        }
      };

      reader.onload = () => {
        if (signal) signal.removeEventListener('abort', onAbort);
        onProgress(95);
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(new Error('Failed to read file.'));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (file: File, onProgress: (p: number) => void, signal?: AbortSignal) => {
    if (!selectedLCId) return;
    try {
      const data = await readFileAsBase64(file, onProgress, signal);
      
      if (signal?.aborted) throw new Error('Upload cancelled');

      const uploadedFile: AttachedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        data,
        uploadedAt: new Date().toISOString()
      };
      
      await storageService.addFilesToLC(selectedLCId, [uploadedFile]);
      onProgress(100);
      
      setDbTick(prev => prev + 1);
    } catch (err) {
      if (err instanceof Error && err.message === 'Upload cancelled by user.') {
        console.log("Upload aborted.");
      } else {
        console.error("File upload failed:", err);
      }
      throw err;
    }
  };

  const handleAddLink = async (title: string, url: string) => {
    if (!selectedLCId) return;
    const linkResource: AttachedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: title,
      type: 'link',
      size: 0,
      data: url,
      uploadedAt: new Date().toISOString()
    };
    await storageService.addFilesToLC(selectedLCId, [linkResource]);
    setDbTick(prev => prev + 1);
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!selectedLCId) return;
    await storageService.removeFileFromLC(selectedLCId, fileId);
    setDbTick(prev => prev + 1);
  };

  const handleMarkRevised = async (quality: number) => {
    if (!selectedLCId) return;
    await storageService.markRevised(selectedLCId, quality);
    setDbTick(prev => prev + 1);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPin === DEFAULT_PIN) {
      setSession({ isAuthenticated: true, username: 'Student' });
      setError('');
    } else {
      setError('Invalid PIN.');
    }
  };

  const handleLogout = () => {
    setSession({ isAuthenticated: false, username: null });
    setLoginPin('');
    setActivePage('dashboard');
    setSelectedUnitId(null);
    setSelectedLCId(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Initializing secure database...</p>
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-mono text-3xl mx-auto mb-6 shadow-xl shadow-indigo-100">F</div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">FocusStudy</h1>
            <p className="text-gray-500 mt-2">Personal Revision Management Hub</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Security PIN</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><KeyRound size={18} /></div>
                <input
                  type="password"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-center tracking-[1em] font-mono text-xl"
                  placeholder="••••"
                  maxLength={4}
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
            <button type="submit" className="w-full py-4 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all">Unlock Vault</button>
            <div className="text-center text-xs text-gray-400 uppercase tracking-widest font-bold flex items-center justify-center gap-2"><Lock size={12} /> End-to-End Private</div>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard stats={stats} recentLCs={recentLCs} onViewLC={(lcId) => { const lc = allLCs.find(l => l.id === lcId); if (lc) { setSelectedLCId(lcId); setSelectedUnitId(lc.unitId); setActivePage('lc-detail'); } }} />;
      case 'units':
        return <UnitList units={units} lcs={allLCs} onSelectUnit={(id) => { setSelectedUnitId(id); setActivePage('unit-view'); }} />;
      case 'unit-view':
        const currentUnit = units.find(u => u.id === selectedUnitId);
        if (!currentUnit) return null;
        return <UnitView unit={currentUnit} lcs={allLCs.filter(l => l.unitId === selectedUnitId)} onBack={() => setActivePage('units')} onSelectLC={(id) => { setSelectedLCId(id); setActivePage('lc-detail'); }} />;
      case 'lc-detail':
        const currentLC = allLCs.find(l => l.id === selectedLCId);
        if (!currentLC) return null;
        return <LCDetail lc={currentLC} onBack={() => setActivePage('unit-view')} onUpload={handleFileUpload} onAddLink={handleAddLink} onRemoveFile={handleRemoveFile} onMarkRevised={handleMarkRevised} />;
      default:
        return null;
    }
  };

  return (
    <Layout 
      activePage={activePage} 
      onNavigate={(page) => setActivePage(page)} 
      onLogout={handleLogout}
      aiContext={aiContext}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;

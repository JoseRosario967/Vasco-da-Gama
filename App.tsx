
import React, { useState, useEffect, ErrorInfo, ReactNode, Component, useCallback } from 'react';
import { AppView, CustomStyle, WatermarkSettings, EditorInitialState, TextEditorInitialState, Watermark } from './types';

// Core Components
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { GeneratorView } from './components/GeneratorView';
import { StyleStudioView } from './components/StyleStudioView';
import { EditorView } from './components/EditorView';
import { GalleryModal } from './components/GalleryModal';
import { BackupManager } from './components/BackupManager';
import { PromptTemplatesPanel } from './components/PromptTemplatesPanel';

// Specialized Tools
import { ChefView } from './components/ChefView';
import { GardenView } from './components/GardenView';
import { WeatherView } from './components/WeatherView';
import { PoetryView } from './components/PoetryView';
import { QuotesView } from './components/QuotesView';
import { TranslatorView } from './components/TranslatorView';
import { PaleographyView } from './components/PaleographyView';
import { ElectricianView } from './components/ElectricianView';
import { AnatomyView } from './components/AnatomyView';
import { VectorView } from './components/VectorView';
import { ThreeDView } from './components/ThreeDView';
import { CaricatureView } from './components/CaricatureView';
import { RemediesView } from './components/RemediesView';
import { AudioStudioView } from './components/AudioStudioView';
import { RestorationView } from './components/RestorationView';
import { MontageView } from './components/MontageView';
import { TransparencyView } from './components/TransparencyView';
import { RemovalView } from './components/RemovalView';
import { MotionStudio } from './components/MotionStudio';
import { PromptDiscoveryView } from './components/PromptDiscoveryView';
import { TextEditorView } from './components/TextEditorView';
import { BatchWatermarkView } from './components/BatchWatermarkView';
import { LotteryView } from './components/LotteryView';
import { WatermarkManager } from './components/WatermarkManager';
import { AIDetectorView } from './components/AIDetectorView';
import { WatermarkStudioView } from './components/WatermarkStudioView';
import { GenderDetectorView } from './components/GenderDetectorView';
import { VisionQuotesView } from './components/VisionQuotesView';

// Services
import { getCustomStylesFromDB, deleteCustomStyleFromDB, getAllWatermarks } from './services/galleryService';
import { Cpu, AlertCircle } from 'lucide-react';

// Emergency Boot Script
(function() {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.toString().includes('IndexedDB') || event.reason?.toString().includes('quota')) {
      console.warn("Nexus: Erro de base de dados detetado.");
    }
  });
})();

interface EBProps { children?: ReactNode; }
interface EBState { hasError: boolean; }

class ErrorBoundary extends Component<EBProps, EBState> {
  public state: EBState = { hasError: false };
  constructor(props: EBProps) { super(props); }
  static getDerivedStateFromError(_: Error): EBState { return { hasError: true }; }
  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    indexedDB.deleteDatabase('Nexus_Studio_V12');
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-red-500/20 p-10 rounded-[3rem] max-w-md shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
            <h1 className="text-white font-black text-xl mb-3 uppercase italic">Erro de Sistema</h1>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Tentar Novamente</button>
            <button onClick={this.handleReset} className="mt-4 text-slate-500 text-[9px] uppercase font-bold">Reset Total</button>
          </div>
        </div>
      );
    }
    return (this as any).props.children || null;
  }
}

const DEFAULT_WM_SETTINGS: WatermarkSettings = { activeWatermarkId: null, opacity: 60, position: 'bottom-right', scale: 0.2, isEnabled: true };

const AppContent: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isWMManagerOpen, setIsWMManagerOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [sharedPrompt, setSharedPrompt] = useState<string | null>(null);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [watermarks, setWatermarks] = useState<Watermark[]>([]);
  const [editorState, setEditorState] = useState<EditorInitialState | null>(null);
  const [textEditorState, setTextEditorState] = useState<TextEditorInitialState | null>(null);
  const [wmSettings, setWmSettings] = useState<WatermarkSettings>(DEFAULT_WM_SETTINGS);

  const initData = useCallback(async () => {
    try {
      const savedSettings = localStorage.getItem('nexus_watermark_settings');
      if (savedSettings) setWmSettings({ ...DEFAULT_WM_SETTINGS, ...JSON.parse(savedSettings) });
      const [styles, wms] = await Promise.all([getCustomStylesFromDB().catch(() => []), getAllWatermarks().catch(() => [])]);
      setCustomStyles(Array.isArray(styles) ? styles : []);
      setWatermarks(Array.isArray(wms) ? wms : []);
      setIsInitializing(false);
    } catch (e) { setIsInitializing(false); }
  }, []);

  useEffect(() => {
    initData();
    window.addEventListener('nexusDataImported', initData);
    return () => window.removeEventListener('nexusDataImported', initData);
  }, [initData]);

  const handleQuickEdit = (url: string) => {
    const arr = url.split(',');
    setEditorState({ image: { previewUrl: url, base64Data: arr[1] || '', mimeType: arr[0].match(/:(.*?);/)?.[1] || 'image/png' }, prompt: "" });
    setCurrentView(AppView.EDITOR);
  };

  const handleToTextEditor = (img: any, txt: string) => {
    setTextEditorState({ image: img, text: txt });
    setCurrentView(AppView.TEXT_EDITOR);
  };

  if (isInitializing) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6"><Cpu className="w-12 h-12 text-indigo-400 animate-pulse" /></div>;

  const activeWM = watermarks.find(w => w.id === wmSettings.activeWatermarkId);

  const renderView = () => {
    switch (currentView) {
      case AppView.GENERATOR: return <GeneratorView onStyleCreated={async () => { const s = await getCustomStylesFromDB(); setCustomStyles(s); }} onQuickEdit={handleQuickEdit} onSendToTextEditor={handleToTextEditor} onOpenTemplates={() => setIsTemplatesOpen(true)} sharedPrompt={sharedPrompt} onConsumeSharedPrompt={() => setSharedPrompt(null)} watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.STYLE_STUDIO: return <StyleStudioView customStyles={customStyles} onRemoveStyle={async (id) => { await deleteCustomStyleFromDB(id); const s = await getCustomStylesFromDB(); setCustomStyles(s); }} onQuickEdit={handleQuickEdit} watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.EDITOR: return <EditorView initialState={editorState} onClearInitialState={() => setEditorState(null)} watermarkSettings={wmSettings} activeWatermark={activeWM} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} sharedPrompt={sharedPrompt} onConsumeSharedPrompt={() => setSharedPrompt(null)} onOpenTemplates={() => setIsTemplatesOpen(true)} />;
      case AppView.CHEF: return <ChefView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.GARDEN: return <GardenView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.WEATHER: return <WeatherView />;
      case AppView.POETRY: return <PoetryView />;
      case AppView.QUOTES: return <QuotesView />;
      case AppView.TRANSLATOR: return <TranslatorView />;
      case AppView.PALEOGRAPHY: return <PaleographyView watermarkSettings={wmSettings} activeWatermark={activeWM} onSendToTextEditor={handleToTextEditor} />;
      case AppView.ELECTRICIAN: return <ElectricianView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.ANATOMY: return <AnatomyView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.VECTORIZER: return <VectorView />;
      case AppView.THREED: return <ThreeDView watermarkSettings={wmSettings} activeWatermark={activeWM} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} onQuickEdit={handleQuickEdit} />;
      case AppView.CARICATURE: return <CaricatureView watermarkSettings={wmSettings} activeWatermark={activeWM} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} onQuickEdit={handleQuickEdit} />;
      case AppView.REMEDIES: return <RemediesView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.AUDIO_STUDIO: return <AudioStudioView />;
      case AppView.RESTORATION: return <RestorationView watermarkSettings={wmSettings} activeWatermark={activeWM} onQuickEdit={handleQuickEdit} />;
      case AppView.MONTAGE: return <MontageView watermarkSettings={wmSettings} activeWatermark={activeWM} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} />;
      case AppView.TRANSPARENCY: return <TransparencyView />;
      case AppView.REMOVAL: return <RemovalView watermarkSettings={wmSettings} activeWatermark={activeWM} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} />;
      case AppView.MOTION: return <MotionStudio watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.DISCOVERY: return <PromptDiscoveryView onApplyPrompt={(file, p) => { setEditorState({ image: file, prompt: p }); setCurrentView(AppView.EDITOR); }} />;
      case AppView.TEXT_EDITOR: return <TextEditorView initialState={textEditorState} onClearInitialState={() => setTextEditorState(null)} watermarkSettings={wmSettings} activeWatermark={activeWM} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} />;
      case AppView.BATCH_WATERMARK: return <BatchWatermarkView activeWatermark={activeWM} settings={wmSettings} onOpenManager={() => setIsWMManagerOpen(true)} />;
      case AppView.LOTTERY: return <LotteryView />;
      case AppView.AI_DETECTOR: return <AIDetectorView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.WATERMARK_STUDIO: return <WatermarkStudioView activeWatermark={activeWM} watermarkSettings={wmSettings} />;
      case AppView.GENDER_DETECTOR: return <GenderDetectorView watermarkSettings={wmSettings} activeWatermark={activeWM} />;
      case AppView.VISION_QUOTES: return <VisionQuotesView onSendToTextEditor={handleToTextEditor} />;
      default: return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onOpenGallery={() => setIsGalleryOpen(true)} onOpenWatermarks={() => setIsWMManagerOpen(true)} onOpenBackup={() => setIsBackupOpen(true)} onOpenTemplates={() => setIsTemplatesOpen(true)} activeWatermark={activeWM} watermarkEnabled={wmSettings.isEnabled} onToggleWatermark={(v) => setWmSettings(s => ({...s, isEnabled: v}))} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 h-screen">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/60 bg-background/80 backdrop-blur-xl z-20 flex-shrink-0">
          <div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white"><Cpu className="w-5 h-5" /></button><h1 className="font-black text-sm tracking-widest text-white/90 uppercase italic">Nexus <span className="text-indigo-400 not-italic">Studio</span></h1></div>
          <div className="hidden lg:flex items-center gap-4"><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Vasco da Gama</span></div>
          <div className="flex items-center gap-4"><div className="hidden md:flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /><span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Monitor OK</span></div></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-gradient-to-b from-background to-slate-950"><div className="max-w-7xl mx-auto h-full animate-in fade-in zoom-in-[0.98] duration-700">{renderView()}</div></main>
      </div>
      <GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onEditImage={(img) => { setEditorState({ image: { previewUrl: `data:${img.mimeType};base64,${img.base64Data}`, base64Data: img.base64Data, mimeType: img.mimeType }, prompt: img.prompt }); setIsGalleryOpen(false); setCurrentView(AppView.EDITOR); }} />
      <WatermarkManager isOpen={isWMManagerOpen} onClose={() => setIsWMManagerOpen(false)} library={watermarks} settings={wmSettings} onAddWatermark={(wm) => setWatermarks(p => [...p, wm])} onDeleteWatermark={(id) => setWatermarks(p => p.filter(w => w.id !== id))} onUpdateSettings={(s) => { setWmSettings(s); localStorage.setItem('nexus_watermark_settings', JSON.stringify(s)); }} />
      <BackupManager isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      <PromptTemplatesPanel isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} onSelectTemplate={(c) => { setSharedPrompt(c); setIsTemplatesOpen(false); }} />
    </div>
  );
};

const App = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;


import React, { useState, useRef } from 'react';
import { generateAnatomyGuide, analyzeSymptom } from '../services/geminiService';
import { AnatomyGuide, SymptomAnalysisResult, Watermark, WatermarkSettings, UploadedFile } from '../types';
import { Button } from './Button';
import { Activity, Search, Printer, Stamp, Download, Info, Zap, Dna, Brain, Heart, Stethoscope, Eye, AlertTriangle, UploadCloud, X, ScanEye } from 'lucide-react';

interface AnatomyViewProps {
  watermarkSettings?: WatermarkSettings;
  activeWatermark?: Watermark;
  onToggleWatermark?: (enabled: boolean) => void;
}

type ViewMode = 'explorer' | 'scanner';

export const AnatomyView: React.FC<AnatomyViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [mode, setMode] = useState<ViewMode>('explorer');
  const [query, setQuery] = useState('');
  const [guide, setGuide] = useState<AnatomyGuide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);

  // Scanner State
  const [symptomImage, setSymptomImage] = useState<UploadedFile | null>(null);
  const [symptomContext, setSymptomContext] = useState('');
  const [analysisResult, setAnalysisResult] = useState<SymptomAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setGuide(null);
    try {
      const result = await generateAnatomyGuide(query);
      setGuide(result);
    } catch (e) {
      alert("Erro ao gerar guia anatómico.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSymptomImage({
            file,
            previewUrl: result,
            base64Data: result.split(',')[1],
            mimeType: file.type
        });
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeSymptom = async () => {
      if (!symptomImage) return;
      setIsLoading(true);
      setAnalysisResult(null);
      try {
          const result = await analyzeSymptom(
              { base64Data: symptomImage.base64Data, mimeType: symptomImage.mimeType },
              symptomContext
          );
          setAnalysisResult(result);
      } catch (e) {
          alert("Erro ao analisar imagem. Tente novamente.");
      } finally {
          setIsLoading(false);
      }
  };

  const handlePrint = () => {
    if (!guide) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Permita popups para imprimir.");
        return;
    }

    const shouldShowWatermark = watermarkSettings?.isEnabled && localWatermarkEnabled && activeWatermark;
    const wmOpacity = watermarkSettings?.opacity ? watermarkSettings.opacity / 100 : 0.5;
    const wmUrl = activeWatermark?.previewUrl || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Relatório Anatómico - BioDigital AI</title>
          <style>
              @page { size: A4; margin: 1.5cm; }
              body { font-family: 'Helvetica', sans-serif; color: #1e293b; line-height: 1.6; padding-bottom: 50px; }
              h1 { color: #0f172a; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; }
              .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .anatomy-img { max-width: 100%; max-height: 400px; display: block; margin: 20px auto; border-radius: 8px; }
              .box { background: #f1f5f9; padding: 15px; border-left: 4px solid #0ea5e9; margin-bottom: 15px; border-radius: 4px; }
              .fun-fact { background: #f0fdf4; border: 1px dashed #22c55e; padding: 10px; border-radius: 8px; font-style: italic; color: #15803d; }
              ul { padding-left: 20px; }
              #watermark { position: fixed; bottom: 0; right: 0; opacity: ${wmOpacity}; width: 100px; }
          </style>
      </head>
      <body>
          <div class="header">
            <h1 style="color:white; border:none; margin:0;">${guide.title}</h1>
            <p style="margin:0; opacity:0.8;">Sistema: ${guide.system}</p>
          </div>

          ${guide.imageUrl ? `<img src="${guide.imageUrl}" class="anatomy-img" />` : ''}

          <h3>Função Principal</h3>
          <p>${guide.function}</p>

          <div class="box">
            <strong>Localização:</strong> ${guide.location}
          </div>

          <h3>Estruturas</h3>
          <ul>
            ${guide.structure.map(s => `<li>${s}</li>`).join('')}
          </ul>

          <h3>Notas Clínicas</h3>
          <p>${guide.clinicalNotes}</p>

          <div class="fun-fact">
            <strong>Sabia que?</strong> ${guide.funFact}
          </div>

          ${shouldShowWatermark ? `<img src="${wmUrl}" id="watermark" />` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="bg-[#0b1121] p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                            <Activity className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">BioDigital <span className="text-blue-400">Anatomia AI</span></h2>
                    </div>
                    
                    {/* Mode Switcher */}
                    <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700 mt-4 md:mt-0">
                        <button 
                            onClick={() => setMode('explorer')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'explorer' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Dna className="w-4 h-4" /> Explorador 3D
                        </button>
                        <button 
                            onClick={() => setMode('scanner')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'scanner' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ScanEye className="w-4 h-4" /> Scanner de Sintomas
                        </button>
                    </div>
                </div>

                <p className="text-slate-400 max-w-xl mb-6 leading-relaxed">
                    {mode === 'explorer' 
                        ? 'O corpo humano virtual mais completo e cientificamente preciso. Visualize anatomia, condições de saúde e tratamentos em 3D.'
                        : 'Carregue uma foto de um sintoma visível (ex: pele) para uma triagem preliminar assistida por Inteligência Artificial.'
                    }
                </p>

                {mode === 'explorer' && (
                    <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                placeholder="Pesquise um órgão, sistema ou condição (Ex: Coração, Fémur)..."
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none backdrop-blur-sm"
                            />
                            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                        </div>
                        <Button 
                            onClick={handleGenerate} 
                            isLoading={isLoading} 
                            className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                            icon={<Dna className="w-4 h-4" />}
                        >
                            Explorar 3D
                        </Button>
                    </div>
                )}
            </div>
        </div>

        {/* ==================== EXPLORER MODE ==================== */}
        {mode === 'explorer' && guide && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-6 fade-in duration-700">
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="bg-[#0b1121] rounded-xl border border-slate-800 overflow-hidden shadow-2xl relative group min-h-[400px]">
                        {guide.imageUrl ? (
                            <>
                                <img 
                                    src={guide.imageUrl} 
                                    alt="3D Anatomy Render" 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1121] via-transparent to-transparent opacity-80" />
                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 block">Renderização AI</span>
                                    <h3 className="text-xl font-bold text-white">{guide.title}</h3>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-600">
                                <Activity className="w-16 h-16 animate-pulse opacity-20" />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Sabia que?
                        </h4>
                        <p className="text-sm text-slate-300 italic">"{guide.funFact}"</p>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden text-slate-900">
                        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-1">{guide.title}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                        {guide.system}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={handlePrint}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                                title="Exportar Relatório"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-1"><Brain className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-1">Função</h4>
                                    <p className="text-slate-600 leading-relaxed">{guide.function}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mt-1"><MapPinIcon className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-1">Localização</h4>
                                    <p className="text-slate-600 leading-relaxed">{guide.location}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <Dna className="w-4 h-4" /> Estruturas
                                    </h4>
                                    <ul className="space-y-2">
                                        {guide.structure.map((part, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {part}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <h4 className="text-xs font-bold text-red-400 uppercase mb-3 flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4" /> Notas Clínicas
                                    </h4>
                                    <p className="text-sm text-slate-700">{guide.clinicalNotes}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ==================== SCANNER MODE ==================== */}
        {mode === 'scanner' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-6 fade-in duration-500">
                
                {/* Input Panel */}
                <div className="flex flex-col gap-6">
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-3 mb-6 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                            <p className="text-xs text-red-200">
                                <strong>Aviso Legal:</strong> Esta ferramenta usa Inteligência Artificial para análise visual e triagem. 
                                <strong>NÃO É UM DIAGNÓSTICO MÉDICO.</strong> Consulte sempre um médico profissional.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">1. Carregar Foto do Sintoma</label>
                            {!symptomImage ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all group"
                                >
                                    <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                        <UploadCloud className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <p className="text-sm text-slate-300 font-medium">Carregar Foto (ex: mancha, borbulhas)</p>
                                    <p className="text-xs text-slate-500 mt-1">Imagens claras e focadas funcionam melhor</p>
                                </div>
                            ) : (
                                <div className="relative h-48 rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group">
                                    <img 
                                        src={symptomImage.previewUrl} 
                                        alt="Symptom" 
                                        className="w-full h-full object-contain"
                                    />
                                    <button 
                                        onClick={() => { setSymptomImage(null); setAnalysisResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>

                        <div className="mb-6">
                             <label className="block text-sm font-medium text-slate-300 mb-2">2. Descreva o que sente (Opcional)</label>
                             <textarea 
                                value={symptomContext}
                                onChange={(e) => setSymptomContext(e.target.value)}
                                placeholder="Ex: Começou ontem, dá comichão, dói ao tocar..."
                                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 resize-none"
                             />
                        </div>

                        <Button 
                            onClick={handleAnalyzeSymptom} 
                            isLoading={isLoading} 
                            disabled={!symptomImage}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg"
                            icon={<ScanEye className="w-5 h-5" />}
                        >
                            Analisar Sintomas
                        </Button>
                    </div>
                </div>

                {/* Result Panel */}
                <div className="h-full">
                    {analysisResult ? (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-slate-50 p-6 border-b border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-slate-900">Resultado da Análise</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        analysisResult.severity.includes('Leve') ? 'bg-green-100 text-green-700' :
                                        analysisResult.severity.includes('Moderado') ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {analysisResult.severity}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-blue-700">{analysisResult.condition}</h2>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Análise Visual</h4>
                                    <p className="text-sm text-slate-700">{analysisResult.description}</p>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Possíveis Causas
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysisResult.possibleCauses.map((cause, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                <span className="mt-1.5 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0" /> {cause}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4" /> Recomendações
                                    </h4>
                                    <div className="grid gap-3">
                                        {analysisResult.recommendations.map((rec, i) => (
                                            <div key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="text-blue-500 font-bold text-sm">{i+1}.</div>
                                                <p className="text-sm text-slate-700">{rec}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-red-50 border border-red-100 p-4 rounded-lg mt-4">
                                    <h4 className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Aviso Importante
                                    </h4>
                                    <p className="text-xs text-red-800 leading-relaxed">
                                        {analysisResult.warning}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 p-8 text-center min-h-[400px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                                    <p className="text-blue-400 font-medium">A analisar imagem...</p>
                                    <p className="text-xs text-slate-500">Isto pode demorar alguns segundos</p>
                                </div>
                            ) : (
                                <>
                                    <ScanEye className="w-16 h-16 opacity-20 mb-4" />
                                    <p className="text-lg font-medium">A aguardar imagem...</p>
                                    <p className="text-sm max-w-xs mt-2 opacity-60">A análise aparecerá aqui após o processamento.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Watermark Control (Bottom) */}
        {mode === 'explorer' && watermarkSettings && onToggleWatermark && (
            <div className="mt-auto flex justify-center">
                <div className="inline-flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-sm">
                    <Stamp className={`w-4 h-4 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span className="text-xs text-slate-400">Marca d'Água (PDF)</span>
                    <button 
                        onClick={() => setLocalWatermarkEnabled(!localWatermarkEnabled)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${localWatermarkEnabled ? 'bg-blue-600' : 'bg-slate-600'} ${!watermarkSettings.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!watermarkSettings.isEnabled}
                    >
                        <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${localWatermarkEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

// Helper Icon
const MapPinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

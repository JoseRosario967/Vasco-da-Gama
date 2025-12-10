
import React, { useState } from 'react';
import { generateElectricalGuide } from '../services/geminiService';
import { ElectricalGuide, Watermark, WatermarkSettings } from '../types';
import { Button } from './Button';
import { Zap, AlertTriangle, CheckCircle2, Hammer, Activity, Info, ShieldAlert, Printer, Stamp } from 'lucide-react';

interface ElectricianViewProps {
  watermarkSettings?: WatermarkSettings;
  activeWatermark?: Watermark;
  onToggleWatermark?: (enabled: boolean) => void;
}

export const ElectricianView: React.FC<ElectricianViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [query, setQuery] = useState('');
  const [guide, setGuide] = useState<ElectricalGuide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Local Watermark Toggle
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setGuide(null);
    try {
      const result = await generateElectricalGuide(query);
      setGuide(result);
    } catch (e) {
      alert("Erro ao gerar guia elétrico.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ROBUST PDF PRINTING LOGIC ---
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
          <title>Guia Elétrico Nexus AI</title>
          <style>
              @page { size: A4; margin: 1.5cm; margin-bottom: 3cm; }
              body { 
                  font-family: 'Helvetica', sans-serif; 
                  color: #1f2937; 
                  line-height: 1.5; 
                  margin: 0; 
                  padding: 0;
                  padding-bottom: 100px; /* Safety padding */
              }
              
              h1 { color: #ca8a04; font-size: 24px; margin-bottom: 5px; border-bottom: 2px solid #ca8a04; padding-bottom: 10px; }
              h2 { color: #1e293b; font-size: 18px; margin-top: 20px; margin-bottom: 10px; font-weight: bold; }
              
              .warning-box { background: #fef2f2; border: 1px solid #ef4444; color: #b91c1c; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
              .warning-title { font-weight: bold; display: flex; align-items: center; gap: 5px; margin-bottom: 5px; text-transform: uppercase; }
              
              .diagram-container { text-align: center; margin: 20px 0; border: 1px dashed #cbd5e1; padding: 10px; page-break-inside: avoid; }
              .diagram-img { max-width: 100%; max-height: 300px; object-fit: contain; }
              
              .info-box { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 13px; page-break-inside: avoid; }
              
              ul, ol { padding-left: 20px; }
              li { margin-bottom: 5px; font-size: 12px; }
              
              .materials-list { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
              
              /* Watermark - Absolute Bottom Right */
              #watermark {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  z-index: 9999;
                  opacity: ${wmOpacity};
                  text-align: right;
                  /* Removed text, kept simple */
              }
              #watermark img { width: 120px; height: auto; }
          </style>
      </head>
      <body>
          <h1>${guide.title}</h1>
          <p style="font-size: 12px; color: #64748b;">Gerado por Nexus AI - Eletricista</p>

          <div class="warning-box">
              <div class="warning-title">⚠️ PRECAUÇÕES DE SEGURANÇA CRÍTICA</div>
              <ul>
                  ${guide.safetyWarnings.map(w => `<li>${w}</li>`).join('')}
              </ul>
          </div>

          ${guide.diagramUrl ? `
          <div class="diagram-container">
              <strong>Esquema de Ligação</strong><br/>
              <img src="${guide.diagramUrl}" class="diagram-img" />
          </div>` : ''}

          <h2>🛠️ Material Necessário</h2>
          <ul class="materials-list">
              ${guide.materials.map(m => `<li>${m}</li>`).join('')}
          </ul>

          <h2>⚡ Passo a Passo</h2>
          <ol>
              ${guide.steps.map(s => `<li>${s}</li>`).join('')}
          </ol>

          <div class="info-box">
              <strong>ℹ️ Notas Técnicas & Normas:</strong><br/>
              ${guide.technicalNotes}
          </div>

          ${shouldShowWatermark ? `
          <div id="watermark">
              <img src="${wmUrl}" />
          </div>
          ` : ''}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-8">
      
      {/* Header & Warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-amber-500/20 rounded-full flex-shrink-0">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-amber-200 mb-1">Aviso de Segurança Crítica</h3>
            <p className="text-sm text-amber-100/80 leading-relaxed">
                A eletricidade é perigosa e pode ser fatal. <strong>Desligue sempre o quadro geral</strong> antes de mexer em qualquer fio. 
                Este guia é gerado por IA para fins informativos e não substitui um eletricista certificado. Siga as normas RTIEBT.
            </p>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            Eletricista AI
        </h2>
        
        <div className="flex gap-4 mb-4">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="O que quer instalar? (Ex: Comutação de escada, Tomada com terra, Interruptor duplo)"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
            />
            <Button 
                onClick={handleGenerate} 
                isLoading={isLoading}
                disabled={!query.trim()}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-8"
                icon={<Activity className="w-5 h-5" />}
            >
                Gerar Esquema
            </Button>
        </div>

        {/* Watermark Toggle */}
        {watermarkSettings && onToggleWatermark && (
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                    <Stamp className={`w-4 h-4 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-yellow-400' : 'text-slate-500'}`} />
                    <span className="text-sm text-slate-300">Marca d'Água (PDF)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setLocalWatermarkEnabled(!localWatermarkEnabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${localWatermarkEnabled ? 'bg-yellow-600' : 'bg-slate-600'} ${!watermarkSettings.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!watermarkSettings.isEnabled}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${localWatermarkEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Result Area */}
      {guide && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
              
              {/* Left: Diagram */}
              <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-blue-600" /> Esquema
                      </h3>
                      <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium text-slate-600 transition-colors"
                      >
                          <Printer className="w-4 h-4" /> Imprimir / PDF
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center min-h-[300px] overflow-hidden relative group">
                      {guide.diagramUrl ? (
                          <img 
                            src={guide.diagramUrl} 
                            alt="Esquema Elétrico" 
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          />
                      ) : (
                          <p className="text-slate-400 text-sm">Esquema não disponível</p>
                      )}
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4" /> Notas Técnicas
                      </h4>
                      <p className="text-sm text-blue-900 whitespace-pre-wrap">{guide.technicalNotes}</p>
                  </div>
              </div>

              {/* Right: Instructions */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col gap-6 h-full overflow-y-auto">
                  <div>
                      <h3 className="text-2xl font-bold text-white mb-2">{guide.title}</h3>
                      <div className="flex flex-wrap gap-2">
                          {guide.materials.map((mat, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 border border-slate-600 flex items-center gap-1">
                                  <Hammer className="w-3 h-3" /> {mat}
                              </span>
                          ))}
                      </div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                      <h4 className="text-sm font-bold text-red-400 uppercase mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Precauções
                      </h4>
                      <ul className="list-disc pl-4 space-y-1">
                          {guide.safetyWarnings.map((warn, i) => (
                              <li key={i} className="text-sm text-red-200">{warn}</li>
                          ))}
                      </ul>
                  </div>

                  <div>
                      <h4 className="text-sm font-bold text-slate-300 uppercase mb-4">Passo a Passo</h4>
                      <div className="space-y-4">
                          {guide.steps.map((step, i) => (
                              <div key={i} className="flex gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center font-bold border border-yellow-500/30">
                                      {i + 1}
                                  </div>
                                  <p className="text-slate-300 text-sm pt-1.5">{step}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

          </div>
      )}

    </div>
  );
};

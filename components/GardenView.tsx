
import React, { useState } from 'react';
import { Button } from './Button';
import { generateGardenPlan, generateCropDetails } from '../services/geminiService';
import { GardenPlan, CropReport, WatermarkSettings, Watermark } from '../types';
import { Sprout, Search, Sun, Mountain, Bug, HeartHandshake, Scissors, Printer, CheckCircle2, Stamp, LayoutDashboard, Carrot, Shovel, Droplets, Calendar, HelpCircle, BookOpen, Wrench, Globe2 } from 'lucide-react';

interface GardenViewProps {
  watermarkSettings?: WatermarkSettings;
  activeWatermark?: Watermark;
  onToggleWatermark?: (enabled: boolean) => void;
}

type DashboardMode = 'new' | 'maintenance' | 'search';

export const GardenView: React.FC<GardenViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [mode, setMode] = useState<DashboardMode>('new');
  
  // Local Toggle
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);

  // --- DASHBOARD STATE (New/Maintenance) ---
  const [month, setMonth] = useState('Novembro');
  const [region, setRegion] = useState('Centro');
  const [method, setMethod] = useState<'Semear (Sementes)' | 'Plantar (Mudas)'>('Semear (Sementes)');
  const [family, setFamily] = useState('Hortaliças');
  const [specificPlant, setSpecificPlant] = useState(''); // New State
  const [doubts, setDoubts] = useState('');
  const [gardenPlan, setGardenPlan] = useState<GardenPlan | null>(null);
  
  // --- ENCYCLOPEDIA STATE (Search) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [cropReport, setCropReport] = useState<CropReport | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const regions = ['Norte', 'Centro', 'Sul', 'Madeira', 'Açores'];
  const families = ['Hortaliças', 'Leguminosas', 'Frutas', 'Ervas Aromáticas', 'Tubérculos', 'Flores'];

  const handleConsultHorta = async () => {
    setIsLoading(true);
    setGardenPlan(null);
    try {
        // Pass specificPlant to service
        const data = await generateGardenPlan(month, region, method, family, doubts, specificPlant);
        setGardenPlan(data);
    } catch (e) {
        alert("Erro ao consultar a horta. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSearchCrop = async () => {
      if (!searchQuery.trim()) return;
      setIsLoading(true);
      setCropReport(null);
      try {
          const data = await generateCropDetails(searchQuery);
          setCropReport(data);
      } catch (e) {
          alert("Erro ao gerar ficha técnica.");
      } finally {
          setIsLoading(false);
      }
  };

  // --- MANUAL HTML GENERATION FOR ROBUST PRINTING ---
  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert("Permita popups para imprimir.");
          return;
      }

      const shouldShowWatermark = watermarkSettings?.isEnabled && localWatermarkEnabled && activeWatermark;
      const wmOpacity = watermarkSettings?.opacity ? watermarkSettings.opacity / 100 : 0.5;
      const wmUrl = activeWatermark?.previewUrl || '';

      // Generate Content HTML based on active mode
      let contentHtml = '';

      if (mode === 'search' && cropReport) {
          // ENCYCLOPEDIA LAYOUT
          const imgUrl = `https://image.pollinations.ai/prompt/photorealistic ${cropReport.imageKeywords || cropReport.scientificName} close up high quality nature agriculture photography?width=800&height=400&nologo=true`;
          
          contentHtml = `
            <div class="header-img-container">
                <img src="${imgUrl}" class="header-img" />
                <div class="header-overlay">
                    <h1>${cropReport.name}</h1>
                    <p><em>${cropReport.scientificName}</em> • ${cropReport.family}</p>
                </div>
            </div>

            <!-- ORIGIN SECTION (NEW) -->
            ${cropReport.origin ? `
            <div class="origin-box">
                <strong>🌍 Origem & História:</strong> ${cropReport.origin}
            </div>` : ''}

            <div class="grid-3">
                <div class="card"><strong>☀️ Exposição Solar</strong><br>${cropReport.sun}</div>
                <div class="card"><strong>💧 Rega</strong><br>${cropReport.water}</div>
                <div class="card"><strong>⛰️ Solo & pH</strong><br>${cropReport.soil.type} (${cropReport.soil.ph})</div>
            </div>

            <div class="section">
                <h3>📅 Calendário</h3>
                <p><strong>Quando Plantar:</strong> ${cropReport.plantingSeason}</p>
                <p><strong>Colheita:</strong> ${cropReport.harvestTime}</p>
            </div>

            <div class="section">
                <h3>🐞 Pragas e Doenças</h3>
                <p><strong>Pragas:</strong> ${cropReport.pests.join(', ')}</p>
                <p><strong>Doenças:</strong> ${cropReport.diseases.join(', ')}</p>
            </div>

            <div class="section">
                <h3>✅ Tratamentos e Cuidados</h3>
                <p>${cropReport.treatments}</p>
            </div>

            ${cropReport.pruning ? `
            <div class="section">
                <h3>✂️ Poda</h3>
                <p>${cropReport.pruning}</p>
            </div>` : ''}

            <div class="section">
                <h3>🤝 Associações</h3>
                <p>${cropReport.associations}</p>
            </div>
          `;
      } else if (gardenPlan) {
          // DASHBOARD LAYOUT
          contentHtml = `
            <div class="plan-header">
                <h1>${gardenPlan.title}</h1>
                <p>${month} • ${region} • ${method}</p>
            </div>

            <div class="summary-box">
                "${gardenPlan.summary}"
            </div>

            <div class="grid-2">
                <div class="card">
                    <h3>🛠️ Método (${method})</h3>
                    <p>${gardenPlan.methodAdvice}</p>
                </div>
                <div class="card">
                    <h3>🌱 Solo</h3>
                    <p>${gardenPlan.soilTips}</p>
                </div>
            </div>

            <div class="section">
                <h3>📋 Tarefas Essenciais</h3>
                <ul>
                    ${gardenPlan.tasks.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>

            ${gardenPlan.expertAnswer ? `
            <div class="expert-box">
                <h3>💡 Resposta do Especialista</h3>
                <p>${gardenPlan.expertAnswer}</p>
            </div>` : ''}
          `;
      } else {
          return; // Nothing to print
      }

      // WRITE FULL HTML DOCUMENT
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório Nexus AI</title>
            <style>
                @page { size: A4; margin: 1.5cm; }
                body { font-family: 'Helvetica', sans-serif; color: #1f2937; line-height: 1.5; margin: 0; padding: 0; }
                
                /* Layouts */
                .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                
                /* Styling */
                .header-img-container { position: relative; height: 250px; overflow: hidden; border-radius: 8px; margin-bottom: 20px; background: #333; }
                .header-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
                .header-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; }
                .header-overlay h1 { margin: 0; font-size: 32px; }
                
                .origin-box { background: #fdf4ff; border: 1px solid #f0abfc; padding: 15px; border-radius: 8px; color: #701a75; margin-bottom: 20px; font-size: 13px; }

                .plan-header { border-bottom: 2px solid #166534; margin-bottom: 20px; padding-bottom: 10px; }
                .plan-header h1 { color: #166534; margin: 0; font-size: 28px; }
                
                .card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; background: #f9fafb; page-break-inside: avoid; }
                
                .section { margin-bottom: 20px; page-break-inside: avoid; }
                h3 { color: #15803d; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 0; }
                
                .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; font-style: italic; color: #166534; margin-bottom: 20px; }
                .expert-box { background: #eef2ff; border: 1px solid #c7d2fe; padding: 15px; border-radius: 8px; color: #3730a3; page-break-inside: avoid; }
                
                ul { padding-left: 20px; }
                li { margin-bottom: 5px; }

                /* WATERMARK FIXED BOTTOM RIGHT */
                #watermark {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    z-index: 9999;
                    opacity: ${wmOpacity};
                    text-align: right;
                }
                #watermark img { width: 120px; height: auto; }
            </style>
        </head>
        <body>
            ${contentHtml}
            
            ${shouldShowWatermark ? `
            <div id="watermark">
                <img src="${wmUrl}" />
                <div style="font-size: 10px; color: #666;">Nexus AI Garden</div>
            </div>
            ` : ''}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for image load then print
      printWindow.setTimeout(() => {
          printWindow.focus();
          printWindow.print();
      }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto h-full">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-900/30 rounded-xl border border-green-500/30">
            <Sprout className="w-8 h-8 text-green-500" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-white">Estúdio de Jardinagem AI</h2>
            <p className="text-xs text-slate-400">O seu assistente agrícola pessoal.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[600px]">
          
          {/* LEFT PANEL: CONTROLS */}
          <div className="lg:col-span-4 bg-slate-800/50 p-5 rounded-xl border border-slate-700 flex flex-col gap-6 h-fit sticky top-24">
              
              {/* Tab Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                  <button 
                    onClick={() => setMode('new')}
                    className={`py-2 px-1 rounded-md text-[10px] sm:text-xs font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${mode === 'new' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                      <Sprout className="w-3 h-3" /> Novas
                  </button>
                  <button 
                    onClick={() => setMode('maintenance')}
                    className={`py-2 px-1 rounded-md text-[10px] sm:text-xs font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${mode === 'maintenance' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                      <Wrench className="w-3 h-3" /> Manutenção
                  </button>
                  <button 
                    onClick={() => setMode('search')}
                    className={`py-2 px-1 rounded-md text-[10px] sm:text-xs font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${mode === 'search' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                      <Search className="w-3 h-3" /> Pesquisa
                  </button>
              </div>

              {/* Dynamic Inputs based on Mode */}
              <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-left-2 duration-300">
                  
                  {mode === 'search' ? (
                      // SEARCH INPUTS
                      <div className="flex flex-col gap-4 h-full">
                          <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
                              <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                                  <BookOpen className="w-4 h-4" /> Enciclopédia
                              </h3>
                              <p className="text-xs text-slate-400 mb-4">
                                  Pesquise qualquer planta para obter uma ficha técnica completa, imagens e PDF.
                              </p>
                              <div className="relative">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCrop()}
                                    placeholder="Ex: Batata, Laranjeira, Coentros..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-4 pr-10 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                                    autoFocus
                                />
                                <Search className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
                              </div>
                          </div>
                          <div className="mt-auto">
                            <Button 
                                onClick={handleSearchCrop} 
                                isLoading={isLoading}
                                className="w-full bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20 py-3"
                                icon={<Search className="w-4 h-4" />}
                            >
                                Pesquisar Ficha
                            </Button>
                          </div>
                      </div>
                  ) : (
                      // PLANNING INPUTS (New & Maintenance)
                      <>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mês</label>
                                <select 
                                    value={month} 
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                                >
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Região</label>
                                <select 
                                    value={region} 
                                    onChange={(e) => setRegion(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                                >
                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Método</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setMethod('Semear (Sementes)')}
                                    className={`px-2 py-2 rounded-lg text-[10px] sm:text-xs border transition-all ${method === 'Semear (Sementes)' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                >
                                    Semear (Sementes)
                                </button>
                                <button 
                                    onClick={() => setMethod('Plantar (Mudas)')}
                                    className={`px-2 py-2 rounded-lg text-[10px] sm:text-xs border transition-all ${method === 'Plantar (Mudas)' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                >
                                    Plantar (Mudas)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Família</label>
                            <select 
                                value={family} 
                                onChange={(e) => setFamily(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                            >
                                {families.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        {/* Specific Plant Input */}
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Planta Específica (Opcional)</label>
                            <input 
                                type="text" 
                                value={specificPlant}
                                onChange={(e) => setSpecificPlant(e.target.value)}
                                placeholder="Ex: Laranjeira, Favas, Morangos..."
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Dúvidas Específicas</label>
                            <textarea 
                                value={doubts}
                                onChange={(e) => setDoubts(e.target.value)}
                                placeholder={mode === 'maintenance' ? "Ex: As folhas estão amarelas..." : "Ex: O solo é argiloso..."}
                                className="w-full h-20 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white placeholder-slate-600 resize-none focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>

                        <Button 
                            onClick={handleConsultHorta} 
                            isLoading={isLoading}
                            className="w-full bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20 py-3 mt-2"
                        >
                            {mode === 'maintenance' ? 'Ver Manutenção' : 'Planear Horta'}
                        </Button>
                      </>
                  )}

                  {/* Watermark Toggle Footer */}
                  {watermarkSettings && onToggleWatermark && (
                      <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <Stamp className={`w-3 h-3 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-green-400' : 'text-slate-500'}`} />
                              <span className="text-xs text-slate-400">Marca d'Água (PDF)</span>
                          </div>
                          <button 
                              onClick={() => setLocalWatermarkEnabled(!localWatermarkEnabled)}
                              className={`w-8 h-4 rounded-full relative transition-colors ${localWatermarkEnabled ? 'bg-green-600' : 'bg-slate-600'} ${!watermarkSettings.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={!watermarkSettings.isEnabled}
                          >
                              <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${localWatermarkEnabled ? 'translate-x-4' : ''}`} />
                          </button>
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT PANEL: RESULTS */}
          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-1 overflow-hidden relative min-h-[500px]">
              
              {/* === PLAN RESULT (NEW/MAINTENANCE) === */}
              {mode !== 'search' && (
                  gardenPlan ? (
                    <div id="dashboard-report" className="h-full bg-white text-slate-900 p-8 rounded-lg overflow-y-auto animate-in fade-in duration-500">
                        <div className="flex justify-between items-start border-b-2 border-green-100 pb-4 mb-6">
                            <div>
                                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 mb-1">{gardenPlan.title}</h3>
                                <p className="text-slate-500 text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> {month} • {region} • {method}
                                </p>
                            </div>
                            <button 
                              onClick={handlePrint}
                              className="no-print flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-medium transition-colors"
                            >
                                <Printer className="w-4 h-4" /> PDF
                            </button>
                        </div>

                        <div className="mb-8 bg-green-50 p-4 rounded-lg border border-green-100 text-green-900 italic">
                            "{gardenPlan.summary}"
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <h4 className="font-bold text-green-800 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                    <Shovel className="w-4 h-4" /> Método ({method})
                                </h4>
                                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                                    {gardenPlan.methodAdvice}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-green-800 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                    <Mountain className="w-4 h-4" /> Solo e Preparação
                                </h4>
                                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                                    {gardenPlan.soilTips}
                                </p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3">Tarefas Essenciais</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {gardenPlan.tasks.map((task, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:border-green-300 transition-colors">
                                        <div className="mt-0.5 bg-green-100 text-green-600 p-1 rounded">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm text-slate-700">{task}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {gardenPlan.expertAnswer && (
                            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl mb-6">
                                <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4" /> Resposta do Especialista
                                </h4>
                                <p className="text-indigo-800 text-sm">
                                    {gardenPlan.expertAnswer}
                                </p>
                            </div>
                        )}

                        <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100">
                            Gerado por Nexus AI - O seu assistente de agricultura.
                        </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Carrot className="w-24 h-24 mb-4 text-slate-700" />
                        <h3 className="text-xl font-medium text-slate-400">A horta está à espera</h3>
                        <p className="text-sm max-w-xs text-center mt-2">
                            Selecione as opções ao lado para gerar o seu plano personalizado.
                        </p>
                    </div>
                  )
              )}

              {/* === SEARCH RESULT (ENCYCLOPEDIA) === */}
              {mode === 'search' && (
                  cropReport ? (
                    <div id="encyclopedia-report" className="h-full bg-white text-slate-900 overflow-y-auto animate-in fade-in duration-500 rounded-lg">
                        <div className="relative h-64 overflow-hidden bg-slate-900 group">
                            <img 
                                src={`https://image.pollinations.ai/prompt/photorealistic ${cropReport.imageKeywords || cropReport.scientificName} close up high quality nature agriculture photography?width=800&height=400&nologo=true`}
                                alt={cropReport.name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                onError={(e) => e.currentTarget.style.display = 'none'} 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                            <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                                <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                                    <div>
                                        <h2 className="text-4xl font-serif font-bold text-white mb-2 drop-shadow-lg">{cropReport.name}</h2>
                                        <p className="text-green-300 italic text-sm flex items-center gap-2">
                                            <Sprout className="w-4 h-4" />
                                            {cropReport.scientificName} 
                                            <span className="text-slate-400 mx-1">•</span> 
                                            {cropReport.family}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handlePrint}
                                        className="no-print flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg transition-colors text-white text-xs font-medium border border-white/20 shadow-lg"
                                    >
                                        <Printer className="w-4 h-4" /> Imprimir / PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50">
                            
                            {/* ORIGIN SECTION (UI DISPLAY) */}
                            {cropReport.origin && (
                                <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                                    <Globe2 className="w-5 h-5 text-fuchsia-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-fuchsia-800 uppercase mb-1">Origem & História</h4>
                                        <p className="text-sm text-fuchsia-900 leading-relaxed">{cropReport.origin}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Sun className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Exposição Solar</h4>
                                        <p className="text-sm font-medium text-slate-800">{cropReport.sun}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Droplets className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Rega</h4>
                                        <p className="text-sm font-medium text-slate-800">{cropReport.water}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="p-2 bg-stone-100 text-stone-600 rounded-lg"><Mountain className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Solo & pH</h4>
                                        <p className="text-sm font-medium text-slate-800">{cropReport.soil.type} (pH {cropReport.soil.ph})</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5" /> Calendário
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Quando Plantar</span>
                                                <p className="text-slate-700 text-sm">{cropReport.plantingSeason}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Tempo até Colheita</span>
                                                <p className="text-slate-700 text-sm">{cropReport.harvestTime}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                                            <Bug className="w-5 h-5" /> Pragas e Doenças
                                        </h3>
                                        <div className="mb-4">
                                            <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Pragas Comuns</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {cropReport.pests.map(p => (
                                                    <span key={p} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">{p}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Doenças</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {cropReport.diseases.map(d => (
                                                    <span key={d} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" /> Tratamentos e Cuidados
                                        </h3>
                                        <div className="prose prose-sm text-slate-700">
                                            <p className="whitespace-pre-wrap text-sm">{cropReport.treatments}</p>
                                        </div>
                                    </div>

                                    {cropReport.pruning && (
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Scissors className="w-5 h-5 text-slate-500" /> Poda
                                            </h3>
                                            <p className="text-sm text-slate-700">{cropReport.pruning}</p>
                                        </div>
                                    )}

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <HeartHandshake className="w-5 h-5 text-pink-500" /> Associações
                                        </h3>
                                        <p className="text-sm text-slate-700">{cropReport.associations}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Search className="w-24 h-24 mb-4 text-slate-700" />
                        <h3 className="text-xl font-medium text-slate-400">Pesquisar Cultura</h3>
                        <p className="text-sm max-w-xs text-center mt-2">
                            Utilize a barra lateral para encontrar fichas técnicas detalhadas.
                        </p>
                    </div>
                  )
              )}
          </div>
      </div>
    </div>
  );
};

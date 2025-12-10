
import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { decipherAncientText } from '../services/geminiService';
import { PaleographyResult, UploadedFile, Watermark, WatermarkSettings } from '../types';
import { Scroll, UploadCloud, X, Search, BookOpen, Printer, History, Languages } from 'lucide-react';

interface PaleographyViewProps {
  watermarkSettings?: WatermarkSettings;
  activeWatermark?: Watermark;
  onToggleWatermark?: (enabled: boolean) => void;
}

export const PaleographyView: React.FC<PaleographyViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [result, setResult] = useState<PaleographyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage({
            file,
            previewUrl: result,
            base64Data: result.split(',')[1],
            mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDecipher = async () => {
    if (!inputText && !image) return;
    setIsLoading(true);
    setResult(null);
    try {
        const data = await decipherAncientText(
            inputText, 
            image ? { base64Data: image.base64Data, mimeType: image.mimeType } : undefined
        );
        setResult(data);
    } catch (e) {
        alert("Erro ao decifrar. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  // --- PDF PRINTING LOGIC ---
  const handlePrint = () => {
      if (!result) return;
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
            <title>Relatório Paleógrafo AI</title>
            <style>
                @page { size: A4; margin: 1.5cm; }
                body { font-family: 'Georgia', serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 0; padding-bottom: 80px; }
                
                h1 { color: #854d0e; font-size: 28px; border-bottom: 2px solid #ca8a04; padding-bottom: 10px; margin-bottom: 20px; font-family: 'Helvetica', sans-serif; }
                h3 { color: #a16207; font-size: 16px; margin-top: 25px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #eee; }
                
                .source-img { max-width: 100%; max-height: 400px; object-fit: contain; margin-bottom: 20px; border: 1px solid #ddd; padding: 5px; }
                
                .meta-box { background: #fefce8; border: 1px solid #fde047; padding: 15px; border-radius: 8px; display: flex; gap: 20px; margin-bottom: 20px; font-family: 'Helvetica', sans-serif; }
                .meta-item { display: flex; flex-direction: column; }
                .meta-label { font-size: 10px; color: #a16207; font-weight: bold; text-transform: uppercase; }
                .meta-value { font-size: 14px; font-weight: bold; color: #422006; }

                .transcription-box { background: #fafaf9; border-left: 4px solid #78716c; padding: 15px; font-style: italic; font-size: 14px; margin-bottom: 20px; white-space: pre-wrap; }
                .translation-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; font-size: 14px; margin-bottom: 20px; white-space: pre-wrap; }
                
                .context-box { font-size: 13px; color: #4b5563; text-align: justify; }

                /* Watermark */
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
            <h1>Relatório de Decifração</h1>
            
            ${image ? `<img src="${image.previewUrl}" class="source-img" />` : ''}
            ${inputText ? `<p style="font-size:12px; color:#666;"><strong>Texto Fornecido:</strong> ${inputText}</p>` : ''}

            <div class="meta-box">
                <div class="meta-item">
                    <span class="meta-label">Escrita / Língua</span>
                    <span class="meta-value">${result.scriptType}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Data Estimada</span>
                    <span class="meta-value">${result.estimatedDate}</span>
                </div>
            </div>

            <h3>Transcrição Original</h3>
            <div class="transcription-box">${result.transcription}</div>

            <h3>Tradução (PT-PT)</h3>
            <div class="translation-box">${result.translation}</div>

            <h3>Contexto Histórico</h3>
            <div class="context-box">${result.context}</div>

            ${shouldShowWatermark ? `
            <div id="watermark">
                <img src="${wmUrl}" />
                <div style="font-size: 10px; color: #666; font-family: sans-serif;">Nexus Paleographer</div>
            </div>
            ` : ''}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Input Section */}
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Scroll className="w-6 h-6 text-amber-500" />
                Paleógrafo AI
            </h2>
            <p className="text-slate-400 text-sm mb-6">
                Carregue uma imagem de um manuscrito antigo ou cole texto para decifrar, transcrever e traduzir.
            </p>

            {/* Image Upload */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Imagem (Manuscrito/Pedra)</label>
                {!image ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-slate-800/50 transition-all"
                    >
                        <UploadCloud className="w-8 h-8 text-amber-500/50 mb-2" />
                        <span className="text-xs text-slate-400">Carregar Imagem</span>
                    </div>
                ) : (
                    <div className="relative h-48 rounded-lg overflow-hidden border border-slate-600 bg-slate-900 flex justify-center">
                        <img src={image.previewUrl} className="h-full object-contain" alt="Source" />
                        <button 
                            onClick={() => { setImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-red-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
            </div>

            {/* Text Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Texto (Opcional)</label>
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Se já tiver o texto, cole-o aqui para tradução..."
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 resize-none"
                />
            </div>

            <Button 
                onClick={handleDecipher} 
                isLoading={isLoading} 
                disabled={!image && !inputText}
                className="w-full bg-amber-700 hover:bg-amber-600"
                icon={<Search className="w-4 h-4" />}
            >
                Decifrar e Traduzir
            </Button>
        </div>
      </div>

      {/* Result Section */}
      <div className="h-full">
          {result ? (
              <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col animate-in fade-in duration-500">
                  <div className="bg-amber-50 p-6 border-b border-amber-200 flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                                  {result.scriptType}
                              </span>
                              <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                                  {result.estimatedDate}
                              </span>
                          </div>
                          <h3 className="text-xl font-bold text-amber-900">Relatório de Decifração</h3>
                      </div>
                      <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 rounded text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                      >
                          <Printer className="w-4 h-4" /> PDF
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
                      
                      <div className="bg-white/80 p-4 rounded-lg border border-slate-200 shadow-sm">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase mb-2">
                              <BookOpen className="w-4 h-4" /> Transcrição
                          </h4>
                          <p className="font-serif text-lg text-slate-900 italic whitespace-pre-wrap">{result.transcription}</p>
                      </div>

                      <div className="bg-green-50/80 p-4 rounded-lg border border-green-200 shadow-sm">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-green-700 uppercase mb-2">
                              <Languages className="w-4 h-4" /> Tradução
                          </h4>
                          <p className="text-slate-800 whitespace-pre-wrap">{result.translation}</p>
                      </div>

                      <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase mb-2">
                              <History className="w-4 h-4" /> Contexto
                          </h4>
                          <p className="text-sm text-slate-600 text-justify">{result.context}</p>
                      </div>

                  </div>
              </div>
          ) : (
              <div className="h-full bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <Scroll className="w-16 h-16 opacity-20 mb-4" />
                  <p className="text-lg font-medium">À espera do manuscrito...</p>
              </div>
          )}
      </div>

    </div>
  );
};

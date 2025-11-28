
import React, { useState, useRef } from 'react';
import { UploadedFile, GeneratedImageResult, Watermark, WatermarkSettings } from '../types';
import { restorePhoto } from '../services/geminiService';
import { applyWatermarkToImage } from '../services/imageProcessing';
import { Button } from './Button';
import { ResultViewer } from './ResultViewer';
import { UploadCloud, Wand2, X, History, Stamp } from 'lucide-react';

interface RestorationViewProps {
  watermarkSettings?: WatermarkSettings;
  activeWatermark?: Watermark;
  onToggleWatermark?: (enabled: boolean) => void;
}

export const RestorationView: React.FC<RestorationViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [inputImage, setInputImage] = useState<UploadedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Local Toggle
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setInputImage({
            file,
            previewUrl: resultStr,
            base64Data: resultStr.split(',')[1],
            mimeType: file.type
        });
        setResult(null); // Reset previous result
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleRestore = async () => {
    if (!inputImage) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await restorePhoto(inputImage.base64Data, inputImage.mimeType);
      
      // Apply Watermark if enabled (Global && Local)
      const shouldApply = watermarkSettings?.isEnabled && localWatermarkEnabled && activeWatermark;
      
      if (data.imageUrl && shouldApply) {
        const watermarkedUrl = await applyWatermarkToImage(
             data.imageUrl, 
             activeWatermark!, 
             watermarkSettings!
        );
        data.imageUrl = watermarkedUrl;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erro ao restaurar fotografia.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            
            {/* Input Column */}
            <div className="flex flex-col gap-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-amber-400" />
                        Restauro de Fotos Antigas
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Recupere memórias preciosas. A IA irá remover ruído, riscos e melhorar a nitidez de fotos antigas ou danificadas.
                    </p>

                    {/* Upload Area */}
                    <div className="mb-6">
                        {!inputImage ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="h-64 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-slate-800/50 transition-all group"
                            >
                                <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-amber-400" />
                                </div>
                                <p className="text-slate-300 font-medium">Carregar Foto Antiga</p>
                                <p className="text-xs text-slate-500 mt-2">JPG ou PNG</p>
                            </div>
                        ) : (
                            <div className="relative h-64 rounded-xl overflow-hidden border border-slate-600 bg-slate-900 group">
                                <img 
                                    src={inputImage.previewUrl} 
                                    alt="Original" 
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm">
                                    Original
                                </div>
                                <button 
                                    onClick={() => { setInputImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

                    {/* Watermark Toggle */}
                    {watermarkSettings && onToggleWatermark && (
                        <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-6">
                            <div className="flex items-center gap-2">
                                <Stamp className={`w-4 h-4 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                                <span className="text-sm text-slate-300">Marca d'Água Automática</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {localWatermarkEnabled && watermarkSettings.isEnabled && !activeWatermark && (
                                    <span className="text-[10px] text-red-400 mr-2">Nenhuma selecionada</span>
                                )}
                                <button 
                                    onClick={() => setLocalWatermarkEnabled(!localWatermarkEnabled)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${localWatermarkEnabled ? 'bg-indigo-600' : 'bg-slate-600'} ${!watermarkSettings.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!watermarkSettings.isEnabled}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${localWatermarkEnabled ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    <Button 
                        onClick={handleRestore} 
                        isLoading={isLoading} 
                        disabled={!inputImage}
                        className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                        icon={<Wand2 className="w-5 h-5" />}
                    >
                        Restaurar Fotografia
                    </Button>
                </div>
            </div>

            {/* Result Column */}
            <div className="h-full min-h-[400px]">
                <ResultViewer 
                    result={result} 
                    isLoading={isLoading} 
                    error={error}
                    prompt="Foto restaurada com IA"
                />
            </div>
        </div>
    </div>
  );
};

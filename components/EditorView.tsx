import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio, GeneratedImageResult, UploadedFile, EditorInitialState, Watermark, WatermarkSettings, AdvancedSettings } from '../types';
import { editImageWithPrompt } from '../services/geminiService';
import { applyWatermarkToImage } from '../services/imageProcessing';
import { Button } from './Button';
import { ResultViewer } from './ResultViewer';
import { AdvancedSettingsPanel } from './AdvancedSettingsPanel';
import { ImagePlus, X, PenTool, UploadCloud, Stamp, Plus } from 'lucide-react';

// Helper to find the closest supported aspect ratio
const determineAspectRatio = (width: number, height: number): AspectRatio => {
  const ratio = width / height;
  const options: { r: AspectRatio; val: number }[] = [
    { r: '1:1', val: 1 },
    { r: '16:9', val: 16 / 9 },
    { r: '9:16', val: 9 / 16 },
    { r: '4:3', val: 4 / 3 },
    { r: '3:4', val: 3 / 4 },
  ];
  
  return options.reduce((prev, curr) => 
    Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
  ).r;
};

interface EditorViewProps {
  initialState?: EditorInitialState | null;
  onClearInitialState?: () => void;
  watermarkSettings: WatermarkSettings;
  activeWatermark: Watermark | undefined;
  onToggleWatermark: (enabled: boolean) => void;
  sharedPrompt?: string | null;
  onConsumeSharedPrompt?: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ 
    initialState, 
    onClearInitialState,
    watermarkSettings,
    activeWatermark,
    onToggleWatermark,
    sharedPrompt,
    onConsumeSharedPrompt
}) => {
  const [prompt, setPrompt] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
      quality: 'standard',
      aspectRatio: '1:1', // Will be overwritten by image detection
      negativePrompt: '' // Not used in editor
  });

  // Now supports multiple files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from props if available (Single image from Gallery/History)
  useEffect(() => {
    if (initialState) {
      setUploadedFiles([initialState.image]);
      setPrompt(initialState.prompt);
      
      // Attempt to set aspect ratio based on loaded image
      const img = new Image();
      img.onload = () => {
        const ratio = determineAspectRatio(img.width, img.height);
        setAdvancedSettings(prev => ({ ...prev, aspectRatio: ratio }));
      };
      img.src = initialState.image.previewUrl;
      
      // Clear the initial state so it doesn't re-apply if user clears manually later
      if (onClearInitialState) onClearInitialState();
    }
  }, [initialState, onClearInitialState]);

  // Listen for shared prompt from global Template Manager
  useEffect(() => {
    if (sharedPrompt && onConsumeSharedPrompt) {
        // Smart Insertion Logic for Editor
        if (sharedPrompt.includes('{prompt}')) {
            const currentText = prompt.trim();
            const newText = sharedPrompt.replace('{prompt}', currentText);
            setPrompt(newText);
        } else {
            setPrompt(sharedPrompt);
        }
        onConsumeSharedPrompt();
    }
  }, [sharedPrompt, onConsumeSharedPrompt]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1];

        const img = new Image();
        img.onload = () => {
            // Only update aspect ratio if it's the first image
            if (uploadedFiles.length === 0) {
                const bestRatio = determineAspectRatio(img.width, img.height);
                setAdvancedSettings(prev => ({ ...prev, aspectRatio: bestRatio }));
            }
            
            const newFile: UploadedFile = {
              file,
              previewUrl: resultStr,
              base64Data,
              mimeType: file.type
            };
            
            setUploadedFiles(prev => [...prev, newFile]);
        };
        img.src = resultStr;
      };
      
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) {
        setAdvancedSettings(prev => ({ ...prev, aspectRatio: '1:1' })); // Reset if clearing last one
    }
  };

  const handleClearAll = () => {
      setUploadedFiles([]);
      setAdvancedSettings(prev => ({ ...prev, aspectRatio: '1:1' }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || uploadedFiles.length === 0) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Prepare images for service
      const imagesToEdit = uploadedFiles.map(f => ({
          base64Data: f.base64Data,
          mimeType: f.mimeType
      }));

      const data = await editImageWithPrompt(
        imagesToEdit,
        prompt,
        advancedSettings.aspectRatio,
        advancedSettings.quality
      );

       // Apply Watermark if enabled
       if (data.imageUrl && watermarkSettings.isEnabled && activeWatermark) {
        const watermarkedUrl = await applyWatermarkToImage(
            data.imageUrl, 
            activeWatermark, 
            watermarkSettings
        );
        data.imageUrl = watermarkedUrl;
     }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-indigo-400" />
            Editar Imagem
          </h2>
          
          <div className="space-y-4">
            
            {/* File Upload Area */}
            <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">
                        Imagens de Referência ({uploadedFiles.length})
                    </label>
                    {uploadedFiles.length > 0 && (
                        <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300">
                            Limpar Tudo
                        </button>
                    )}
                </div>
                
                {/* Images Grid */}
                {uploadedFiles.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group">
                                <img 
                                    src={file.previewUrl} 
                                    alt={`Ref ${idx}`} 
                                    className="w-full h-full object-cover"
                                />
                                <button 
                                    onClick={() => handleRemoveFile(idx)}
                                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        
                        {/* Add More Button */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                            <Plus className="w-6 h-6 text-slate-500" />
                            <span className="text-xs text-slate-500 mt-1">Adicionar</span>
                        </div>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
                    >
                        <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-6 h-6 text-indigo-400" />
                        </div>
                        <p className="text-sm text-slate-300 font-medium">Carregar Imagens</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG até 5MB</p>
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Instruções de Edição
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="O que gostaria de alterar? (ex: Misture o estilo da primeira imagem com a composição da segunda)"
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 pr-10 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
                {prompt && (
                  <button 
                    onClick={() => setPrompt('')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                    title="Limpar texto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <AdvancedSettingsPanel 
                settings={advancedSettings}
                onChange={setAdvancedSettings}
                mode="editing"
                disabled={isLoading}
            />

            {/* Watermark Toggle */}
            <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                    <Stamp className={`w-4 h-4 ${watermarkSettings.isEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-sm text-slate-300">Marca d'Água Automática</span>
                </div>
                <div className="flex items-center gap-2">
                    {watermarkSettings.isEnabled && !activeWatermark && (
                        <span className="text-[10px] text-red-400 mr-2">Nenhuma selecionada</span>
                    )}
                    <button 
                        onClick={() => onToggleWatermark(!watermarkSettings.isEnabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${watermarkSettings.isEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${watermarkSettings.isEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              isLoading={isLoading} 
              disabled={!prompt.trim() || uploadedFiles.length === 0}
              className="w-full mt-4"
              icon={<ImagePlus className="w-4 h-4" />}
            >
              Gerar Edição
            </Button>
          </div>
        </div>
      </div>

      <div className="h-full min-h-[500px]">
        <ResultViewer 
            key={result?.imageUrl || 'res'}
            result={result} 
            isLoading={isLoading} 
            error={error} 
        />
      </div>
    </div>
  );
};
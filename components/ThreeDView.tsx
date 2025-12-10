
import React, { useState, useRef } from 'react';
import { UploadedFile, GeneratedImageResult, Watermark, WatermarkSettings } from '../types';
import { transformTo3D } from '../services/geminiService';
import { applyWatermarkToImage } from '../services/imageProcessing';
import { Button } from './Button';
import { ResultViewer } from './ResultViewer';
import { Box, UploadCloud, X, Cuboid, Layers, Monitor, Triangle, Stamp } from 'lucide-react';

interface ThreeDViewProps {
  watermarkSettings: WatermarkSettings;
  activeWatermark: Watermark | undefined;
  onToggleWatermark: (enabled: boolean) => void;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [style, setStyle] = useState('Claymorphism');
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local Watermark Toggle
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = [
      { id: 'Claymorphism', label: 'Clay / Plasticina', icon: <Box className="w-4 h-4" /> },
      { id: 'Low Poly', label: 'Low Poly', icon: <Triangle className="w-4 h-4" /> },
      { id: 'Voxel Art', label: 'Voxel / Minecraft', icon: <Cuboid className="w-4 h-4" /> },
      { id: 'Isometric 3D', label: 'Isométrico', icon: <Layers className="w-4 h-4" /> },
      { id: 'Photorealistic 3D Render, Unreal Engine 5', label: 'Realista (Unreal)', icon: <Monitor className="w-4 h-4" /> },
      { id: 'Origami Paper 3D', label: 'Origami', icon: <Box className="w-4 h-4" /> }
  ];

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
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransform = async () => {
    if (!image) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
        const res = await transformTo3D(
            { base64Data: image.base64Data, mimeType: image.mimeType },
            style
        );

        // Apply Watermark
        const shouldApply = watermarkSettings.isEnabled && localWatermarkEnabled && activeWatermark;
        if (res.imageUrl && shouldApply) {
            const watermarkedUrl = await applyWatermarkToImage(
                res.imageUrl,
                activeWatermark!,
                watermarkSettings
            );
            res.imageUrl = watermarkedUrl;
        }

        setResult(res);
    } catch (e: any) {
        setError(e.message || "Erro ao transformar imagem.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Input Section */}
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <Box className="w-8 h-8 text-cyan-500" />
                Estúdio 3D
            </h2>
            <p className="text-slate-400 text-sm mb-6">
                Transforme imagens 2D planas em renderizações 3D impressionantes com iluminação e profundidade.
            </p>

            <div className="space-y-6">
                {/* Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Imagem Original (2D)</label>
                    {!image ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 hover:bg-slate-800/50 transition-all group"
                        >
                            <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                                <UploadCloud className="w-6 h-6" />
                                <span className="text-sm">Carregar Imagem</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-32 rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group flex items-center justify-center">
                            <img src={image.previewUrl} className="h-full object-contain" alt="Ref" />
                            <button 
                                onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-red-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                </div>

                {/* Style Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Estilo de Renderização</label>
                    <div className="grid grid-cols-2 gap-2">
                        {styles.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setStyle(s.id)}
                                className={`p-3 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${style === s.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-900/20' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                            >
                                {s.icon} {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Watermark Toggle */}
                <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2">
                        <Stamp className={`w-4 h-4 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="text-sm text-slate-300">Marca d'Água Automática</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {localWatermarkEnabled && watermarkSettings.isEnabled && !activeWatermark && (
                            <span className="text-[10px] text-red-400 mr-2">Nenhuma selecionada</span>
                        )}
                        <button 
                            onClick={() => setLocalWatermarkEnabled(!localWatermarkEnabled)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${localWatermarkEnabled ? 'bg-cyan-600' : 'bg-slate-600'} ${!watermarkSettings.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!watermarkSettings.isEnabled}
                        >
                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${localWatermarkEnabled ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                </div>

                <Button 
                    onClick={handleTransform} 
                    isLoading={isLoading} 
                    disabled={!image}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                    icon={<Cuboid className="w-4 h-4" />}
                >
                    Transformar em 3D
                </Button>
            </div>
        </div>
      </div>

      {/* Output Section */}
      <div className="h-full min-h-[500px]">
          <ResultViewer 
            result={result} 
            isLoading={isLoading} 
            error={error} 
            prompt={`Transformação 3D: ${style}`}
          />
      </div>

    </div>
  );
};

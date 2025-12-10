
import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile, GeneratedImageResult, Watermark, WatermarkSettings } from '../types';
import { removeObjectFromImage } from '../services/geminiService';
import { applyWatermarkToImage } from '../services/imageProcessing';
import { Button } from './Button';
import { ResultViewer } from './ResultViewer';
import { Eraser, UploadCloud, X, RefreshCcw, ImagePlus, Stamp } from 'lucide-react';

interface RemovalViewProps {
  watermarkSettings: WatermarkSettings;
  activeWatermark: Watermark | undefined;
  onToggleWatermark: (enabled: boolean) => void;
}

export const RemovalView: React.FC<RemovalViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Initialize Canvas when image loads
  useEffect(() => {
    if (image && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
            setImgElement(img);
            const canvas = canvasRef.current!;
            
            // Adjust canvas to image size (capped for performance)
            const maxDim = 1024;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                const ratio = w / h;
                if (w > h) { w = maxDim; h = maxDim / ratio; }
                else { h = maxDim; w = maxDim * ratio; }
            }

            canvas.width = w;
            canvas.height = h;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
            }
        };
        img.src = image.previewUrl;
    }
  }, [image]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (!imgElement) return;
      setIsDrawing(true);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
          const { x, y } = getCoordinates(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Semitransparent Red
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
      }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
          const { x, y } = getCoordinates(e);
          ctx.lineTo(x, y);
          ctx.stroke();
      }
  };

  const stopDrawing = () => {
      setIsDrawing(false);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.closePath();
  };

  const handleClearMask = () => {
      if (!imgElement || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.drawImage(imgElement, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  };

  const handleGenerate = async () => {
      if (!image || !canvasRef.current) return;

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
          // Get the combined image (Base + Red Mask)
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
          const base64 = dataUrl.split(',')[1];
          const mime = 'image/jpeg';

          // Send to AI
          const data = await removeObjectFromImage(base64, mime);

          // Apply Watermark
          const shouldApply = watermarkSettings.isEnabled && localWatermarkEnabled && activeWatermark;
          if (data.imageUrl && shouldApply) {
              const watermarkedUrl = await applyWatermarkToImage(
                  data.imageUrl,
                  activeWatermark!,
                  watermarkSettings
              );
              data.imageUrl = watermarkedUrl;
          }

          setResult(data);
      } catch (err: any) {
          setError(err.message || "Erro ao remover objeto.");
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        
        {/* Controls */}
        <div className="flex flex-col gap-6">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Eraser className="w-6 h-6 text-red-400" />
                    Estúdio de Remoção
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                    Pinte a vermelho sobre o objeto que deseja remover. A IA reconstruirá o fundo.
                </p>

                {/* Upload */}
                <div className="mb-6">
                    {!image ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-slate-800/50 transition-all group"
                        >
                            <UploadCloud className="w-8 h-8 text-red-500/50 mb-2 group-hover:text-red-500" />
                            <span className="text-xs text-slate-400">Carregar Imagem</span>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <span className="text-sm text-slate-300 truncate max-w-[200px]">{image.file?.name || 'Imagem carregada'}</span>
                            <button 
                                onClick={() => { setImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                </div>

                {/* Brush Controls */}
                <div className={`mb-6 transition-opacity ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tamanho do Pincel: {brushSize}px</label>
                    <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleClearMask} variant="secondary" className="text-xs w-full" icon={<RefreshCcw className="w-3 h-3" />}>
                            Limpar Máscara
                        </Button>
                    </div>
                </div>

                {/* Watermark Toggle */}
                {watermarkSettings && onToggleWatermark && (
                    <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-6">
                        <div className="flex items-center gap-2">
                            <Stamp className={`w-4 h-4 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="text-sm text-slate-300">Marca d'Água</span>
                        </div>
                        <button 
                            onClick={() => setLocalWatermarkEnabled(!localWatermarkEnabled)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${localWatermarkEnabled ? 'bg-indigo-600' : 'bg-slate-600'} ${!watermarkSettings.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!watermarkSettings.isEnabled}
                        >
                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${localWatermarkEnabled ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                )}

                <Button 
                    onClick={handleGenerate} 
                    isLoading={isLoading} 
                    disabled={!image}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                    icon={<Eraser className="w-5 h-5" />}
                >
                    Remover Objeto
                </Button>
            </div>
        </div>

        {/* Canvas / Result */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 overflow-hidden relative flex flex-col min-h-[400px]">
            {!result ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-900/50">
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className={`max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg cursor-crosshair ${!image ? 'hidden' : ''}`}
                    />
                    {!image && (
                        <div className="text-center text-slate-600">
                            <ImagePlus className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>Carregue uma imagem para começar</p>
                        </div>
                    )}
                </div>
            ) : (
                <ResultViewer 
                    result={result} 
                    isLoading={isLoading} 
                    error={error}
                    prompt="Objeto removido"
                    onEdit={() => setResult(null)} // Simple way to go back
                />
            )}
        </div>

    </div>
  );
};

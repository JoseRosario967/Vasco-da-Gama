
import React, { useState, useRef } from 'react';
import { UploadedFile } from '../types';
import { Button } from './Button';
import { Ghost, UploadCloud, X, Download, Sliders } from 'lucide-react';

export const TransparencyView: React.FC = () => {
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [opacity, setOpacity] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1];
        
        const fileData: UploadedFile = {
          file,
          previewUrl: resultStr,
          base64Data,
          mimeType: file.type
        };

        setImage(fileData);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
            // Clear canvas (transparency)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Apply opacity
            ctx.globalAlpha = opacity / 100;
            // Draw image
            ctx.drawImage(img, 0, 0);

            // Export
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `transparencia-${opacity}-${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    img.src = image.previewUrl;
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-8">
      
      {/* Header */}
      <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Ghost className="w-8 h-8 text-indigo-400" />
            Estúdio de Transparência
        </h2>
        <p className="text-slate-400 text-sm">
            Ajuste a opacidade das suas imagens e guarde com fundo transparente (PNG). Ideal para sobreposições e web design.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        
        {/* Controls Side */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-fit">
            
            {/* Upload */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-3">Imagem Original</label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
                >
                    <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                        {image ? 'Trocar Imagem' : 'Carregar Imagem'}
                    </p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="image/*" 
                    className="hidden" 
                />
            </div>

            {/* Slider */}
            <div className={`transition-opacity ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Sliders className="w-4 h-4" /> Opacidade
                    </label>
                    <span className="text-sm font-bold text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                        {opacity}%
                    </span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={opacity} 
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
                    <span>Invisível</span>
                    <span>Sólido</span>
                </div>
            </div>

            {/* Action */}
            <div className="mt-8">
                <Button 
                    onClick={handleDownload} 
                    disabled={!image}
                    className="w-full"
                    icon={<Download className="w-4 h-4" />}
                >
                    Descarregar PNG
                </Button>
            </div>
        </div>

        {/* Preview Side */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative flex items-center justify-center min-h-[400px]">
            
            {/* Checkerboard Background (CSS Pattern) */}
            <div className="absolute inset-0 z-0 opacity-20" style={{
                backgroundImage: `
                    linear-gradient(45deg, #808080 25%, transparent 25%), 
                    linear-gradient(-45deg, #808080 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #808080 75%), 
                    linear-gradient(-45deg, transparent 75%, #808080 75%)
                `,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }} />

            {image ? (
                <div className="relative z-10 p-8 w-full h-full flex items-center justify-center">
                    <img 
                        src={image.previewUrl} 
                        alt="Preview" 
                        style={{ opacity: opacity / 100 }}
                        className="max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-200"
                    />
                    <button 
                        onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full hover:bg-red-500/80 transition-colors z-20 border border-slate-700"
                        title="Limpar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="relative z-10 text-slate-600 flex flex-col items-center">
                    <Ghost className="w-16 h-16 mb-4 opacity-20" />
                    <p>A área de pré-visualização está vazia</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};


import React, { useState, useRef } from 'react';
import { UploadedFile } from '../types';
import { discoverImagePrompt } from '../services/geminiService';
import { Button } from './Button';
import { ScanSearch, UploadCloud, X, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';

interface PromptDiscoveryViewProps {
  onApplyPrompt: (file: UploadedFile, prompt: string) => void;
}

export const PromptDiscoveryView: React.FC<PromptDiscoveryViewProps> = ({ onApplyPrompt }) => {
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [detectedPrompt, setDetectedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        setDetectedPrompt(null); // Reset result
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDiscover = async () => {
    if (!image) return;

    setIsLoading(true);
    setError(null);
    setDetectedPrompt(null);

    try {
      const prompt = await discoverImagePrompt(
        image.base64Data,
        image.mimeType
      );
      setDetectedPrompt(prompt);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao analisar a imagem.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (detectedPrompt) {
      navigator.clipboard.writeText(detectedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <ScanSearch className="w-8 h-8 text-cyan-400" />
          Descobridor de Prompt
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          Carregue qualquer imagem e a IA fará a engenharia reversa para descobrir o prompt exato necessário para a criar.
        </p>

        {/* Upload Area */}
        <div className="mb-8">
            {!image ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-64 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 hover:bg-slate-800/50 transition-all group"
                >
                    <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-10 h-10 text-cyan-400" />
                    </div>
                    <p className="text-lg text-slate-200 font-medium">Carregar Imagem para Análise</p>
                    <p className="text-sm text-slate-500 mt-2">Suporta JPG e PNG</p>
                </div>
            ) : (
                <div className="relative h-64 rounded-xl overflow-hidden border border-slate-600 bg-slate-900 group flex justify-center">
                    <img 
                        src={image.previewUrl} 
                        alt="To Analyze" 
                        className="h-full object-contain"
                    />
                    <button 
                        onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
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

        <Button 
          onClick={handleDiscover} 
          isLoading={isLoading} 
          disabled={!image}
          className="w-full py-4 text-lg bg-cyan-600 hover:bg-cyan-500"
          icon={<Sparkles className="w-5 h-5" />}
        >
          Revelar a Magia (Descobrir Prompt)
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg text-center mb-6">
          {error}
        </div>
      )}

      {detectedPrompt && (
        <div className="bg-gradient-to-br from-slate-900 to-cyan-900/20 border border-cyan-500/30 rounded-xl p-8 animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <ScanSearch className="w-4 h-4" />
                Prompt Detetado
              </h3>
              <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  Otimizado para Geradores de Imagem
              </span>
          </div>
          
          <div className="bg-black/40 p-6 rounded-lg border border-slate-700/50 text-slate-100 text-lg leading-loose font-mono mb-8 shadow-inner">
            "{detectedPrompt}"
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button 
              variant="secondary" 
              onClick={handleCopy}
              className="flex-1 sm:flex-none"
              icon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </Button>
            
            <Button 
              onClick={() => image && onApplyPrompt(image, detectedPrompt)}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Editar com este Prompt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

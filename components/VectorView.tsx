
import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { generateSvgCode } from '../services/geminiService';
import { UploadedFile } from '../types';
import { UploadCloud, PenTool, X, Code, Download, Copy, Check, Palette, Sparkles } from 'lucide-react';

type VectorType = 'icon' | 'logo' | 'illustration';

export const VectorView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [vectorType, setVectorType] = useState<VectorType>('icon');
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

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

  const handleGenerate = async () => {
    if (!prompt.trim() && !image) return;
    setIsLoading(true);
    setSvgCode(null);
    
    try {
        const code = await generateSvgCode(
            prompt || "Convert this image to vector", 
            image ? { base64Data: image.base64Data, mimeType: image.mimeType } : undefined,
            vectorType
        );
        setSvgCode(code);
    } catch (e) {
        alert("Erro ao gerar vetor. Tente simplificar o pedido.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
      if (!svgCode) return;
      const blob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexus-vector-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCopy = () => {
      if (!svgCode) return;
      navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Input Section */}
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <PenTool className="w-8 h-8 text-orange-500" />
                Estúdio Vetorial
            </h2>
            <p className="text-slate-400 text-sm mb-6">
                Converta ideias ou imagens em código SVG limpo e escalável. Ideal para ícones e logótipos.
            </p>

            <div className="space-y-6">
                {/* Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Imagem de Referência (Opcional)</label>
                    {!image ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-24 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-slate-800/50 transition-all group"
                        >
                            <div className="flex items-center gap-2 text-slate-400 group-hover:text-orange-400">
                                <UploadCloud className="w-5 h-5" />
                                <span className="text-sm">Vetorizar Imagem</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-24 rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group flex items-center justify-center">
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

                {/* Prompt */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descrição do Vetor</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={image ? "Descreva o que quer extrair da imagem (ex: apenas o logo, simplificado...)" : "Ex: Ícone minimalista de um foguetão espacial, linhas grossas, estilo flat..."}
                        className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    />
                </div>

                {/* Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Saída</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['icon', 'logo', 'illustration'] as VectorType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setVectorType(t)}
                                className={`p-2 rounded-lg text-xs font-bold uppercase transition-all border ${vectorType === t ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <Button 
                    onClick={handleGenerate} 
                    isLoading={isLoading} 
                    disabled={!prompt && !image}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500"
                    icon={<Sparkles className="w-4 h-4" />}
                >
                    Gerar SVG
                </Button>
            </div>
        </div>
      </div>

      {/* Output Section */}
      <div className="h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative min-h-[500px]">
          
          {/* Toolbar */}
          <div className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-500" /> Pré-visualização
              </h3>
              
              <div className="flex gap-2">
                  <button 
                    onClick={() => setShowCode(!showCode)}
                    disabled={!svgCode}
                    className={`p-2 rounded hover:bg-slate-800 transition-colors ${showCode ? 'text-orange-400 bg-slate-800' : 'text-slate-400'}`}
                    title="Ver Código"
                  >
                      <Code className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleCopy}
                    disabled={!svgCode}
                    className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copiar Código"
                  >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={handleDownload}
                    disabled={!svgCode}
                    className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Descarregar SVG"
                  >
                      <Download className="w-4 h-4" />
                  </button>
              </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900">
             {isLoading ? (
                 <div className="flex flex-col items-center gap-4 animate-pulse">
                     <div className="w-16 h-16 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
                     <p className="text-orange-400 font-medium">A desenhar vetores...</p>
                 </div>
             ) : svgCode ? (
                 showCode ? (
                     <div className="absolute inset-0 bg-slate-950 p-6 overflow-auto">
                         <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                             {svgCode}
                         </pre>
                     </div>
                 ) : (
                     <div 
                        className="w-full h-full p-12 flex items-center justify-center animate-in zoom-in-50 duration-500"
                        dangerouslySetInnerHTML={{ __html: svgCode }}
                     />
                 )
             ) : (
                 <div className="text-center text-slate-600">
                     <PenTool className="w-16 h-16 mx-auto mb-4 opacity-20" />
                     <p className="text-lg font-medium">O seu vetor aparecerá aqui</p>
                 </div>
             )}
          </div>

          <div className="p-2 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              Nota: O código gerado é uma aproximação SVG criada por IA, não um traçado matemático exato.
          </div>
      </div>

    </div>
  );
};

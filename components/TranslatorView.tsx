
import React, { useState } from 'react';
import { generateTranslation } from '../services/geminiService';
import { Button } from './Button';
import { Languages, ArrowRight, Copy, Check, Globe2, Sparkles } from 'lucide-react';

export const TranslatorView: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState('Inglês');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const languages = [
    'Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 
    'Chinês (Simplificado)', 'Japonês', 'Coreano', 'Russo', 'Árabe', 'Hindi'
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setTranslatedText('');
    try {
        const result = await generateTranslation(inputText, targetLang);
        setTranslatedText(result);
    } catch (error) {
        alert("Erro ao traduzir. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (translatedText) {
        navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full">
      <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 mb-8">
        <div className="flex items-center gap-3 mb-6">
            <Globe2 className="w-8 h-8 text-cyan-400" />
            <div>
                <h2 className="text-2xl font-bold text-white">Tradutor Universal</h2>
                <p className="text-slate-400 text-sm">Deteta a língua automaticamente e traduz com contexto cultural.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative">
            
            {/* Input Side */}
            <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-slate-300 mb-2 flex justify-between">
                    <span>Texto Original</span>
                    <span className="text-xs text-slate-500">Detetar Idioma</span>
                </label>
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Escreva ou cole o texto aqui..."
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none text-lg leading-relaxed"
                />
            </div>

            {/* Desktop Arrow */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-slate-800 border border-slate-600 rounded-full p-2 shadow-xl">
                    <ArrowRight className="w-5 h-5 text-cyan-400" />
                </div>
            </div>

            {/* Output Side */}
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">Traduzir para</label>
                    <select 
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-cyan-500 outline-none"
                    >
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                
                <div className="relative w-full h-64">
                    {isLoading ? (
                        <div className="absolute inset-0 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col items-center justify-center animate-pulse">
                            <Sparkles className="w-8 h-8 text-cyan-500 mb-2" />
                            <span className="text-slate-400 text-sm">A traduzir nuances...</span>
                        </div>
                    ) : (
                        <div className={`w-full h-full bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-y-auto ${!translatedText ? 'text-slate-600 italic' : 'text-cyan-100'}`}>
                            {translatedText || "A tradução aparecerá aqui..."}
                        </div>
                    )}
                    
                    {translatedText && !isLoading && (
                        <button 
                            onClick={handleCopy}
                            className="absolute bottom-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-600"
                            title="Copiar"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-end">
            <Button 
                onClick={handleTranslate} 
                isLoading={isLoading}
                disabled={!inputText}
                className="w-full md:w-auto px-8 bg-cyan-600 hover:bg-cyan-500"
                icon={<Languages className="w-5 h-5" />}
            >
                Traduzir Agora
            </Button>
        </div>
      </div>
    </div>
  );
};

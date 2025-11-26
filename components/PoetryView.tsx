
import React, { useState } from 'react';
import { Button } from './Button';
import { generatePoetry, generateSpeech } from '../services/geminiService';
import { PoemResult } from '../types';
import { Music, Feather, Mic2, Copy, Check, FileText, Play, Download, Volume2, Loader2, User } from 'lucide-react';

export const PoetryView: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<'Poema' | 'Letra de Música' | 'Rap' | 'Verso' | 'Prosa' | 'Texto'>('Poema');
  const [style, setStyle] = useState('');
  const [result, setResult] = useState<PoemResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  const voices = [
      { id: 'Kore', label: 'Feminina - Equilibrada' },
      { id: 'Zephyr', label: 'Feminina - Suave' },
      { id: 'Charon', label: 'Masculina - Grave' },
      { id: 'Fenrir', label: 'Masculina - Intensa' },
      { id: 'Puck', label: 'Masculina - Expressiva' }
  ];

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    setResult(null);
    setAudioUrl(null); // Clear previous audio
    try {
        const data = await generatePoetry(topic, type, style || 'Livre');
        setResult(data);
    } catch (e) {
        alert("Erro ao criar obra.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
      if (!result?.content) return;
      setIsGeneratingAudio(true);
      try {
          const blob = await generateSpeech(result.content, selectedVoice);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
      } catch (e) {
          alert("Erro ao gerar áudio.");
      } finally {
          setIsGeneratingAudio(false);
      }
  };

  const handleCopy = () => {
      if (result) {
          navigator.clipboard.writeText(`${result.title}\n\n${result.content}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const getIconForType = (t: string) => {
    switch(t) {
        case 'Rap': return <Mic2 className="w-4 h-4" />;
        case 'Letra de Música': return <Music className="w-4 h-4" />;
        case 'Texto': 
        case 'Prosa':
            return <FileText className="w-4 h-4" />;
        default: return <Feather className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Input */}
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Music className="w-8 h-8 text-purple-500" />
                Poesia & Música
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tema</label>
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Saudade, O Mar, Amor Perdido..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Obra</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Poema', 'Letra de Música', 'Rap', 'Verso', 'Prosa', 'Texto'].map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t as any)}
                                className={`p-2 rounded-lg text-xs font-bold transition-all ${type === t ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Estilo (Opcional)</label>
                    <input 
                        type="text" 
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Ex: Fernando Pessoa, Hip-hop Anos 90, Fado..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <Button 
                    onClick={handleGenerate} 
                    isLoading={isLoading} 
                    disabled={!topic}
                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500"
                    icon={getIconForType(type)}
                >
                    Criar Obra
                </Button>
            </div>
        </div>
      </div>

      {/* Output */}
      <div className="h-full">
         {result ? (
             <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col animate-in fade-in duration-500">
                 <div className="bg-slate-100 p-6 border-b border-slate-200 flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-1">{result.title}</h3>
                            <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">{type} • {result.style}</p>
                        </div>
                        <button onClick={handleCopy} className="text-slate-400 hover:text-purple-600 transition-colors">
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                     </div>

                     {/* Audio Controls */}
                     <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-slate-400" />
                            <select 
                                value={selectedVoice}
                                onChange={(e) => {
                                    setSelectedVoice(e.target.value);
                                    setAudioUrl(null); // Reset audio to allow regeneration with new voice
                                }}
                                className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer w-full"
                            >
                                {voices.map(v => (
                                    <option key={v.id} value={v.id}>{v.label}</option>
                                ))}
                            </select>
                        </div>

                        {!audioUrl ? (
                            <Button 
                                onClick={handleGenerateAudio} 
                                isLoading={isGeneratingAudio}
                                variant="ghost"
                                className="w-full text-purple-700 hover:bg-purple-50"
                                icon={<Volume2 className="w-4 h-4" />}
                            >
                                Dar Voz à Letra (Declamar)
                            </Button>
                        ) : (
                            <div className="flex items-center gap-3 w-full">
                                <audio controls autoPlay src={audioUrl} className="flex-1 h-8 w-full" />
                                <a 
                                    href={audioUrl} 
                                    download={`${result.title}.wav`}
                                    className="p-2 bg-slate-100 rounded-full hover:bg-purple-100 text-purple-600 transition-colors"
                                    title="Descarregar Áudio"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                        )}
                     </div>
                 </div>
                 
                 <div className="flex-1 p-8 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
                     <pre className="font-serif text-lg leading-loose whitespace-pre-wrap text-slate-800">
                         {result.content}
                     </pre>
                 </div>
             </div>
         ) : (
            <div className="h-full bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 p-8 text-center min-h-[400px]">
                <Feather className="w-16 h-16 opacity-20 mb-4" />
                <p className="text-lg font-medium">A musa inspiradora aguarda...</p>
                <p className="text-sm max-w-xs mt-2 opacity-60">Defina o tema e o estilo para gerar a sua obra prima.</p>
            </div>
         )}
      </div>

    </div>
  );
};

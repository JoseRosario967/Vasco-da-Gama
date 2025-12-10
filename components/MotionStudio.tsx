
import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile } from '../types';
import { Button } from './Button';
import { Film, UploadCloud, X, Play, Square, Download, Video, Zap } from 'lucide-react';

type MotionEffect = 'zoom' | 'pan' | 'shake' | 'pulse';

export const MotionStudio: React.FC = () => {
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [effect, setEffect] = useState<MotionEffect>('zoom');
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Setup Canvas when image loads
  useEffect(() => {
    if (image && canvasRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imgRef.current = img;
        const canvas = canvasRef.current!;
        // Set canvas to HD resolution or image resolution (max 1080p for performance)
        const maxDim = 1080;
        let w = img.width;
        let h = img.height;
        
        if (w > maxDim || h > maxDim) {
           const ratio = w / h;
           if (w > h) { w = maxDim; h = maxDim / ratio; }
           else { h = maxDim; w = maxDim * ratio; }
        }
        
        canvas.width = w;
        canvas.height = h;
        drawFrame(0); // Draw initial frame
      };
      img.src = image.previewUrl;
    }
    
    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [image]);

  // Animation Loop
  const drawFrame = (timestamp: number, startTime?: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    
    if (!canvas || !ctx || !img) return;

    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const duration = 3000; // 3 seconds video
    const progress = Math.min(elapsed / duration, 1);
    
    if (isRecording) setProgress(Math.round(progress * 100));

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Base dimensions
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // Apply Effects
    if (effect === 'zoom') {
        // Ken Burns Zoom In
        const scale = 1 + (progress * 0.15); // Zoom in 15%
        const xOffset = (w * scale - w) / 2;
        const yOffset = (h * scale - h) / 2;
        ctx.translate(-xOffset, -yOffset);
        ctx.scale(scale, scale);
    } 
    else if (effect === 'pan') {
        // Pan Right
        const scale = 1.1; // Need slight zoom to pan without edges
        const maxPan = w * 0.1;
        const currentPan = maxPan * progress;
        
        ctx.scale(scale, scale);
        ctx.translate(-currentPan, 0);
    }
    else if (effect === 'shake') {
        // Earthquake
        const intensity = 10 * (1 - progress); // Fade out shake
        const dx = (Math.random() - 0.5) * intensity;
        const dy = (Math.random() - 0.5) * intensity;
        ctx.translate(dx, dy);
        ctx.scale(1.05, 1.05); // Slight zoom to cover edges
    }
    else if (effect === 'pulse') {
        // Heartbeat
        const scale = 1 + (Math.sin(progress * Math.PI * 4) * 0.05);
        const xOffset = (w * scale - w) / 2;
        const yOffset = (h * scale - h) / 2;
        ctx.translate(-xOffset, -yOffset);
        ctx.scale(scale, scale);
    }

    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();

    // Loop logic
    if (isRecording) {
        if (progress < 1) {
            animationRef.current = requestAnimationFrame((t) => drawFrame(t, startTime));
        } else {
            stopRecording();
        }
    } else {
        // Preview Loop (continuous)
        const loopProgress = (Date.now() % duration) / duration;
        // Recursive call with fake timestamp for preview
        // Note: For preview we might want a simpler loop or just static. 
        // Let's keep it static when not recording to save battery/cpu, or animate on hover?
        // For now, let's just draw static unless recording to keep it simple.
    }
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setVideoUrl(null);
    chunksRef.current = [];

    // Capture Stream (30 FPS)
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        setProgress(0);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    // Start Animation Loop
    requestAnimationFrame((t) => drawFrame(t, t));
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({
            file,
            previewUrl: reader.result as string,
            base64Data: (reader.result as string).split(',')[1],
            mimeType: file.type
        });
        setVideoUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Controls */}
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Film className="w-6 h-6 text-pink-500" />
                Estúdio de Animação
            </h2>
            <p className="text-slate-400 text-sm mb-6">
                Dê vida às suas fotos estáticas. Crie vídeos curtos com efeitos cinematográficos.
            </p>

            {/* Upload */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Imagem Base</label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-slate-800/50 transition-all group"
                >
                    <UploadCloud className="w-8 h-8 text-pink-500/50 mb-2 group-hover:text-pink-500" />
                    <span className="text-xs text-slate-400">Carregar Imagem</span>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
            </div>

            {/* Effects */}
            <div className={`mb-6 transition-opacity ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-medium text-slate-300 mb-2">Efeito de Movimento</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'zoom', label: 'Zoom Lento', icon: <Video className="w-3 h-3" /> },
                        { id: 'pan', label: 'Panorâmica', icon: <Video className="w-3 h-3" /> },
                        { id: 'shake', label: 'Tremor / Ação', icon: <Zap className="w-3 h-3" /> },
                        { id: 'pulse', label: 'Pulsação', icon: <ActivityIcon className="w-3 h-3" /> }
                    ].map(eff => (
                        <button
                            key={eff.id}
                            onClick={() => setEffect(eff.id as MotionEffect)}
                            className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${effect === eff.id ? 'bg-pink-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                        >
                            {eff.icon} {eff.label}
                        </button>
                    ))}
                </div>
            </div>

            <Button 
                onClick={startRecording} 
                disabled={!image || isRecording}
                className="w-full py-3 bg-pink-600 hover:bg-pink-500"
                icon={isRecording ? <Square className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
            >
                {isRecording ? `A Gravar... ${progress}%` : 'Criar Vídeo (3s)'}
            </Button>
        </div>
      </div>

      {/* Preview / Result */}
      <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center relative min-h-[400px]">
          
          {/* Canvas (Hidden when result is shown, but always present for recording) */}
          <canvas 
            ref={canvasRef} 
            className={`max-w-full max-h-[60vh] object-contain shadow-2xl ${videoUrl ? 'hidden' : 'block'}`}
            style={{ display: !image ? 'none' : (videoUrl ? 'none' : 'block') }}
          />

          {/* Placeholder */}
          {!image && (
              <div className="text-center text-slate-600">
                  <Film className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Carregue uma imagem para começar</p>
              </div>
          )}

          {/* Video Result */}
          {videoUrl && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in-50">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Film className="w-5 h-5 text-pink-500" /> Vídeo Criado!</h3>
                  <video controls src={videoUrl} className="max-w-full max-h-[50vh] rounded-lg border border-slate-700 shadow-2xl mb-6" autoPlay loop />
                  
                  <div className="flex gap-4">
                      <Button onClick={() => setVideoUrl(null)} variant="secondary">Criar Outro</Button>
                      <a href={videoUrl} download={`nexus-motion-${Date.now()}.webm`}>
                          <Button icon={<Download className="w-4 h-4" />}>Descarregar Vídeo</Button>
                      </a>
                  </div>
              </div>
          )}

      </div>

    </div>
  );
};

// Helper Icon
const ActivityIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

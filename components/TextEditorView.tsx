
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { UploadCloud, X, Type, Download, AlignLeft, AlignCenter, AlignRight, Move, Stamp } from 'lucide-react';
import { Watermark, WatermarkSettings } from '../types';

type TextAlign = 'left' | 'center' | 'right';

interface Point {
  x: number;
  y: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextEditorViewProps {
  watermarkSettings: WatermarkSettings;
  activeWatermark: Watermark | undefined;
  onToggleWatermark: (enabled: boolean) => void;
}

export const TextEditorView: React.FC<TextEditorViewProps> = ({
  watermarkSettings,
  activeWatermark,
  onToggleWatermark
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null);
  
  const [text, setText] = useState('O seu texto aqui\nSegunda linha\nTerceira linha');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [color, setColor] = useState('#ffffff');
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  
  // Local Watermark Toggle
  const [localWatermarkEnabled, setLocalWatermarkEnabled] = useState(true);

  // Free positioning state
  const [textPos, setTextPos] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  
  const [showBackground, setShowBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Keep track of where the text is drawn for hit testing
  const textBoundingBox = useRef<BoundingBox>({ x: 0, y: 0, width: 0, height: 0 });

  // Load watermark image when it changes
  useEffect(() => {
    if (activeWatermark) {
      const img = new Image();
      img.onload = () => setWatermarkImage(img);
      img.src = activeWatermark.previewUrl;
    } else {
      setWatermarkImage(null);
    }
  }, [activeWatermark]);

  // Initialize canvas when image changes or window resizes
  useEffect(() => {
    drawCanvas();
  }, [image, text, fontSize, fontFamily, color, textAlign, textPos, showBackground, backgroundColor, watermarkImage, watermarkSettings, localWatermarkEnabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        
        const img = new Image();
        img.onload = () => {
          setImage(img);
          // Initialize text in center
          setTextPos({ x: img.width / 2, y: img.height / 2 });
        };
        img.src = resultStr;
      };
      
      reader.readAsDataURL(file);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image resolution
    canvas.width = image.width;
    canvas.height = image.height;

    // 1. Draw Base Image
    ctx.drawImage(image, 0, 0);

    // 2. Draw Watermark (if Global enabled AND Local enabled)
    const shouldDrawWatermark = watermarkSettings.isEnabled && localWatermarkEnabled && watermarkImage;

    if (shouldDrawWatermark) {
        // Calculate Watermark Size
        const scale = watermarkSettings.scale || 0.25; 
        const targetWidth = image.width * scale; 
        const aspectRatio = watermarkImage.width / watermarkImage.height;
        const targetHeight = targetWidth / aspectRatio;

        // Calculate Position
        let wx = 0;
        let wy = 0;
        const padding = image.width * 0.02; // 2% padding

        const pos = watermarkSettings.position;

        // Horizontal
        if (pos.includes('left')) wx = padding;
        else if (pos.includes('right')) wx = image.width - targetWidth - padding;
        else wx = (image.width - targetWidth) / 2;

        // Vertical
        if (pos.includes('top')) wy = padding;
        else if (pos.includes('bottom')) wy = image.height - targetHeight - padding;
        else wy = (image.height - targetHeight) / 2;

        // Draw
        ctx.globalAlpha = watermarkSettings.opacity / 100;
        ctx.drawImage(watermarkImage, wx, wy, targetWidth, targetHeight);
        ctx.globalAlpha = 1.0; // Reset
    }

    if (!text) return;

    // 3. Draw Text
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top'; 

    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    
    // Calculate widest line for bounding box
    let maxWidth = 0;
    lines.forEach(line => {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) maxWidth = metrics.width;
    });

    // Determine Drawing Origin
    let originX = textPos.x;
    let originY = textPos.y - (totalHeight / 2);

    if (textAlign === 'center') {
        originX = textPos.x - (maxWidth / 2);
    } else if (textAlign === 'right') {
        originX = textPos.x - maxWidth;
    }

    // Update Bounding Box Ref (for mouse hit detection)
    const padding = fontSize * 0.5;
    textBoundingBox.current = {
        x: originX - padding,
        y: originY - padding,
        width: maxWidth + (padding * 2),
        height: totalHeight + (padding * 2)
    };

    // Draw Background if enabled
    if (showBackground) {
        ctx.fillStyle = backgroundColor + '80'; // Hex + 50% opacity
        ctx.fillRect(
            textBoundingBox.current.x,
            textBoundingBox.current.y,
            textBoundingBox.current.width,
            textBoundingBox.current.height
        );
    }

    // Draw Text Lines
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    lines.forEach((line, index) => {
        const lineY = originY + (index * lineHeight);
        
        let lineX = textPos.x;
        
        if (textAlign === 'center') {
            ctx.textAlign = 'center';
            lineX = textPos.x; 
        } else if (textAlign === 'left') {
            ctx.textAlign = 'left';
            lineX = textPos.x;
        } else {
            ctx.textAlign = 'right';
            lineX = textPos.x;
        }

        ctx.fillText(line, lineX, lineY);
    });
    
    // Draw a subtle border if dragging
    if (isDragging) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            textBoundingBox.current.x,
            textBoundingBox.current.y,
            textBoundingBox.current.width,
            textBoundingBox.current.height
        );
    }
  };

  // --- MOUSE HANDLERS FOR DRAGGING ---

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    const mouse = getCanvasCoordinates(e);
    const box = textBoundingBox.current;

    // Check hit
    if (
        mouse.x >= box.x && 
        mouse.x <= box.x + box.width && 
        mouse.y >= box.y && 
        mouse.y <= box.y + box.height
    ) {
        setIsDragging(true);
        setDragOffset({
            x: mouse.x - textPos.x,
            y: mouse.y - textPos.y
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!image) return;
    const mouse = getCanvasCoordinates(e);

    const canvas = canvasRef.current;
    if (canvas) {
        const box = textBoundingBox.current;
        const isHover = mouse.x >= box.x && mouse.x <= box.x + box.width && mouse.y >= box.y && mouse.y <= box.y + box.height;
        canvas.style.cursor = isDragging ? 'grabbing' : (isHover ? 'grab' : 'default');
    }

    if (isDragging) {
        setTextPos({
            x: mouse.x - dragOffset.x,
            y: mouse.y - dragOffset.y
        });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
        // Use toBlob for robust large file handling
        canvas.toBlob((blob) => {
            if (!blob) {
                alert("Erro ao criar imagem. O Canvas pode estar corrompido.");
                return;
            }
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.download = `editor-texto-${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Add timeout to ensure download starts before revoking
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
            
        }, 'image/png');
    } catch (e) {
        console.error("Download error", e);
        alert("Erro ao descarregar. Verifique se as imagens utilizadas têm permissões corretas.");
    }
  };

  const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Impact', 'Georgia', 'Comic Sans MS', 'Brush Script MT'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Preview Area (Larger) */}
      <div className="lg:col-span-2 h-full flex flex-col">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex-1 relative flex items-center justify-center min-h-[400px]">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity p-8"
            >
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-2">
                <UploadCloud className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-200">Carregar Imagem para Editar</h3>
              <p className="text-slate-400">Clique para selecionar ficheiro</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-900/50 p-4 select-none">
              <canvas 
                ref={canvasRef} 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
              <button 
                onClick={() => {
                  setImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full hover:bg-red-500/80 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Hint Overlay */}
              <div className="absolute bottom-6 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none backdrop-blur-sm flex items-center gap-2">
                <Move className="w-3 h-3" /> Arraste o texto para posicionar
              </div>
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Control Panel (Side) */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-full overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Type className="w-5 h-5 text-emerald-400" />
          Painel de Controlo
        </h2>

        <div className={`space-y-6 ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Watermark Toggle */}
          <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                    <Stamp className={`w-4 h-4 ${localWatermarkEnabled && watermarkSettings.isEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-sm text-slate-300">Marca d'Água</span>
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

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Texto (Multilinha)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 resize-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Escreva aqui o seu poema ou legenda..."
            />
          </div>

          {/* Font & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fonte</label>
              <select 
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100"
              >
                {fonts.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tamanho (px)</label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cor do Texto</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 bg-transparent cursor-pointer rounded overflow-hidden"
              />
              <span className="text-slate-400 text-sm uppercase">{color}</span>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Alinhamento</label>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              {[
                { val: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                { val: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                { val: 'right', icon: <AlignRight className="w-4 h-4" /> }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setTextAlign(opt.val as TextAlign)}
                  className={`flex-1 p-2 rounded flex justify-center items-center transition-colors ${textAlign === opt.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Fundo de Texto</label>
              <input 
                type="checkbox" 
                checked={showBackground}
                onChange={(e) => setShowBackground(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
            </div>
            {showBackground && (
              <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-8 w-full bg-transparent cursor-pointer rounded overflow-hidden"
                />
              </div>
            )}
          </div>

          <Button 
            onClick={handleDownload}
            className="w-full mt-6"
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            disabled={!image}
          >
            Descarregar Resultado
          </Button>

        </div>
      </div>
    </div>
  );
};

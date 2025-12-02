import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Campaign, SubscriptionTier, CampaignType, TextFieldConfig } from '../types';
import { Download, Share2, RefreshCw, ZoomIn, FileText, Loader2, Image as ImageIcon, Type, Palette, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PhotoEditorProps {
  campaign: Campaign;
  onDownloadComplete: () => void;
}

// Fonts available for selection
const AVAILABLE_FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Roboto', 'Courier New'];

const PhotoEditor: React.FC<PhotoEditorProps> = ({ campaign, onDownloadComplete }) => {
  // Common State
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null); // For user photo in Frame Mode
  const [frameObj, setFrameObj] = useState<HTMLImageElement | null>(null); // For Background/Frame
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Editor State (Photo Frame Mode)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Editor State (Document Mode)
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  // New: Store style overrides for each field
  const [textStyles, setTextStyles] = useState<Record<string, Partial<TextFieldConfig>>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  // Animation State
  const [isLoadedAnimation, setIsLoadedAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize text values for Document Mode
  useEffect(() => {
    if (campaign.type === CampaignType.DOCUMENT && campaign.textFieldsConfig) {
      const initialValues: Record<string, string> = {};
      const initialStyles: Record<string, Partial<TextFieldConfig>> = {};
      
      campaign.textFieldsConfig.forEach(field => {
        initialValues[field.id] = field.defaultValue;
        // Initialize with default campaign config
        initialStyles[field.id] = {
          fontSize: field.fontSize,
          color: field.color,
          fontFamily: field.fontFamily
        };
      });
      setTextValues(initialValues);
      setTextStyles(initialStyles);
      // Set first field as active by default if exists
      if (campaign.textFieldsConfig.length > 0) {
        setActiveFieldId(campaign.textFieldsConfig[0].id);
      }
    }
  }, [campaign]);

  // Load Frame/Background Image
  useEffect(() => {
    const frame = new Image();
    frame.crossOrigin = "anonymous";
    frame.src = campaign.frameUrl;
    frame.onload = () => setFrameObj(frame);
  }, [campaign.frameUrl]);

  // Handle User File Upload (Only for Photo Frame Mode)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
        // Reset transform
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
        setIsLoading(false);
      };
      img.src = url;
    }
  };

  // Trigger animation when image is loaded (Frame Mode)
  useEffect(() => {
    if (imgObj) {
      setIsLoadedAnimation(true);
      const timer = setTimeout(() => setIsLoadedAnimation(false), 700);
      return () => clearTimeout(timer);
    }
  }, [imgObj]);

  // Draw Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use natural dimensions of the frame/background
    const CANVAS_WIDTH = frameObj.naturalWidth || 1080;
    const CANVAS_HEIGHT = frameObj.naturalHeight || 1080;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // MODE 1: PHOTO FRAME (User Image + Frame Overlay)
    if (campaign.type === CampaignType.PHOTO_FRAME) {
      // 1. Draw User Image (Transformed)
      if (imgObj) {
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2 + position.x, CANVAS_HEIGHT / 2 + position.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        
        const aspect = imgObj.width / imgObj.height;
        let drawWidth = CANVAS_WIDTH;
        let drawHeight = CANVAS_WIDTH;
        
        if (aspect > 1) {
          drawHeight = CANVAS_WIDTH / aspect;
        } else {
          drawWidth = CANVAS_WIDTH * aspect;
        }

        ctx.drawImage(imgObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ajoutez une photo', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // 2. Draw Frame Overlay
      ctx.drawImage(frameObj, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } 
    
    // MODE 2: DOCUMENT (Background + Text Fields)
    else if (campaign.type === CampaignType.DOCUMENT) {
      // 1. Draw Background
      ctx.drawImage(frameObj, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Draw Text Fields
      if (campaign.textFieldsConfig) {
        campaign.textFieldsConfig.forEach(field => {
          const text = textValues[field.id] || '';
          const styles = textStyles[field.id] || {};
          
          // Merge campaign defaults with user overrides
          const fontSize = styles.fontSize || field.fontSize;
          const fontFamily = styles.fontFamily || field.fontFamily;
          const color = styles.color || field.color;
          
          ctx.save();
          ctx.font = `${fontSize}px ${fontFamily}, sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = field.align;
          ctx.textBaseline = 'middle';
          
          // Calculate pixel position from percentage
          const x = (field.x / 100) * CANVAS_WIDTH;
          const y = (field.y / 100) * CANVAS_HEIGHT;
          
          ctx.fillText(text, x, y);

          // Draw selection box if active
          if (activeFieldId === field.id) {
             const metrics = ctx.measureText(text);
             const height = fontSize; // approx
             const width = metrics.width;
             
             ctx.strokeStyle = '#3b82f6';
             ctx.lineWidth = 2;
             ctx.setLineDash([5, 5]);
             
             let rectX = x;
             if (field.align === 'center') rectX = x - width / 2;
             if (field.align === 'right') rectX = x - width;
             
             // Draw a subtle box around the text to show it's active
             ctx.strokeRect(rectX - 10, y - height/2 - 5, width + 20, height + 10);
          }

          ctx.restore();
        });
      }
    }

    // 3. Watermark (if Free Tier)
    if (campaign.creatorTier === SubscriptionTier.FREE) {
      ctx.save();
      ctx.font = `20px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'right';
      ctx.fillText('Créé avec FrameFlow', CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
      ctx.restore();
    }

  }, [frameObj, imgObj, scale, rotation, position, campaign, textValues, textStyles, activeFieldId]);

  useEffect(() => {
    draw();
  }, [draw]);

  // --- Handlers ---

  // Dragging (Only for Photo Frame Mode)
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (campaign.type === CampaignType.DOCUMENT || isLoading) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || isLoading) return;
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handlePointerUp = () => setIsDragging(false);

  // Text Input Change (Document Mode)
  const handleTextChange = (id: string, value: string) => {
    setTextValues(prev => ({ ...prev, [id]: value }));
  };

  // Text Style Change (Document Mode)
  const handleStyleChange = (id: string, property: keyof TextFieldConfig, value: any) => {
    setTextStyles(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [property]: value
      }
    }));
  };

  // Downloads
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Temporarily clear active selection box before download
    setActiveFieldId(null);
    setTimeout(() => {
       const link = document.createElement('a');
       link.download = `document-${campaign.id}.png`;
       link.href = canvas.toDataURL('image/png', 1.0);
       link.click();
       onDownloadComplete();
    }, 50);
  };

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);
    setActiveFieldId(null);

    // Give time for canvas to redraw without selection box
    setTimeout(() => {
        try {
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          
          // Determine orientation based on aspect ratio
          const orientation = imgWidth > imgHeight ? 'l' : 'p';
          const doc = new jsPDF(orientation, 'px', [imgWidth, imgHeight]);
          
          doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
          doc.save(`document-${campaign.id}.pdf`);
          onDownloadComplete();
        } catch (e) {
          console.error("PDF generation failed", e);
          alert("Erreur lors de la génération PDF");
        } finally {
          setIsDownloading(false);
        }
    }, 50);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto">
      
      {/* LEFT: Inputs & Controls */}
      <div className="w-full lg:w-1/3 space-y-6 order-2 lg:order-1">
        
        {/* PHOTO FRAME MODE: Upload & Sliders */}
        {campaign.type === CampaignType.PHOTO_FRAME && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <ImageIcon size={20} className="text-blue-600"/> Votre Photo
             </h3>
             
             {!imgObj ? (
                <label className="cursor-pointer block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                   {isLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500"/></div>}
                   <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">+</span>
                   </div>
                   <span className="text-sm font-semibold text-slate-600">Choisir une image</span>
                   <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isLoading} />
                </label>
             ) : (
               <div className="space-y-4 relative">
                  {isLoading && <div className="absolute inset-0 bg-white/50 z-10 cursor-not-allowed"></div>}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Zoom</span> <span>{Math.round(scale * 100)}%</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Rotation</span> <span>{rotation}°</span>
                    </div>
                    <input type="range" min="-180" max="180" step="5" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <label className="block w-full text-center py-2 text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 rounded-lg transition-colors">
                     Changer la photo
                     <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
               </div>
             )}
          </div>
        )}

        {/* DOCUMENT MODE: Form Fields with Style Controls */}
        {campaign.type === CampaignType.DOCUMENT && campaign.textFieldsConfig && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-fade-in overflow-hidden">
             <div className="p-4 bg-slate-50 border-b border-slate-200">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <FileText size={20} className="text-blue-600"/> Personnalisation
               </h3>
             </div>
             
             <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
                {campaign.textFieldsConfig.map(field => {
                   const isActive = activeFieldId === field.id;
                   const styles = textStyles[field.id] || {};
                   const fontSize = styles.fontSize || field.fontSize;
                   const color = styles.color || field.color;
                   const fontFamily = styles.fontFamily || field.fontFamily;

                   return (
                     <div 
                        key={field.id} 
                        className={`transition-all rounded-lg border ${isActive ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                        onClick={() => setActiveFieldId(field.id)}
                     >
                        <div className="p-3">
                           <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{field.label}</label>
                           <input 
                              type="text" 
                              value={textValues[field.id] || ''} 
                              onChange={(e) => handleTextChange(field.id, e.target.value)}
                              onFocus={() => setActiveFieldId(field.id)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-medium bg-white"
                              placeholder={field.defaultValue}
                           />
                        </div>

                        {/* Collapsible Style Controls */}
                        {isActive && (
                           <div className="px-3 pb-3 pt-0 border-t border-blue-100 mt-1 animate-fade-in">
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                 <div>
                                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1">
                                       <Palette size={10} /> COULEUR
                                    </label>
                                    <div className="flex items-center gap-2 bg-white rounded border border-slate-200 p-1">
                                       <input 
                                          type="color" 
                                          value={color}
                                          onChange={(e) => handleStyleChange(field.id, 'color', e.target.value)}
                                          className="w-6 h-6 rounded cursor-pointer border-none p-0"
                                       />
                                       <span className="text-xs font-mono text-slate-600">{color}</span>
                                    </div>
                                 </div>
                                 <div>
                                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1">
                                       <Type size={10} /> TAILLE
                                    </label>
                                    <div className="flex items-center gap-2">
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); handleStyleChange(field.id, 'fontSize', Math.max(10, fontSize - 2)); }}
                                          className="w-6 h-8 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                                       >
                                          -
                                       </button>
                                       <span className="flex-1 text-center text-xs font-bold">{fontSize}px</span>
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); handleStyleChange(field.id, 'fontSize', Math.min(200, fontSize + 2)); }}
                                          className="w-6 h-8 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                                       >
                                          +
                                       </button>
                                    </div>
                                 </div>
                              </div>
                              <div className="mt-2">
                                 <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1">
                                    <Settings2 size={10} /> POLICE
                                 </label>
                                 <select 
                                    value={fontFamily}
                                    onChange={(e) => handleStyleChange(field.id, 'fontFamily', e.target.value)}
                                    className="w-full text-xs p-2 border border-slate-200 rounded bg-white outline-none focus:border-blue-500"
                                 >
                                    {AVAILABLE_FONTS.map(f => (
                                       <option key={f} value={f}>{f}</option>
                                    ))}
                                 </select>
                              </div>
                           </div>
                        )}
                     </div>
                   );
                })}
             </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
           <button 
              onClick={handleDownloadImage}
              disabled={isLoading || (!imgObj && campaign.type === CampaignType.PHOTO_FRAME)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Download size={20} /> Télécharger Image (PNG)
           </button>
           
           {campaign.type === CampaignType.DOCUMENT && (
             <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-70"
             >
               {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />} 
               Télécharger PDF
             </button>
           )}
        </div>

      </div>

      {/* RIGHT: Canvas Preview */}
      <div className="w-full lg:w-2/3 order-1 lg:order-2">
         <div 
           ref={containerRef}
           className={`relative w-full rounded-lg overflow-hidden bg-slate-200 shadow-md transition-all duration-500 ${
             isLoadedAnimation ? 'scale-[1.02] shadow-xl ring-4 ring-blue-100' : ''
           }`}
           onMouseDown={handlePointerDown}
           onMouseMove={handlePointerMove}
           onMouseUp={handlePointerUp}
           onMouseLeave={handlePointerUp}
           onTouchStart={handlePointerDown}
           onTouchMove={handlePointerMove}
           onTouchEnd={handlePointerUp}
         >
           {/* Visual Loading State */}
           {isLoading && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center transition-opacity duration-300">
                <div className="bg-white p-4 rounded-full shadow-lg">
                   <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
             </div>
           )}

           <canvas 
             ref={canvasRef} 
             className="w-full h-auto block touch-none"
             style={{ maxHeight: '80vh', objectFit: 'contain' }}
           />
           
           {/* Floating hint for Frame Mode */}
           {campaign.type === CampaignType.PHOTO_FRAME && imgObj && !isLoading && (
             <div className={`absolute top-4 left-0 right-0 text-center pointer-events-none transition-opacity duration-500 ${isLoadedAnimation ? 'opacity-0' : 'opacity-100'}`}>
                <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm shadow-sm">
                  Glissez pour ajuster la photo
                </span>
             </div>
           )}
         </div>
      </div>

    </div>
  );
};

export default PhotoEditor;
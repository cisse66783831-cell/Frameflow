
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Campaign, SubscriptionTier, CampaignType, TextFieldConfig } from '../types';
import { Download, Share2, Loader2, Image as ImageIcon, FileText, Layers, ChevronLeft, ChevronRight, Archive, X, Check, Copy, Facebook, Linkedin, Twitter, Move } from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { GOOGLE_FONTS, loadFont } from '../utils/fonts';

interface PhotoEditorProps {
  campaign: Campaign;
  onDownloadComplete: () => void;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({ campaign, onDownloadComplete }) => {
  // Common State
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null); // For user photo in Frame Mode
  const [frameObj, setFrameObj] = useState<HTMLImageElement | null>(null); // For Background/Frame
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0); // 0 to 100
  
  // Share State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Editor State (Photo Frame Mode)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Editor State (Document Mode - User Overrides)
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [textStyles, setTextStyles] = useState<Record<string, Partial<TextFieldConfig>>>({});
  // Stores user-dragged positions (delta from original)
  const [textPosOverrides, setTextPosOverrides] = useState<Record<string, {x: number, y: number}>>({});
  
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  // Dragging Logic Generic
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<'image' | string>('image'); // 'image' or fieldId

  // BULK GENERATION STATE
  const [editorMode, setEditorMode] = useState<'single' | 'bulk'>('single');
  const [bulkList, setBulkList] = useState<string>('');
  const [bulkNames, setBulkNames] = useState<string[]>([]);
  const [bulkTargetFieldId, setBulkTargetFieldId] = useState<string>('');
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);

  // Animation State
  const [isLoadedAnimation, setIsLoadedAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Force redraw state for fonts
  const [fontLoadCounter, setFontLoadCounter] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize text values for Document Mode
  useEffect(() => {
    if (campaign.type === CampaignType.DOCUMENT && campaign.textFieldsConfig) {
      const initialValues: Record<string, string> = {};
      const initialStyles: Record<string, Partial<TextFieldConfig>> = {};
      
      campaign.textFieldsConfig.forEach((field, index) => {
        initialValues[field.id] = field.defaultValue;
        initialStyles[field.id] = {
          fontSize: field.fontSize,
          color: field.color,
          fontFamily: field.fontFamily
        };
        loadFont(field.fontFamily);
        
        // Default bulk target to first field
        if (index === 0) setBulkTargetFieldId(field.id);
      });
      setTextValues(initialValues);
      setTextStyles(initialStyles);
      if (campaign.textFieldsConfig.length > 0) {
        setActiveFieldId(campaign.textFieldsConfig[0].id);
      }
    }
  }, [campaign]);

  // Handle Dynamic Font Loading for Custom Styles
  useEffect(() => {
    if (campaign.type === CampaignType.DOCUMENT) {
      const activeFonts = new Set<string>();
      (Object.values(textStyles) as Partial<TextFieldConfig>[]).forEach(style => {
        if (style.fontFamily) activeFonts.add(style.fontFamily);
      });
      activeFonts.forEach(font => {
        loadFont(font);
        document.fonts.load(`16px "${font}"`).then(() => {
          setFontLoadCounter(c => c + 1);
        });
      });
    }
  }, [textStyles, campaign.type]);

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

  // --- DRAW FUNCTION ---
  const draw = useCallback((overrideValues?: Record<string, string>) => {
    const canvas = canvasRef.current;
    if (!canvas || !frameObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use natural dimensions
    const CANVAS_WIDTH = frameObj.naturalWidth || 1080;
    const CANVAS_HEIGHT = frameObj.naturalHeight || 1080;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // MODE 1: PHOTO FRAME
    if (campaign.type === CampaignType.PHOTO_FRAME) {
      if (imgObj) {
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2 + position.x, CANVAS_HEIGHT / 2 + position.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        
        const aspect = imgObj.width / imgObj.height;
        let drawWidth = CANVAS_WIDTH;
        let drawHeight = CANVAS_WIDTH;
        
        if (aspect > 1) drawHeight = CANVAS_WIDTH / aspect;
        else drawWidth = CANVAS_WIDTH * aspect;

        ctx.drawImage(imgObj, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ajoutez une photo', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }
      ctx.drawImage(frameObj, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } 
    
    // MODE 2: DOCUMENT
    else if (campaign.type === CampaignType.DOCUMENT) {
      ctx.drawImage(frameObj, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (campaign.textFieldsConfig) {
        campaign.textFieldsConfig.forEach(field => {
          // Use override value (for bulk) or state value (for editor)
          const text = overrideValues ? (overrideValues[field.id] || '') : (textValues[field.id] || '');
          const styles = textStyles[field.id] || {};
          
          const fontSize = styles.fontSize || field.fontSize;
          const fontFamily = styles.fontFamily || field.fontFamily;
          const color = styles.color || field.color;
          
          ctx.save();
          ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = field.align;
          ctx.textBaseline = 'middle';
          
          // Calculate final position (Original + User Override)
          const originalX = (field.x / 100) * CANVAS_WIDTH;
          const originalY = (field.y / 100) * CANVAS_HEIGHT;
          const override = textPosOverrides[field.id] || { x: 0, y: 0 };
          
          const x = originalX + override.x;
          const y = originalY + override.y;
          
          ctx.fillText(text, x, y);

          // Selection Box (Only in Single Mode and active)
          if (!overrideValues && activeFieldId === field.id) {
             const metrics = ctx.measureText(text);
             const height = fontSize;
             const width = metrics.width;
             
             ctx.strokeStyle = '#3b82f6';
             ctx.lineWidth = 3;
             ctx.setLineDash([6, 4]);
             
             let rectX = x;
             if (field.align === 'center') rectX = x - width / 2;
             if (field.align === 'right') rectX = x - width;
             
             // Draw box with a bit of padding
             ctx.strokeRect(rectX - 10, y - height/2 - 5, width + 20, height + 10);
             
             // Draw Move Handle
             ctx.fillStyle = '#3b82f6';
             ctx.fillRect(rectX + width + 10 - 10, y - height/2 - 25, 20, 20);
             // Simple visual indicator inside handle
             ctx.fillStyle = 'white';
             ctx.beginPath();
             ctx.arc(rectX + width + 10, y - height/2 - 15, 3, 0, Math.PI * 2);
             ctx.fill();
          }
          ctx.restore();
        });
      }
    }

    // Watermark
    if (campaign.creatorTier === SubscriptionTier.FREE) {
      ctx.save();
      ctx.font = `20px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'right';
      ctx.fillText('Créé avec FrameFlow', CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
      ctx.restore();
    }

  }, [frameObj, imgObj, scale, rotation, position, campaign, textValues, textStyles, activeFieldId, fontLoadCounter, textPosOverrides]);

  // Main Draw Effect
  useEffect(() => {
    if (editorMode === 'single') {
       draw();
    } else if (editorMode === 'bulk' && bulkNames.length > 0) {
       // In bulk mode preview, draw the current selected name
       const previewValues = { ...textValues, [bulkTargetFieldId]: bulkNames[currentBulkIndex] };
       draw(previewValues);
    }
  }, [draw, editorMode, bulkNames, currentBulkIndex, bulkTargetFieldId]);

  // --- INTERACTION HANDLERS (DRAG & DROP) ---

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Scale coordinates to canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      clientX,
      clientY
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLoading) return;
    
    const coords = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');

    // MODE DOCUMENT : CHECK FOR TEXT HIT
    if (campaign.type === CampaignType.DOCUMENT && campaign.textFieldsConfig && ctx && canvasRef.current) {
      let hitFound = false;
      
      // Iterate in reverse to catch top-most elements first
      for (let i = campaign.textFieldsConfig.length - 1; i >= 0; i--) {
        const field = campaign.textFieldsConfig[i];
        const text = textValues[field.id] || '';
        const styles = textStyles[field.id] || {};
        
        ctx.font = `${styles.fontSize || field.fontSize}px "${styles.fontFamily || field.fontFamily}", sans-serif`;
        const metrics = ctx.measureText(text);
        
        const originalX = (field.x / 100) * canvasRef.current.width;
        const originalY = (field.y / 100) * canvasRef.current.height;
        const override = textPosOverrides[field.id] || { x: 0, y: 0 };
        
        const x = originalX + override.x;
        const y = originalY + override.y;
        
        const height = (styles.fontSize || field.fontSize);
        const width = metrics.width;

        let rectX = x;
        if (field.align === 'center') rectX = x - width / 2;
        if (field.align === 'right') rectX = x - width;

        // Hit box padding
        const pad = 20;
        if (
          coords.x >= rectX - pad && 
          coords.x <= rectX + width + pad && 
          coords.y >= y - height/2 - pad && 
          coords.y <= y + height/2 + pad
        ) {
          setActiveFieldId(field.id);
          setIsDragging(true);
          setDragTarget(field.id);
          setDragStart({ x: coords.clientX, y: coords.clientY });
          hitFound = true;
          break;
        }
      }

      // If clicked empty space, deselect
      if (!hitFound) {
        setActiveFieldId(null);
      }
      return;
    }

    // MODE PHOTO : DRAG IMAGE
    if (campaign.type === CampaignType.PHOTO_FRAME) {
      setIsDragging(true);
      setDragTarget('image');
      setDragStart({ x: coords.clientX - position.x, y: coords.clientY - position.y });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); 

    // MODE PHOTO MOVE
    if (campaign.type === CampaignType.PHOTO_FRAME && dragTarget === 'image') {
       const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
       const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
       setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    } 
    // MODE DOCUMENT TEXT MOVE
    else if (campaign.type === CampaignType.DOCUMENT && dragTarget !== 'image') {
       const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
       const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
       
       const canvas = canvasRef.current;
       if (!canvas) return;
       const rect = canvas.getBoundingClientRect();
       const scaleX = canvas.width / rect.width;
       const scaleY = canvas.height / rect.height;

       const deltaX = (clientX - dragStart.x) * scaleX;
       const deltaY = (clientY - dragStart.y) * scaleY;

       // Store cumulative delta
       setTextPosOverrides(prev => {
         const current = prev[dragTarget] || { x: 0, y: 0 };
         return {
           ...prev,
           [dragTarget]: { x: current.x + deltaX, y: current.y + deltaY }
         };
       });

       // Reset drag start to current to keep calculating relative delta
       setDragStart({ x: clientX, y: clientY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragTarget('image');
  };

  const handleTextChange = (id: string, value: string) => {
    setTextValues(prev => ({ ...prev, [id]: value }));
  };

  const handleStyleChange = (id: string, property: keyof TextFieldConfig, value: any) => {
    setTextStyles(prev => ({
      ...prev,
      [id]: { ...prev[id], [property]: value }
    }));
  };

  const handleBulkListChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setBulkList(e.target.value);
     const names = e.target.value.split('\n').filter(n => n.trim() !== '');
     setBulkNames(names);
     setCurrentBulkIndex(0);
  };

  // --- DOWNLOADS ---

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setActiveFieldId(null);
    // Use timeout to allow redraw without selection box
    setTimeout(() => {
       draw(); // Force draw without selection
       setTimeout(() => {
          const link = document.createElement('a');
          link.download = `document-${campaign.id}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
          onDownloadComplete();
          // Restore selection if needed, or leave it cleared
       }, 50);
    }, 10);
  };

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);
    setActiveFieldId(null);
    setTimeout(() => {
        draw(); // Force draw without selection
        setTimeout(() => {
          try {
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const doc = new jsPDF(canvas.width > canvas.height ? 'l' : 'p', 'px', [canvas.width, canvas.height]);
            doc.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            doc.save(`document-${campaign.id}.pdf`);
            onDownloadComplete();
          } catch (e) {
            console.error(e);
            alert("Erreur PDF");
          } finally {
            setIsDownloading(false);
          }
        }, 50);
    }, 10);
  };

  const handleBulkZipDownload = async () => {
     if (bulkNames.length === 0) return;
     const canvas = canvasRef.current;
     if (!canvas) return;

     setIsDownloading(true);
     setDownloadProgress(0);
     const zip = new JSZip();

     try {
        for (let i = 0; i < bulkNames.length; i++) {
           const name = bulkNames[i];
           // 1. Draw specific name
           const overrides = { ...textValues, [bulkTargetFieldId]: name };
           draw(overrides);
           
           // 2. Wait a tick for render
           await new Promise(r => setTimeout(r, 20));

           // 3. Get Blob
           const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
           if (blob) {
              // Sanitize filename
              const safeName = name.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
              zip.file(`${safeName}.png`, blob);
           }
           
           // Update Progress
           setDownloadProgress(Math.round(((i + 1) / bulkNames.length) * 100));
        }

        // 4. Generate Zip
        const content = await zip.generateAsync({ type: "blob" });
        FileSaver.saveAs(content, `${campaign.title.replace(/\s+/g, '_')}_batch.zip`);
        onDownloadComplete();

     } catch (e) {
        console.error("Bulk error", e);
        alert("Erreur lors de la génération par lot.");
     } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
        // Reset to preview
        draw({ ...textValues, [bulkTargetFieldId]: bulkNames[currentBulkIndex] });
     }
  };

  // --- SHARE ---
  
  const socialShareUrl = (platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Rejoignez la campagne "${campaign.title}" sur FrameFlow !`);
    
    switch (platform) {
      case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      case 'twitter': return `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
      case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      case 'whatsapp': return `https://wa.me/?text=${text}%20${url}`;
      default: return '';
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
       try {
         const canvas = canvasRef.current;
         if (canvas && campaign.type === CampaignType.PHOTO_FRAME && imgObj) {
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
               const file = new File([blob], 'campagne.png', { type: 'image/png' });
               await navigator.share({
                  title: campaign.title,
                  text: campaign.description,
                  url: window.location.href,
                  files: [file]
               });
               setIsSharing(true);
               return;
            }
         }
         await navigator.share({
            title: campaign.title,
            text: campaign.description,
            url: window.location.href
         });
       } catch (e) {
         console.log("Share dismissed", e);
       }
    } else {
       setIsShareModalOpen(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
      
      {/* LEFT: Inputs & Controls */}
      <div className="w-full lg:w-1/3 space-y-6 order-2 lg:order-1">
        
        {/* DOCUMENT MODE CONTROLS */}
        {campaign.type === CampaignType.DOCUMENT && campaign.textFieldsConfig && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-fade-in overflow-hidden">
             
             {/* MODE SWITCHER */}
             <div className="flex border-b border-slate-200">
                <button 
                  onClick={() => setEditorMode('single')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${editorMode === 'single' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                   <FileText size={16}/> Unique
                </button>
                <button 
                  onClick={() => setEditorMode('bulk')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${editorMode === 'bulk' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                   <Layers size={16}/> Par Lot
                </button>
             </div>

             {/* SINGLE MODE */}
             {editorMode === 'single' && (
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-slate-800 font-medium bg-white"
                                placeholder={field.defaultValue}
                             />
                          </div>

                          {isActive && (
                             <div className="px-3 pb-3 pt-0 border-t border-blue-100 mt-1">
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                   <div className="flex items-center gap-2 bg-white rounded border border-slate-200 p-1">
                                      <input 
                                         type="color" 
                                         value={color}
                                         onChange={(e) => handleStyleChange(field.id, 'color', e.target.value)}
                                         className="w-6 h-6 rounded cursor-pointer border-none p-0"
                                      />
                                      <span className="text-xs font-mono text-slate-600">{color}</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <button onClick={(e) => { e.stopPropagation(); handleStyleChange(field.id, 'fontSize', Math.max(10, fontSize - 2)); }} className="w-8 h-8 bg-white border border-slate-200 rounded">-</button>
                                      <span className="text-xs font-bold">{fontSize}</span>
                                      <button onClick={(e) => { e.stopPropagation(); handleStyleChange(field.id, 'fontSize', Math.min(200, fontSize + 2)); }} className="w-8 h-8 bg-white border border-slate-200 rounded">+</button>
                                   </div>
                                </div>
                                <div className="mt-2">
                                   <select 
                                      value={fontFamily}
                                      onChange={(e) => handleStyleChange(field.id, 'fontFamily', e.target.value)}
                                      className="w-full text-xs p-2 border border-slate-200 rounded bg-white outline-none"
                                      style={{ fontFamily }}
                                   >
                                      {GOOGLE_FONTS.map(f => (
                                         <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                                      ))}
                                   </select>
                                </div>
                             </div>
                          )}
                       </div>
                     );
                  })}
               </div>
             )}

             {/* BULK MODE */}
             {editorMode === 'bulk' && (
               <div className="p-4 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Champ à remplir dynamiquement</label>
                     <select 
                        value={bulkTargetFieldId}
                        onChange={(e) => setBulkTargetFieldId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                     >
                        {campaign.textFieldsConfig.map(f => (
                           <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                     </select>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Liste des noms (Un par ligne)</label>
                     <textarea
                        value={bulkList}
                        onChange={handleBulkListChange}
                        rows={6}
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Jean Dupont&#10;Marie Curie&#10;Albert Einstein..."
                     />
                     <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-400">{bulkNames.length} éléments détectés</span>
                        <button 
                           onClick={() => setBulkList('')} 
                           className="text-xs text-red-500 hover:text-red-700"
                        >
                           Effacer tout
                        </button>
                     </div>
                  </div>

                  {bulkNames.length > 0 && (
                     <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center justify-between">
                        <button 
                           disabled={currentBulkIndex === 0}
                           onClick={() => setCurrentBulkIndex(c => c - 1)}
                           className="p-1 hover:bg-white rounded disabled:opacity-30"
                        >
                           <ChevronLeft size={18}/>
                        </button>
                        <span className="text-xs font-bold text-purple-700">
                           Prévisualisation: {currentBulkIndex + 1} / {bulkNames.length}
                        </span>
                        <button 
                           disabled={currentBulkIndex === bulkNames.length - 1}
                           onClick={() => setCurrentBulkIndex(c => c + 1)}
                           className="p-1 hover:bg-white rounded disabled:opacity-30"
                        >
                           <ChevronRight size={18}/>
                        </button>
                     </div>
                  )}
               </div>
             )}
           </div>
        )}

        {/* PHOTO FRAME INPUTS */}
        {campaign.type === CampaignType.PHOTO_FRAME && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ImageIcon size={20} className="text-blue-600"/> Votre Photo</h3>
             {!imgObj ? (
                <label className="cursor-pointer block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                   {isLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-500"/></div>}
                   <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-2xl">+</span></div>
                   <span className="text-sm font-semibold text-slate-600">Choisir une image</span>
                   <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isLoading} />
                </label>
             ) : (
               <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500"><span>Zoom</span> <span>{Math.round(scale * 100)}%</span></div>
                    <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500"><span>Rotation</span> <span>{rotation}°</span></div>
                    <input type="range" min="-180" max="180" step="5" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <label className="block w-full text-center py-2 text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50 rounded-lg transition-colors">Changer la photo <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" /></label>
               </div>
             )}
           </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col gap-3">
           
           {/* SINGLE ACTIONS */}
           {editorMode === 'single' && (
             <>
               <div className="flex gap-3">
                  <button 
                     onClick={handleDownloadImage}
                     disabled={isLoading || (!imgObj && campaign.type === CampaignType.PHOTO_FRAME)}
                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                     <Download size={20} /> Image
                  </button>
                  {campaign.type === CampaignType.DOCUMENT && (
                    <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50">
                       {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />} PDF
                    </button>
                  )}
               </div>
               
               {campaign.type === CampaignType.PHOTO_FRAME && imgObj && (
                  <button 
                     onClick={handleShare}
                     className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                     <Share2 size={20} /> Partager le résultat
                  </button>
               )}
             </>
           )}

           {/* BULK ACTIONS */}
           {editorMode === 'bulk' && (
              <button 
                 onClick={handleBulkZipDownload}
                 disabled={isDownloading || bulkNames.length === 0}
                 className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                 {isDownloading ? <Loader2 className="animate-spin" size={24} /> : <Archive size={24} />}
                 {isDownloading ? `Génération ${downloadProgress}%` : `Télécharger le ZIP (${bulkNames.length})`}
              </button>
           )}
        </div>
      </div>

      {/* RIGHT: Canvas Preview */}
      <div className="w-full lg:w-2/3 order-1 lg:order-2">
         <div 
           ref={containerRef}
           className={`relative w-full rounded-lg overflow-hidden bg-slate-200 shadow-md transition-all duration-500 cursor-auto ${isLoadedAnimation ? 'scale-[1.02] shadow-xl ring-4 ring-blue-100' : ''}`}
           // Attach handlers for drag logic
           onMouseDown={handlePointerDown}
           onMouseMove={handlePointerMove}
           onMouseUp={handlePointerUp}
           onMouseLeave={handlePointerUp}
           onTouchStart={handlePointerDown}
           onTouchMove={handlePointerMove}
           onTouchEnd={handlePointerUp}
         >
           {isLoading && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center transition-opacity duration-300">
                <div className="bg-white p-4 rounded-full shadow-lg"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
             </div>
           )}

           <canvas ref={canvasRef} className="w-full h-auto block touch-none" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
           
           {/* Overlays */}
           {campaign.type === CampaignType.PHOTO_FRAME && imgObj && !isLoading && (
             <div className={`absolute top-4 left-0 right-0 text-center pointer-events-none transition-opacity duration-500 ${isLoadedAnimation ? 'opacity-0' : 'opacity-100'}`}>
                <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm shadow-sm">Glissez pour ajuster la photo</span>
             </div>
           )}

            {campaign.type === CampaignType.DOCUMENT && !isLoading && (
             <div className={`absolute top-4 left-0 right-0 text-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity`}>
                <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm shadow-sm flex items-center justify-center gap-1 w-fit mx-auto"><Move size={12}/> Déplacez les textes si nécessaire</span>
             </div>
           )}
         </div>
         
         {editorMode === 'bulk' && bulkNames.length > 0 && (
            <div className="mt-4 text-center text-slate-500 text-sm">
               Prévisualisation de : <strong>{bulkNames[currentBulkIndex]}</strong>
            </div>
         )}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
              <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                 <X size={24} />
              </button>
              <div className="text-center mb-6">
                 <h3 className="text-xl font-bold text-slate-900">Partager cette campagne</h3>
                 <p className="text-sm text-slate-500 mt-1">Invitez vos amis à utiliser ce cadre !</p>
              </div>

              <div className="flex justify-center gap-4 mb-8">
                 <a href={socialShareUrl('facebook')} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"><Facebook size={24}/></a>
                 <a href={socialShareUrl('twitter')} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center hover:bg-sky-600 transition-colors"><Twitter size={24}/></a>
                 <a href={socialShareUrl('whatsapp')} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"><Share2 size={24}/></a>
                 <a href={socialShareUrl('linkedin')} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-blue-800 text-white rounded-full flex items-center justify-center hover:bg-blue-900 transition-colors"><Linkedin size={24}/></a>
              </div>

              <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between gap-2 border border-slate-200">
                 <span className="text-sm text-slate-500 truncate">{window.location.href}</span>
                 <button onClick={copyToClipboard} className="text-blue-600 font-bold text-sm hover:underline shrink-0">
                    {copiedLink ? <span className="flex items-center gap-1 text-green-600"><Check size={16}/> Copié</span> : <span className="flex items-center gap-1"><Copy size={16}/> Copier</span>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PhotoEditor;

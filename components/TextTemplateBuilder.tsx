
import React, { useState, useRef, useEffect } from 'react';
import { TextFieldConfig } from '../types';
import { Type, Move, Trash2, Plus, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { GOOGLE_FONTS, loadFont } from '../utils/fonts';

interface TextTemplateBuilderProps {
  frameUrl: string;
  onConfigChange: (config: TextFieldConfig[]) => void;
}

const TextTemplateBuilder: React.FC<TextTemplateBuilderProps> = ({ frameUrl, onConfigChange }) => {
  const [fields, setFields] = useState<TextFieldConfig[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load fonts for existing fields on mount
  useEffect(() => {
    fields.forEach(field => {
      loadFont(field.fontFamily);
    });
  }, [fields]);

  // Add a new field
  const addField = () => {
    const newField: TextFieldConfig = {
      id: `field_${Date.now()}`,
      label: 'Nouveau Champ',
      defaultValue: 'Texte ici',
      x: 50, // Center X (%)
      y: 50, // Center Y (%)
      fontFamily: 'Inter',
      fontSize: 40,
      color: '#000000',
      align: 'center'
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    setSelectedFieldId(newField.id);
    onConfigChange(newFields);
    loadFont(newField.fontFamily);
  };

  // Update a specific field
  const updateField = (id: string, updates: Partial<TextFieldConfig>) => {
    // If font is changing, load it immediately
    if (updates.fontFamily) {
      loadFont(updates.fontFamily);
    }
    const newFields = fields.map(f => f.id === id ? { ...f, ...updates } : f);
    setFields(newFields);
    onConfigChange(newFields);
  };

  // Remove a field
  const removeField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    if (selectedFieldId === id) setSelectedFieldId(null);
    onConfigChange(newFields);
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, field: TextFieldConfig) => {
    e.stopPropagation();
    setSelectedFieldId(field.id);
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    // Calculate mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Convert field % to px
    const fieldX = (field.x / 100) * containerRect.width;
    const fieldY = (field.y / 100) * containerRect.height;

    setIsDragging(true);
    setDragOffset({
      x: mouseX - fieldX,
      y: mouseY - fieldY
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedFieldId || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Calculate new position
    let newXPx = mouseX - dragOffset.x;
    let newYPx = mouseY - dragOffset.y;

    // Constrain to bounds
    newXPx = Math.max(0, Math.min(newXPx, containerRect.width));
    newYPx = Math.max(0, Math.min(newYPx, containerRect.height));

    // Convert back to %
    const newX = (newXPx / containerRect.width) * 100;
    const newY = (newYPx / containerRect.height) * 100;

    updateField(selectedFieldId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: Preview & Editor Area */}
      <div className="lg:col-span-2 bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-h-[500px]">
         <div 
            className="relative bg-white shadow-lg select-none overflow-hidden"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ maxWidth: '100%' }}
         >
            <img 
               src={frameUrl} 
               alt="Template Background" 
               className="max-w-full max-h-[600px] w-auto h-auto block object-contain pointer-events-none"
            />
            
            {/* Render Overlay Fields */}
            {fields.map(field => (
               <div
                  key={field.id}
                  onMouseDown={(e) => handleMouseDown(e, field)}
                  className={`absolute cursor-move px-2 py-1 border-2 transition-colors ${selectedFieldId === field.id ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:border-blue-300'}`}
                  style={{
                     left: `${field.x}%`,
                     top: `${field.y}%`,
                     transform: 'translate(-50%, -50%)',
                     fontFamily: `"${field.fontFamily}", sans-serif`, // Apply font family
                     fontSize: `${Math.max(12, field.fontSize / 2)}px`, // Scaled down slightly for preview
                     color: field.color,
                     textAlign: field.align,
                     whiteSpace: 'nowrap'
                  }}
               >
                  {field.defaultValue}
                  {selectedFieldId === field.id && (
                     <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 rounded-full text-white flex items-center justify-center shadow-sm">
                        <Move size={12} />
                     </div>
                  )}
               </div>
            ))}
         </div>
         <p className="text-slate-400 text-sm mt-4 flex items-center gap-2">
            <Move size={14} /> Glissez les textes pour les positionner
         </p>
      </div>

      {/* RIGHT: Property Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Champs ({fields.length})</h3>
            <button 
               onClick={addField}
               className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
            >
               <Plus size={16} /> Ajouter
            </button>
         </div>

         {selectedField ? (
            <div className="space-y-5 animate-fade-in">
               <div className="flex justify-between items-start">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Éditer le champ</h4>
                  <button 
                     onClick={() => removeField(selectedField.id)}
                     className="text-red-500 hover:bg-red-50 p-1 rounded"
                     title="Supprimer"
                  >
                     <Trash2 size={16} />
                  </button>
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Label (Nom du champ)</label>
                  <input 
                     type="text" 
                     value={selectedField.label} 
                     onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valeur par défaut</label>
                  <input 
                     type="text" 
                     value={selectedField.defaultValue} 
                     onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Police</label>
                     <select 
                        value={selectedField.fontFamily} 
                        onChange={(e) => updateField(selectedField.id, { fontFamily: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                     >
                        {GOOGLE_FONTS.map(f => (
                           <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Taille (px)</label>
                     <input 
                        type="number" 
                        value={selectedField.fontSize} 
                        onChange={(e) => updateField(selectedField.id, { fontSize: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Couleur</label>
                     <div className="flex items-center gap-2">
                        <input 
                           type="color" 
                           value={selectedField.color} 
                           onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                           className="h-9 w-9 p-0 border border-slate-200 rounded cursor-pointer"
                        />
                        <span className="text-xs text-slate-500">{selectedField.color}</span>
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Alignement</label>
                     <div className="flex bg-slate-100 rounded-lg p-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                           <button
                              key={align}
                              onClick={() => updateField(selectedField.id, { align })}
                              className={`flex-1 p-1 rounded flex justify-center ${selectedField.align === align ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                              {align === 'left' && <AlignLeft size={16} />}
                              {align === 'center' && <AlignCenter size={16} />}
                              {align === 'right' && <AlignRight size={16} />}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

            </div>
         ) : (
            <div className="text-center py-10 text-slate-400">
               <Type size={32} className="mx-auto mb-2 opacity-50" />
               <p className="text-sm">Sélectionnez un champ sur l'image ou ajoutez-en un nouveau.</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default TextTemplateBuilder;

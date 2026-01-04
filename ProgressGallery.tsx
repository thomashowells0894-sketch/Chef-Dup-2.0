
import React, { useState, useRef } from 'react';
import { ProgressPhoto } from '../types';
import { ArrowLeft, Camera, Trash2, Plus, Calendar, Image as ImageIcon } from 'lucide-react';

interface ProgressGalleryProps {
  photos: ProgressPhoto[];
  onAddPhoto: (photo: ProgressPhoto) => void;
  onDeletePhoto: (id: string) => void;
  onBack: () => void;
}

const ProgressGallery: React.FC<ProgressGalleryProps> = ({ photos, onAddPhoto, onDeletePhoto, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedWeight, setSelectedWeight] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Ask for weight
            const weightStr = prompt("Current weight (kg)?", "0");
            const weight = parseFloat(weightStr || "0");
            
            const newPhoto: ProgressPhoto = {
                id: `photo_${Date.now()}`,
                date: new Date().toISOString(),
                weight: weight,
                imageBase64: base64
            };
            onAddPhoto(newPhoto);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="p-6 bg-slate-900 flex items-center justify-between z-10 border-b border-slate-800">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Progress Gallery</h1>
        </div>
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50"
        >
            <Plus size={24} />
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                  <Camera size={64} className="mb-4" />
                  <p className="font-bold text-lg">No photos yet</p>
                  <p className="text-sm">Take your first progress pic!</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-4">
                  {photos.map(photo => (
                      <div key={photo.id} className="relative group bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
                          <img src={photo.imageBase64} className="w-full aspect-[3/4] object-cover" alt="Progress" />
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex flex-col justify-end p-3">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">
                                  <Calendar size={10} /> {new Date(photo.date).toLocaleDateString()}
                              </div>
                              <div className="font-black text-white text-lg">
                                  {photo.weight} <span className="text-sm text-slate-400 font-bold">kg</span>
                              </div>
                          </div>

                          <button 
                            onClick={() => onDeletePhoto(photo.id)}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-600/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default ProgressGallery;

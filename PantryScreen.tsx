
import React, { useState, useRef, useEffect } from 'react';
import { Ingredient, FoodItem } from '../types';
import * as FoodDB from '../services/foodDatabase';
import { Plus, X, ArrowRight, ChefHat, ArrowLeft, Trash2, Search, Zap, PenTool, Database, Image as ImageIcon, List, Edit3 } from 'lucide-react';

interface PantryScreenProps {
  initialIngredients: Ingredient[];
  onUpdatePantry: (ingredients: Ingredient[]) => void;
  onGenerateRecipes: (ingredients: Ingredient[]) => void;
  onBack: () => void;
  onCreateCustomFood: () => void;
  onOpenBulkEdit: () => void;
}

const PantryScreen: React.FC<PantryScreenProps> = ({ 
  initialIngredients, 
  onUpdatePantry, 
  onGenerateRecipes,
  onBack,
  onCreateCustomFood,
  onOpenBulkEdit
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STAPLES = ['Eggs', 'Milk', 'Bread', 'Chicken', 'Spinach', 'Rice', 'Butter', 'Onion', 'Garlic', 'Pasta', 'Cheese', 'Tomato'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            setSelectedImage(ev.target?.result as string);
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      if (val.length > 1) {
          setSuggestions(FoodDB.searchFoods(val));
      } else {
          setSuggestions([]);
      }
  };

  const handleAdd = (name: string) => {
    if (name.trim()) {
      const newIngredient: Ingredient = {
        id: `ing_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        confidence: 1.0,
        addedAt: Date.now(),
        imageUrl: selectedImage || undefined
      };
      
      const updated = [newIngredient, ...ingredients];
      setIngredients(updated);
      onUpdatePantry(updated);
      setInputValue('');
      setSuggestions([]);
      setSelectedImage(null);
    }
  };

  const handleManualPrompt = () => {
      const name = prompt("Enter ingredient name:");
      if (name) handleAdd(name);
  };

  const handleRemove = (id: string) => {
    const updated = ingredients.filter(i => i.id !== id);
    setIngredients(updated);
    onUpdatePantry(updated);
  };

  const handleClearAll = () => {
      if(confirm('Clear your entire pantry?')) {
          setIngredients([]);
          onUpdatePantry([]);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 flex flex-col gap-4 relative">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={24} />
            </button>
            <div className="text-center">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">DIGITAL FRIDGE</h1>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{ingredients.length} Items In Stock</p>
            </div>
            <button onClick={handleClearAll} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
            </button>
          </div>

          {/* Search Bar & Input */}
          <div className="relative z-20">
              {selectedImage ? (
                  <div className="absolute left-2 top-2 w-8 h-8 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer" onClick={() => setSelectedImage(null)}>
                      <img src={selectedImage} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} className="text-white" />
                      </div>
                  </div>
              ) : (
                  <Search className="absolute left-3 top-3 text-slate-400" size={20} />
              )}
              
              <input 
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type an ingredient..."
                  className="w-full bg-slate-100 rounded-xl py-3 pl-12 pr-20 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  autoFocus
              />
              
              <div className="absolute right-2 top-2 flex gap-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-1.5 rounded-lg transition-colors ${selectedImage ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                  >
                      <ImageIcon size={16} />
                  </button>
                  <button 
                    onClick={() => handleAdd(inputValue)}
                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                      <Plus size={16} strokeWidth={3} />
                  </button>
              </div>
              
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileSelect}
              />

              {/* Autocomplete Suggestions & Manual Add */}
              {(suggestions.length > 0 || inputValue.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-30 divide-y divide-slate-50 animate-in slide-in-from-top-2 duration-200">
                      {suggestions.map(item => (
                          <button
                              key={item.id}
                              onClick={() => handleAdd(item.name)}
                              className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center justify-between group"
                          >
                              <span>{item.name}</span>
                              <Plus size={14} className="opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity" />
                          </button>
                      ))}
                      {/* Always show option to add raw input if typed */}
                      {inputValue.trim().length > 0 && (
                          <button
                              onClick={() => handleAdd(inputValue)}
                              className="w-full px-4 py-3 text-left text-sm font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 flex items-center gap-2 border-t border-slate-100"
                          >
                              <Plus size={14} /> Add "{inputValue}" Manually
                          </button>
                      )}
                  </div>
              )}
          </div>

          {/* Features Row */}
          <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={onOpenBulkEdit}
                className="py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wide flex flex-col items-center justify-center gap-1 border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                  <List size={14} /> Bulk List
              </button>
              <button 
                onClick={onCreateCustomFood}
                className="py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-[10px] uppercase tracking-wide flex flex-col items-center justify-center gap-1 border border-indigo-100 hover:bg-indigo-100 transition-colors"
              >
                  <PenTool size={14} /> Custom Food
              </button>
              <button 
                onClick={handleManualPrompt}
                className="py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-[10px] uppercase tracking-wide flex flex-col items-center justify-center gap-1 border border-emerald-100 hover:bg-emerald-100 transition-colors"
              >
                  <Edit3 size={14} /> Manual Add
              </button>
          </div>

          {/* Quick Add Staples */}
          <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Zap size={10} /> Quick Add
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {STAPLES.map(staple => (
                      <button 
                        key={staple}
                        onClick={() => handleAdd(staple)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all whitespace-nowrap active:scale-95 flex items-center gap-1 shadow-sm"
                      >
                          <span>{getEmoji(staple)}</span> <span>{staple}</span>
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50" onClick={() => setSuggestions([])}>
        {ingredients.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <ChefHat size={48} />
                </div>
                <p className="font-bold text-lg">Your fridge is empty</p>
                <p className="text-sm text-center max-w-[200px] mb-6">Scan items or use the Manual Add button above.</p>
                <button 
                    onClick={handleManualPrompt}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all"
                >
                    Add First Item
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-3">
                {ingredients.map((ing, idx) => (
                    <div 
                        key={ing.id} 
                        className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group animate-in zoom-in duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shadow-inner overflow-hidden shrink-0">
                                {ing.imageUrl ? (
                                    <img src={ing.imageUrl} className="w-full h-full object-cover" alt={ing.name} />
                                ) : (
                                    getEmoji(ing.name)
                                )}
                            </div>
                            <span className="font-bold text-slate-700 truncate text-sm">{ing.name}</span>
                        </div>
                        <button 
                            onClick={() => handleRemove(ing.id)}
                            className="p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        >
                            <X size={14} strokeWidth={3} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
        <button 
          onClick={() => onGenerateRecipes(ingredients)}
          disabled={ingredients.length === 0}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          <ChefHat size={20} /> Find Recipes
        </button>
      </div>
    </div>
  );
};

// Simple visual helper for "10x better" aesthetic
const getEmoji = (name: string) => {
    const n = name.toLowerCase();
    if(n.includes('milk')) return '🥛';
    if(n.includes('egg')) return '🥚';
    if(n.includes('bread')) return '🍞';
    if(n.includes('chicken')) return '🍗';
    if(n.includes('beef') || n.includes('steak')) return '🥩';
    if(n.includes('rice')) return '🍚';
    if(n.includes('pasta')) return '🍝';
    if(n.includes('carrot')) return '🥕';
    if(n.includes('apple')) return '🍎';
    if(n.includes('banana')) return '🍌';
    if(n.includes('spinach') || n.includes('lettuce')) return '🥬';
    if(n.includes('cheese')) return '🧀';
    if(n.includes('butter')) return '🧈';
    if(n.includes('onion')) return '🧅';
    if(n.includes('garlic')) return '🧄';
    if(n.includes('tomato')) return '🍅';
    return '🥘';
}

export default PantryScreen;

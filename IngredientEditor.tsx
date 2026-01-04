import React, { useState } from 'react';
import { Ingredient } from '../types';
import { Plus, X, ArrowRight, ChefHat, ArrowLeft } from 'lucide-react';

interface IngredientEditorProps {
  initialIngredients: Ingredient[];
  onSave: (ingredients: Ingredient[]) => void;
  onCancel: () => void;
}

const IngredientEditor: React.FC<IngredientEditorProps> = ({ 
  initialIngredients, 
  onSave, 
  onCancel 
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: inputValue.trim(),
        confidence: 1.0 // Manual entry is 100% confident
      };
      setIngredients(prev => [...prev, newIngredient]);
      setInputValue('');
    }
  };

  const handleRemove = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="p-6 bg-white shadow-sm flex items-center gap-4">
        <button onClick={onCancel} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={24} />
        </button>
        <div>
            <h1 className="text-xl font-bold text-slate-900">Your Ingredients</h1>
            <p className="text-xs text-slate-500">Add what you have, we'll do the rest.</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-b border-slate-100">
        <div className="flex gap-2">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Chicken, Rice, Basil..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg bg-white text-slate-900 placeholder:text-slate-400"
                autoFocus
            />
            <button 
                onClick={handleAdd}
                className="bg-emerald-100 text-emerald-700 p-3 rounded-xl hover:bg-emerald-200 transition-colors"
            >
                <Plus size={24} />
            </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-2 content-start">
            {ingredients.length === 0 && (
                <div className="w-full text-center py-10 text-slate-400 flex flex-col items-center">
                    <ChefHat size={48} className="mb-4 opacity-20" />
                    <p>Your kitchen is empty!</p>
                    <p className="text-sm">Add ingredients to start cooking.</p>
                </div>
            )}
            
            {ingredients.map(ing => (
                <div 
                    key={ing.id} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-slate-700 animate-in fade-in zoom-in duration-200"
                >
                    <span className="font-medium">{ing.name}</span>
                    <button 
                        onClick={() => handleRemove(ing.id)}
                        className="text-slate-400 hover:text-red-500 p-0.5 rounded-full"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-white border-t border-slate-100">
        <button 
          onClick={() => onSave(ingredients)}
          disabled={ingredients.length === 0}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          Find Recipes <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default IngredientEditor;

import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Check } from 'lucide-react';
import { CustomFood } from '../types';

interface CustomFoodCreatorProps {
  onSave: (food: CustomFood) => void;
  onBack: () => void;
}

const CustomFoodCreator: React.FC<CustomFoodCreatorProps> = ({ onSave, onBack }) => {
  const [formData, setFormData] = useState<Partial<CustomFood>>({
    servingSize: 100,
    servingUnit: 'g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    fiber: 0,
    sodium: 0
  });

  const handleChange = (key: keyof CustomFood, value: string) => {
    const numValue = parseFloat(value);
    setFormData(prev => ({
        ...prev,
        [key]: isNaN(numValue) ? value : numValue
    }));
  };

  const handleSave = () => {
      if (!formData.name) {
          alert("Please enter a food name");
          return;
      }
      
      const newFood: CustomFood = {
          id: `cust_${Date.now()}`,
          name: formData.name as string,
          brand: formData.brand as string || '',
          servingSize: formData.servingSize || 100,
          servingUnit: formData.servingUnit || 'g',
          calories: formData.calories || 0,
          protein: formData.protein || 0,
          carbs: formData.carbs || 0,
          fat: formData.fat || 0,
          sugar: formData.sugar || 0,
          fiber: formData.fiber || 0,
          sodium: formData.sodium || 0,
      };
      
      onSave(newFood);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="p-6 bg-white shadow-sm flex items-center gap-4 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Create Custom Food</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Basic Details</h2>
              
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Food Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Grandma's Cookies" 
                    className="w-full p-3 bg-slate-50 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                  />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Brand (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Homemade" 
                    className="w-full p-3 bg-slate-50 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.brand || ''}
                    onChange={e => handleChange('brand', e.target.value)}
                  />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Serving Size</label>
                      <input 
                        type="number" 
                        className="w-full p-3 bg-slate-50 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.servingSize}
                        onChange={e => handleChange('servingSize', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Unit</label>
                      <select 
                        className="w-full p-3 bg-slate-50 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.servingUnit}
                        onChange={e => handleChange('servingUnit', e.target.value)}
                      >
                          <option value="g">grams (g)</option>
                          <option value="ml">ml</option>
                          <option value="oz">oz</option>
                          <option value="cup">cup</option>
                          <option value="pcs">pieces</option>
                      </select>
                  </div>
              </div>
          </section>

          {/* Macros */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Macros (per serving)</h2>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Calories</label>
                      <div className="relative">
                          <input 
                            type="number" 
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.calories}
                            onChange={e => handleChange('calories', e.target.value)}
                          />
                          <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">kcal</span>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-emerald-600 mb-1">Protein</label>
                      <input 
                        type="number" 
                        className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={formData.protein}
                        onChange={e => handleChange('protein', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-amber-600 mb-1">Carbs</label>
                      <input 
                        type="number" 
                        className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={formData.carbs}
                        onChange={e => handleChange('carbs', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-rose-600 mb-1">Fat</label>
                      <input 
                        type="number" 
                        className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                        value={formData.fat}
                        onChange={e => handleChange('fat', e.target.value)}
                      />
                  </div>
              </div>
          </section>

          {/* Micros */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Micro-Nutrients</h2>
              
              <div className="grid grid-cols-3 gap-3">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Sugar (g)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 bg-slate-50 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.sugar}
                        onChange={e => handleChange('sugar', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Fiber (g)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 bg-slate-50 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.fiber}
                        onChange={e => handleChange('fiber', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Sodium (mg)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 bg-slate-50 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.sodium}
                        onChange={e => handleChange('sodium', e.target.value)}
                      />
                  </div>
              </div>
          </section>
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
              <Save size={20} /> Save Food
          </button>
      </div>
    </div>
  );
};

export default CustomFoodCreator;

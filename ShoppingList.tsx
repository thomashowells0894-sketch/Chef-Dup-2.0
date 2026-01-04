
import React, { useEffect, useState } from 'react';
import { Recipe, ShoppingItem } from '../types';
import * as StorageService from '../services/storage';
import * as FoodDB from '../services/foodDatabase'; // Use DB to guess categories
import { ShoppingCart, ArrowRight, Check, Trash2, ArrowLeft, ExternalLink, Plus, Copy, List, Filter } from 'lucide-react';

interface ShoppingListProps {
  recipe: Recipe;
  userId: string;
  onContinue: () => void;
  onBack: () => void;
}

// Simple category guessing
const getCategory = (itemName: string): string => {
    const lower = itemName.toLowerCase();
    // Check DB first
    const dbItem = FoodDB.COMMON_FOODS.find(f => lower.includes(f.name.toLowerCase()));
    if (dbItem && dbItem.category) return dbItem.category;

    // Fallback heuristics
    if (['milk', 'cheese', 'yogurt', 'cream', 'butter'].some(k => lower.includes(k))) return 'Dairy';
    if (['chicken', 'beef', 'pork', 'fish', 'steak', 'egg', 'meat'].some(k => lower.includes(k))) return 'Protein';
    if (['apple', 'banana', 'spinach', 'kale', 'carrot', 'onion', 'garlic', 'tomato'].some(k => lower.includes(k))) return 'Produce';
    if (['rice', 'bread', 'pasta', 'flour', 'oat'].some(k => lower.includes(k))) return 'Grains';
    
    return 'Other';
};

const ShoppingList: React.FC<ShoppingListProps> = ({ recipe, userId, onContinue, onBack }) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const existing = StorageService.getShoppingList(userId);
    const updated = StorageService.addItemsToShoppingList(
        userId, 
        recipe.missingIngredients, 
        recipe.id
    );
    setItems(updated);
  }, [recipe, userId]);

  const handleToggle = (itemId: string) => {
    const updated = StorageService.toggleShoppingItem(userId, itemId);
    setItems(updated);
  };

  const handleRemove = (itemId: string) => {
    const updated = StorageService.removeShoppingItem(userId, itemId);
    setItems(updated);
  };

  const handleShopAll = async () => {
    const activeItems = items.filter(i => !i.checked).map(i => i.name).join(', ');
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(activeItems);
            setShowToast(true);
            setTimeout(() => {
                window.open('https://www.instacart.com', '_blank');
                setShowToast(false);
            }, 1500);
        } catch (e) {
            window.open('https://www.instacart.com', '_blank');
        }
    } else {
        window.open('https://www.instacart.com', '_blank');
    }
  };

  const activeItems = items.filter(i => !i.checked);
  const checkedItems = items.filter(i => i.checked);

  // Group by category
  const categorizedItems: Record<string, ShoppingItem[]> = {};
  activeItems.forEach(item => {
      const cat = getCategory(item.name);
      if (!categorizedItems[cat]) categorizedItems[cat] = [];
      categorizedItems[cat].push(item);
  });

  const categories = Object.keys(categorizedItems).sort();

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {/* Toast */}
      {showToast && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <Check size={18} className="text-emerald-400" />
              <span className="font-bold">List copied! Opening Instacart...</span>
          </div>
      )}

      {/* Header */}
      <div className="p-6 bg-white shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-xl font-bold text-slate-900">Shopping List</h1>
                <p className="text-xs text-slate-500">{activeItems.length} items to buy</p>
            </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {/* Active Items Grouped */}
        {activeItems.length > 0 ? (
            categories.map(cat => (
                <div key={cat}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">{cat}</h3>
                    <div className="space-y-2">
                        {categorizedItems[cat].map(item => (
                            <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 group">
                                <button 
                                    onClick={() => handleToggle(item.id)}
                                    className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-transparent hover:border-emerald-500 transition-colors"
                                >
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full opacity-0 scale-0 transition-all" />
                                </button>
                                <span className="flex-1 font-bold text-slate-800">{item.name}</span>
                                <button 
                                    onClick={() => handleRemove(item.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))
        ) : (
            <div className="py-12 text-center text-slate-400">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">Your list is clear!</p>
            </div>
        )}

        {/* Checked Items */}
        {checkedItems.length > 0 && (
            <div>
                <div className="pt-4 pb-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Completed ({checkedItems.length})
                </div>
                <div className="space-y-2">
                    {checkedItems.map(item => (
                        <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 opacity-60">
                            <button 
                                onClick={() => handleToggle(item.id)}
                                className="w-6 h-6 rounded-full border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center text-white"
                            >
                                <Check size={14} strokeWidth={3} />
                            </button>
                            <span className="flex-1 font-medium text-slate-500 line-through">{item.name}</span>
                            <button 
                                onClick={() => handleRemove(item.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-6 flex flex-col gap-3 shadow-lg z-20">
        <button 
            onClick={handleShopAll}
            disabled={activeItems.length === 0}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
        >
            <ShoppingCart size={20} /> Order on Instacart
        </button>

        <button 
            onClick={onContinue}
            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
            I have ingredients <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default ShoppingList;

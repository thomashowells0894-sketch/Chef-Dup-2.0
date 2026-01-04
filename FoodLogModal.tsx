
import React, { useState, useEffect } from 'react';
import { FoodItem, MealType } from '../types';
import * as FoodDB from '../services/foodDatabase';
import * as AIService from '../services/aiService';
import { Search, History, ScanBarcode, Camera, X, Plus, Flame, ChevronRight, Zap, CheckCircle2, Wand2, Mic } from 'lucide-react';

interface FoodLogModalProps {
  mealType: MealType;
  isOpen: boolean;
  onClose: () => void;
  onAddFood: (food: FoodItem) => void;
  onScanBarcode: () => void;
  onScanFridge: () => void;
}

const FoodLogModal: React.FC<FoodLogModalProps> = ({ 
  mealType, 
  isOpen, 
  onClose, 
  onAddFood,
  onScanBarcode,
  onScanFridge
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'magic'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [magicQuery, setMagicQuery] = useState('');
  const [isProcessingMagic, setIsProcessingMagic] = useState(false);
  const [magicResults, setMagicResults] = useState<FoodItem[]>([]);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
      if (isOpen) {
          const recents = FoodDB.COMMON_FOODS.slice(0, 5);
          setRecentFoods(recents);
          setSearchQuery('');
          setResults([]);
          setMagicQuery('');
          setMagicResults([]);
          setActiveTab('search');
      }
  }, [isOpen]);

  useEffect(() => {
      if (searchQuery.length > 0) {
          setResults(FoodDB.searchFoods(searchQuery));
          setActiveTab('search');
      } else {
          setResults([]);
      }
  }, [searchQuery]);

  const handleMagicLog = async () => {
      if (!magicQuery.trim()) return;
      setIsProcessingMagic(true);
      try {
          const items = await AIService.parseNaturalLanguageFoodLog(magicQuery);
          setMagicResults(items);
      } catch (e) {
          alert("Could not process log. Try again.");
      } finally {
          setIsProcessingMagic(false);
      }
  };

  const handleAddMagicItem = (item: FoodItem) => {
      onAddFood(item);
      setMagicResults(prev => prev.filter(i => i.id !== item.id));
      if (magicResults.length <= 1) {
          onClose(); // Close if last item added
      }
  };

  if (!isOpen) return null;

  const FoodRow = ({ item, isMagic = false }: { item: FoodItem, isMagic?: boolean }) => (
      <div 
        onClick={() => isMagic ? handleAddMagicItem(item) : onAddFood(item)}
        className={`flex items-center justify-between p-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer ${isMagic ? 'bg-indigo-50/50' : 'bg-white'}`}
      >
          <div>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  {item.name}
                  {item.isVerified && <CheckCircle2 size={14} className="text-blue-500 fill-blue-50" />}
                  {item.aiConfidence && <Wand2 size={12} className="text-indigo-500" />}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                  {item.servingSize} {item.servingUnit} • {item.calories} kcal
                  {isMagic && <span className="ml-2 text-indigo-500 font-bold">Tap to add</span>}
              </div>
          </div>
          <button className={`p-2 rounded-full ${isMagic ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-emerald-600'}`}>
              <Plus size={16} />
          </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />

      <div className="bg-slate-50 w-full sm:max-w-md h-[85vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-bottom duration-300 relative overflow-hidden">
        
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-black text-slate-900 capitalize">Add to {mealType}</h2>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 bg-slate-100 mx-4 mt-4 rounded-xl shrink-0 gap-1">
            <button 
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Search
            </button>
            <button 
                onClick={() => setActiveTab('magic')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'magic' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Wand2 size={12} /> Magic Log
            </button>
            <button 
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'recent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Recent
            </button>
        </div>

        {activeTab === 'magic' ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4">
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Wand2 size={16} className="text-indigo-500" /> Talk to Chef
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                        Describe your meal naturally. E.g. "I had 2 eggs, bacon, and a coffee."
                    </p>
                    <div className="relative">
                        <textarea 
                            value={magicQuery}
                            onChange={(e) => setMagicQuery(e.target.value)}
                            placeholder="Type here..."
                            className="w-full bg-slate-50 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                        />
                        <button className="absolute bottom-2 right-2 p-2 bg-slate-200 rounded-full text-slate-500 hover:bg-slate-300 transition-colors">
                            <Mic size={16} />
                        </button>
                    </div>
                    <button 
                        onClick={handleMagicLog}
                        disabled={!magicQuery.trim() || isProcessingMagic}
                        className="w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isProcessingMagic ? 'Analyzing...' : 'Analyze Meal'}
                    </button>
                </div>

                {magicResults.length > 0 && (
                    <div className="space-y-2 animate-in slide-in-from-bottom duration-300">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Detected Items</div>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                            {magicResults.map(item => <FoodRow key={item.id} item={item} isMagic />)}
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <>
                <div className="px-4 py-3 bg-white border-b border-slate-100 shrink-0 mt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for food..."
                            className="w-full bg-slate-100 rounded-xl py-3 pl-10 pr-10 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                            autoFocus={activeTab === 'search'}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'search' && !searchQuery && (
                    <div className="grid grid-cols-2 gap-3 p-4 shrink-0 bg-slate-50">
                        <button 
                            onClick={onScanBarcode}
                            className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold shadow-sm active:scale-98 transition-all hover:border-indigo-300"
                        >
                            <ScanBarcode size={18} className="text-indigo-600" /> Scan Barcode
                        </button>
                        <button 
                            onClick={onScanFridge}
                            className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold shadow-sm active:scale-98 transition-all hover:border-emerald-300"
                        >
                            <Camera size={18} className="text-emerald-600" /> AI Photo Log
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto bg-white">
                    {searchQuery ? (
                        results.length > 0 ? (
                            results.map(item => <FoodRow key={item.id} item={item} />)
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <Search size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No foods found. Try "Apple" or "Chicken".</p>
                            </div>
                        )
                    ) : activeTab === 'recent' ? (
                        <>
                            <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yesterday & Today</div>
                            {recentFoods.map(item => <FoodRow key={`rec_${item.id}`} item={item} />)}
                        </>
                    ) : (
                        <div className="p-8 text-center text-slate-400">
                            <Flame size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Search above or use Magic Log.</p>
                        </div>
                    )}
                </div>
            </>
        )}

      </div>
    </div>
  );
};

export default FoodLogModal;

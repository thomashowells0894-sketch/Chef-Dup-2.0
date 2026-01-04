
import React from 'react';
import { MenuItem, UserProfile } from '../types';
import { ArrowLeft, Check, Plus, Flame, Sparkles, AlertTriangle } from 'lucide-react';

interface RestaurantMenuScreenProps {
  items: MenuItem[];
  onBack: () => void;
  onLogItem: (item: MenuItem) => void;
}

const RestaurantMenuScreen: React.FC<RestaurantMenuScreenProps> = ({ items, onBack, onLogItem }) => {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="p-6 bg-white shadow-sm flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    Menu Scout <Sparkles size={16} className="text-emerald-500" />
                </h1>
                <p className="text-xs text-slate-500 font-medium">AI recommendations based on your goals</p>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.map((item, idx) => {
              const isBestMatch = idx === 0 && item.matchScore > 80;
              const isBadMatch = item.matchScore < 30;

              return (
                  <div 
                    key={item.id}
                    className={`rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden ${
                        isBestMatch 
                        ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl scale-105 mb-6' 
                        : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                      {isBestMatch && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                              Chef Recommended
                          </div>
                      )}

                      <div className="flex justify-between items-start mb-2 pr-4">
                          <h3 className={`font-bold text-lg leading-tight ${isBestMatch ? 'text-white' : 'text-slate-900'}`}>{item.name}</h3>
                          <span className={`font-bold ${isBestMatch ? 'text-emerald-400' : 'text-slate-500'}`}>${item.price}</span>
                      </div>

                      <p className={`text-sm mb-4 line-clamp-2 ${isBestMatch ? 'text-slate-300' : 'text-slate-500'}`}>{item.description}</p>

                      {/* Macros Grid */}
                      <div className={`grid grid-cols-3 gap-2 mb-4 p-3 rounded-xl ${isBestMatch ? 'bg-white/10' : 'bg-slate-50'}`}>
                          <div className="text-center">
                              <div className={`text-xs font-bold uppercase mb-0.5 ${isBestMatch ? 'text-slate-400' : 'text-slate-400'}`}>Cals</div>
                              <div className={`font-black ${isBestMatch ? 'text-white' : 'text-slate-800'}`}>{item.calories}</div>
                          </div>
                          <div className="text-center border-l border-white/10">
                              <div className={`text-xs font-bold uppercase mb-0.5 ${isBestMatch ? 'text-slate-400' : 'text-slate-400'}`}>Protein</div>
                              <div className={`font-black ${isBestMatch ? 'text-emerald-400' : 'text-emerald-600'}`}>{item.protein}g</div>
                          </div>
                          <div className="text-center border-l border-white/10">
                              <div className={`text-xs font-bold uppercase mb-0.5 ${isBestMatch ? 'text-slate-400' : 'text-slate-400'}`}>Carbs</div>
                              <div className={`font-black ${isBestMatch ? 'text-amber-400' : 'text-amber-600'}`}>{item.carbs}g</div>
                          </div>
                      </div>

                      {/* AI Reasoning */}
                      {item.recommendationReason && (
                          <div className={`flex items-center gap-2 text-xs font-bold mb-4 ${
                              isBestMatch ? 'text-emerald-300' : 
                              isBadMatch ? 'text-red-500' : 'text-indigo-500'
                          }`}>
                              {isBestMatch ? <Check size={14} strokeWidth={3} /> : isBadMatch ? <AlertTriangle size={14} /> : <Flame size={14} />}
                              {item.recommendationReason}
                          </div>
                      )}

                      <button 
                        onClick={() => onLogItem(item)}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${
                            isBestMatch 
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/30' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                          <Plus size={18} /> Add to Log
                      </button>
                  </div>
              );
          })}
      </div>
    </div>
  );
};

export default RestaurantMenuScreen;

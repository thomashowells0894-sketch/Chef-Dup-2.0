
import React, { useState, useMemo } from 'react';
import { Recipe, UserProfile } from '../types';
import { Leaf, Clock, Zap, Heart, Flame, ChefHat, ShoppingBag, Globe, CalendarPlus, ChevronRight, Filter, Search, X, Droplet } from 'lucide-react';

interface RecipeListProps {
  recipes: Recipe[];
  userProfile: UserProfile;
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleVegan: () => void;
  onScanNew: () => void;
  onEditIngredients: () => void;
  onToggleFavorite: (id: string) => void;
  onImport: () => void;
  onAddToPlan: (recipe: Recipe) => void;
}

type FilterType = 'High Protein' | 'Low Calorie' | 'Vegan' | 'Keto' | 'Fast' | 'Gluten Free';

const RecipeList: React.FC<RecipeListProps> = ({ 
  recipes, 
  userProfile, 
  onSelectRecipe, 
  onScanNew,
  onToggleFavorite,
  onImport,
  onAddToPlan
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFilter = (filter: FilterType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filter)) newFilters.delete(filter);
    else newFilters.add(filter);
    setActiveFilters(newFilters);
  };

  const displayedRecipes = useMemo(() => {
    let list = activeTab === 'all' 
      ? recipes 
      : recipes.filter(r => userProfile.savedRecipeIds.includes(r.id));

    // Text Search
    if (searchQuery) {
        list = list.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Smart Filters
    if (activeFilters.size > 0) {
      list = list.filter(r => {
        if (activeFilters.has('High Protein') && r.protein < 25) return false;
        if (activeFilters.has('Low Calorie') && r.calories > 600) return false;
        if (activeFilters.has('Vegan') && !r.isVegan) return false;
        if (activeFilters.has('Keto') && !r.isKeto) return false;
        if (activeFilters.has('Gluten Free') && !r.isGlutenFree) return false;
        // Strictly less than 25 minutes
        if (activeFilters.has('Fast') && r.prepTimeMinutes >= 25) return false;
        return true;
      });
    }
    return list;
  }, [recipes, activeTab, activeFilters, userProfile.savedRecipeIds, searchQuery]);

  const FilterChip = ({ type, label, icon: Icon }: { type: FilterType, label: string, icon?: React.ElementType }) => {
    const isActive = activeFilters.has(type);
    
    let activeClass = 'bg-slate-900 border-slate-900 shadow-slate-900/20 text-white';
    if (type === 'High Protein') activeClass = 'bg-emerald-600 border-emerald-600 shadow-emerald-500/30 text-white';
    if (type === 'Low Calorie') activeClass = 'bg-orange-500 border-orange-500 shadow-orange-500/30 text-white';
    if (type === 'Vegan') activeClass = 'bg-green-500 border-green-500 shadow-green-500/30 text-white';
    if (type === 'Keto') activeClass = 'bg-blue-600 border-blue-600 shadow-blue-500/30 text-white';
    if (type === 'Fast') activeClass = 'bg-amber-400 border-amber-400 shadow-amber-500/30 text-amber-950';

    return (
      <button 
        onClick={() => toggleFilter(type)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap active:scale-95 ${
          isActive 
            ? `${activeClass} shadow-lg` 
            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {Icon && <Icon size={12} className={isActive ? (type === 'Fast' ? 'text-amber-900' : 'text-white') : 'text-slate-400'} />}
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Immersive Sticky Header */}
      <div className="bg-white/90 backdrop-blur-xl z-20 sticky top-0 border-b border-slate-100 shadow-sm transition-all">
        <div className="px-6 pt-12 pb-2">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Chef's Feed <span className="text-emerald-500 text-xs px-2 py-1 bg-emerald-50 rounded-full font-bold uppercase tracking-wide border border-emerald-100">{displayedRecipes.length} Results</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={onImport}
                        className="w-10 h-10 flex items-center justify-center bg-indigo-50 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100"
                    >
                        <Globe size={20} />
                    </button>
                    <button 
                        onClick={onScanNew}
                        className="w-10 h-10 flex items-center justify-center bg-slate-900 rounded-full text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                    >
                        <ChefHat size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipes..."
                    className="w-full bg-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                )}
            </div>
            
            {/* Filter Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
               <div className="flex bg-slate-100 rounded-full p-1 mr-2 shrink-0 border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        For You
                    </button>
                    <button 
                        onClick={() => setActiveTab('saved')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'saved' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Saved
                    </button>
               </div>
               
               <div className="w-px h-8 bg-slate-200 shrink-0 mx-1" /> {/* Divider */}

               <FilterChip type="High Protein" label="High Protein" icon={Zap} />
               <FilterChip type="Low Calorie" label="Low Cal" icon={Flame} />
               <FilterChip type="Fast" label="Under 25m" icon={Clock} />
               <FilterChip type="Vegan" label="Vegan" icon={Leaf} />
               <FilterChip type="Keto" label="Keto" icon={Droplet} />
            </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {displayedRecipes.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                    <ShoppingBag size={40} className="text-slate-300" />
                </div>
                <h3 className="font-black text-xl text-slate-700 mb-2">No recipes found</h3>
                <p className="text-slate-400 max-w-xs mx-auto mb-6 text-sm">We couldn't match any recipes to your filters. Try clearing them or scanning more food.</p>
                {(activeFilters.size > 0 || searchQuery) && (
                    <button 
                        onClick={() => { setActiveFilters(new Set()); setSearchQuery(''); }}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:bg-slate-800 transition-colors"
                    >
                        <Filter size={16} /> Clear All Filters
                    </button>
                )}
            </div>
        ) : (
            displayedRecipes.map((recipe, idx) => {
              const isSaved = userProfile.savedRecipeIds.includes(recipe.id);
              const missingCount = recipe.missingIngredients.length;
              const hasIngredients = missingCount === 0;
              const matchPercentage = Math.round(((recipe.ingredients.length - missingCount) / recipe.ingredients.length) * 100);

              return (
                <div 
                    key={recipe.id}
                    className="bg-white rounded-[28px] shadow-sm border border-slate-100 overflow-hidden relative group cursor-pointer active:scale-[0.99] transition-all duration-300 hover:shadow-xl hover:border-slate-200"
                    style={{ animation: `slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.1}s backwards` }}
                    onClick={() => onSelectRecipe(recipe)}
                >
                    {/* Image Area */}
                    <div className="h-56 w-full relative overflow-hidden">
                        <img 
                            src={recipe.imageUrl} 
                            alt={recipe.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(recipe.title + ' delicious food photography high resolution')}?width=800&height=600&nologo=true`;
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                        
                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 flex gap-2">
                             {hasIngredients ? (
                                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide shadow-lg flex items-center gap-1.5 backdrop-blur-md bg-opacity-90">
                                    <Zap size={12} fill="currentColor" /> Match
                                </div>
                            ) : (
                                <div className="bg-white/20 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg">
                                    You have {matchPercentage}%
                                </div>
                            )}
                        </div>

                        {/* Top Actions */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
                                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-lg ${
                                    isSaved ? 'bg-white text-red-500' : 'bg-black/30 text-white hover:bg-white hover:text-red-500'
                                }`}
                            >
                                <Heart size={20} className={isSaved ? "fill-current" : ""} />
                            </button>
                        </div>

                        {/* Text Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-5 text-white">
                            <h3 className="text-xl font-black leading-tight mb-2 drop-shadow-md pr-12 line-clamp-2">
                                {recipe.title}
                            </h3>
                            <div className="flex items-center gap-4 text-xs font-bold opacity-90">
                                <span className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                                    <Clock size={12} /> {recipe.prepTimeMinutes}m
                                </span>
                                <span className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                                    <Flame size={12} /> {recipe.calories} kcal
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom Info */}
                    <div className="p-5 bg-white flex justify-between items-center relative">
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <div className="text-xs font-black uppercase tracking-wider text-slate-400">Protein Power</div>
                                <div className="h-px bg-slate-100 w-12" />
                             </div>
                             <div className="text-emerald-600 font-black text-lg flex items-center gap-1">
                                 {recipe.protein}g <span className="text-xs font-medium text-slate-400">/ serving</span>
                             </div>
                        </div>

                        <div className="flex gap-2">
                            {/* Quick Add Button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddToPlan(recipe); }}
                                className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 active:scale-90 transition-all border border-indigo-100"
                                title="Add to Meal Plan"
                            >
                                <CalendarPlus size={20} />
                            </button>

                            <button className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 active:scale-90 transition-all shadow-lg shadow-slate-200">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Missing Ingredients Strip */}
                    {!hasIngredients && (
                        <div className="bg-amber-50 px-5 py-2 text-[10px] font-bold text-amber-700 border-t border-amber-100 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                             Missing: {recipe.missingIngredients.slice(0, 2).join(', ')} {missingCount > 2 && `+${missingCount - 2} more`}
                        </div>
                    )}
                </div>
              );
            })
        )}
      </div>

      <style>{`
          @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
          }
      `}</style>
    </div>
  );
};

export default RecipeList;

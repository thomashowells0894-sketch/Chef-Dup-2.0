
import React, { useState, useRef, useEffect } from 'react';
import { Recipe, ChatMessage } from '../types';
import * as AIService from '../services/aiService';
import Tooltip from './Tooltip';
import { 
  ArrowLeft, ShoppingCart, ChefHat, Send, X, MessageSquare, Heart, CalendarPlus, 
  Flame, Zap, Droplet, Wheat, Star, Check, Users, ChevronDown, ChevronUp, AlertCircle, Plus, Globe
} from 'lucide-react';

interface RecipeDetailProps {
  recipe: Recipe;
  isSaved: boolean;
  userRating: number;
  onBack: () => void;
  onCook: () => void;
  onShop: () => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlan: (recipe: Recipe) => void;
  onRate: (rating: number) => void;
  onAddToShoppingList: (items: string[]) => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ 
  recipe, 
  isSaved,
  userRating,
  onBack, 
  onCook, 
  onShop,
  onToggleFavorite,
  onAddToPlan,
  onRate,
  onAddToShoppingList
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFullNutrition, setShowFullNutrition] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'ai', text: `Hi! I'm your Sous Chef. Ask me anything about ${recipe.title}.` }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [itemsAdded, setItemsAdded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async () => {
    if (!inputVal.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputVal };
    setChatMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);
    try {
        const response = await AIService.askSousChef(inputVal, recipe);
        setChatMessages(prev => [...prev, response]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleAddMissing = () => {
      onAddToShoppingList(recipe.missingIngredients);
      setItemsAdded(true);
      setTimeout(() => setItemsAdded(false), 3000);
  };

  // Determine display image
  const displayImage = recipe.imageUrl || AIService.getDynamicImage(recipe.title);

  // Macro Calculation for Visual Bar
  const totalGrams = recipe.protein + recipe.carbs + recipe.fat;
  const pPct = totalGrams ? (recipe.protein / totalGrams) * 100 : 0;
  const cPct = totalGrams ? (recipe.carbs / totalGrams) * 100 : 0;
  const fPct = totalGrams ? (recipe.fat / totalGrams) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      
      {/* Toast */}
      {itemsAdded && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <Check size={18} className="text-emerald-400" />
              <span className="font-bold text-sm">Added to Shopping List</span>
          </div>
      )}

      {/* Header Actions (Floating) */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20 pointer-events-none">
          <Tooltip text="Back" position="bottom" className="pointer-events-auto">
            <button onClick={onBack} className="p-3 bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/30 transition-colors shadow-lg">
                <ArrowLeft size={24} />
            </button>
          </Tooltip>
          <div className="flex gap-3 pointer-events-auto">
            <Tooltip text="Add to Meal Plan" position="bottom">
                <button 
                    onClick={() => onAddToPlan(recipe)}
                    className="p-3 bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/30 transition-colors shadow-lg"
                >
                    <CalendarPlus size={24} />
                </button>
            </Tooltip>
            <Tooltip text={isSaved ? "Remove Favorite" : "Save Recipe"} position="bottom">
                <button 
                    onClick={() => onToggleFavorite(recipe.id)}
                    className="p-3 bg-white/20 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/30 transition-colors shadow-lg"
                >
                    <Heart size={24} className={isSaved ? "fill-red-500 text-red-500" : "text-white"} />
                </button>
            </Tooltip>
          </div>
      </div>

      {/* Parallax Hero Image */}
      <div className="relative h-[45vh] w-full shrink-0">
        <img 
            src={displayImage}
            className="w-full h-full object-cover" 
            alt={recipe.title} 
            onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = AIService.getDynamicImage(recipe.title);
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />
        
        <div className="absolute bottom-8 left-0 w-full px-6">
          <div className="flex gap-2 mb-3">
            {recipe.isVegan && <span className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-md">Vegan</span>}
            {recipe.isKeto && <span className="px-2 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-md">Keto</span>}
          </div>
          <h1 className="text-4xl font-black text-white leading-tight shadow-sm mb-2">{recipe.title}</h1>
          
          {recipe.sourceUrl && (
            <a 
              href={recipe.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-xs font-bold text-white/80 hover:text-white mb-2 bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm transition-colors"
            >
              <Globe size={12} /> Source: {new URL(recipe.sourceUrl).hostname}
            </a>
          )}

          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
              <span>{recipe.prepTimeMinutes} mins</span>
              <span>•</span>
              <span>{recipe.ingredients.length} ingredients</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Users size={14} /> {recipe.servings} Serv</span>
          </div>
        </div>
      </div>

      {/* Content Scroll */}
      <div className="flex-1 overflow-y-auto -mt-6 bg-slate-50 rounded-t-[32px] relative z-10 pt-8 px-6 pb-32">
        
        {/* Rating Block */}
        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
             <div>
                <h2 className="text-sm font-bold text-slate-900">Taste Rating</h2>
                <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            size={16}
                            onClick={() => onRate(star)}
                            className={`cursor-pointer transition-colors ${star <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 fill-slate-50'}`}
                        />
                    ))}
                </div>
             </div>
             <Tooltip text="Estimated Grocery Savings">
                 <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Savings</div>
                    <div className="text-emerald-600 font-black text-xl">${recipe.savings.toFixed(2)}</div>
                 </div>
             </Tooltip>
        </div>

        {/* Nutrition Grid (Macros) */}
        <div className="grid grid-cols-4 gap-3 mb-2">
            <Tooltip text="Total Calories">
                <NutritionPill value={recipe.calories} label="Cals" unit="" color="bg-orange-100 text-orange-700" />
            </Tooltip>
            <Tooltip text="Protein (Muscle Repair)">
                <NutritionPill value={recipe.protein} label="Prot" unit="g" color="bg-emerald-100 text-emerald-700" />
            </Tooltip>
            <Tooltip text="Carbs (Energy)">
                <NutritionPill value={recipe.carbs} label="Carb" unit="g" color="bg-amber-100 text-amber-700" />
            </Tooltip>
            <Tooltip text="Fat (Hormone Health)">
                <NutritionPill value={recipe.fat} label="Fat" unit="g" color="bg-rose-100 text-rose-700" />
            </Tooltip>
        </div>

        {/* Macro Visual Bar */}
        <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">
                <span>Distribution</span>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {Math.round(pPct)}% P</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/> {Math.round(cPct)}% C</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"/> {Math.round(fPct)}% F</span>
                </div>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
                <div style={{ width: `${pPct}%` }} className="bg-emerald-500" />
                <div style={{ width: `${cPct}%` }} className="bg-amber-500" />
                <div style={{ width: `${fPct}%` }} className="bg-rose-500" />
            </div>
        </div>

        {/* Nutrition Deep Dive (Micros) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
            <button 
                onClick={() => setShowFullNutrition(!showFullNutrition)}
                className="w-full px-4 py-3 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Full Nutrition Label</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">FDA Style</span>
                </div>
                {showFullNutrition ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            
            {showFullNutrition && (
                <div className="p-6 border-t border-slate-100 font-sans text-slate-900">
                    <div className="border-b-[4px] border-slate-900 pb-2 mb-2">
                        <h1 className="font-black text-3xl leading-none">Nutrition Facts</h1>
                        <p className="text-sm font-medium">Serving Size 1 Bowl</p>
                    </div>
                    
                    <div className="border-b-[4px] border-slate-900 pb-2 mb-2 flex justify-between items-end">
                        <div>
                            <div className="font-bold text-sm">Amount Per Serving</div>
                            <div className="font-black text-2xl">Calories</div>
                        </div>
                        <div className="font-black text-4xl">{recipe.calories}</div>
                    </div>

                    <div className="space-y-1 text-sm">
                        <NutritionRow label="Total Fat" value={recipe.fat} unit="g" daily={Math.round((recipe.fat/65)*100)} bold />
                        <NutritionRow label="Sodium" value={recipe.sodium} unit="mg" daily={Math.round((recipe.sodium/2300)*100)} bold />
                        <NutritionRow label="Total Carbohydrate" value={recipe.carbs} unit="g" daily={Math.round((recipe.carbs/300)*100)} bold />
                        <div className="pl-4">
                            <NutritionRow label="Dietary Fiber" value={recipe.fiber} unit="g" daily={Math.round((recipe.fiber/28)*100)} />
                            <NutritionRow label="Total Sugars" value={recipe.sugar} unit="g" />
                        </div>
                        <NutritionRow label="Protein" value={recipe.protein} unit="g" bold noBorder />
                    </div>
                    
                    <div className="mt-4 text-[10px] text-slate-500 leading-tight">
                        * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
                    </div>
                </div>
            )}
        </div>

        {/* AI Chef Button */}
        <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 mb-8 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm"
        >
            <MessageSquare size={20} /> Ask Sous Chef about this
        </button>

        {/* Description */}
        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-2">The Dish</h2>
            <p className="text-slate-500 leading-relaxed text-sm font-medium">{recipe.description}</p>
        </div>

        {/* Ingredients Checklist */}
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Ingredients</h2>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{recipe.ingredients.length} items</span>
                </div>
                {recipe.missingIngredients.length > 0 && (
                    <button 
                        onClick={handleAddMissing}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                    >
                        <Plus size={14} /> Add missing to list
                    </button>
                )}
            </div>
            
            <div className="space-y-3">
                {recipe.ingredients.map((ing, idx) => {
                    const isMissing = recipe.missingIngredients.includes(ing.name);
                    return (
                        <div key={idx} className={`flex items-center p-3 rounded-2xl border transition-all ${isMissing ? 'bg-white border-amber-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-75'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${isMissing ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {isMissing ? <div className="w-2 h-2 bg-amber-500 rounded-full" /> : <Check size={14} strokeWidth={3} />}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold text-sm ${isMissing ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{ing.name}</div>
                                <div className="text-xs text-slate-400 font-medium flex items-center flex-wrap gap-x-2">
                                    <span>{ing.amount} {ing.unit}</span>
                                    {ing.calories && <span>• {ing.calories} kcal</span>}
                                    {ing.protein && <span className="text-emerald-600 font-bold">• {ing.protein}g P</span>}
                                    {ing.carbs && <span className="text-amber-600 font-bold">• {ing.carbs}g C</span>}
                                    {ing.fat && <span className="text-rose-600 font-bold">• {ing.fat}g F</span>}
                                </div>
                            </div>
                            {isMissing && <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded-md">Need</span>}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent z-30 pt-12">
        {recipe.missingIngredients.length > 0 ? (
            <button 
                onClick={onShop}
                className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <ShoppingCart size={20} /> Order on Instacart
            </button>
        ) : (
            <button 
                onClick={onCook}
                className="w-full py-4 bg-emerald-500 text-white rounded-[20px] font-bold text-lg shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-400"
            >
                <ChefHat size={20} /> Start Cooking Mode
            </button>
        )}
      </div>

      {/* SOUS CHEF CHAT */}
      {isChatOpen && (
          <div className="absolute inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
             <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                 <h3 className="font-bold text-slate-900">Sous Chef</h3>
                 <button onClick={() => setIsChatOpen(false)}><X size={24}/></button>
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-4">
                 {chatMessages.map(msg => (
                     <div key={msg.id} className={`p-3 rounded-xl max-w-[80%] text-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white ml-auto' : 'bg-white border text-slate-700 shadow-sm'}`}>{msg.text}</div>
                 ))}
                 <div ref={chatEndRef} />
             </div>
             <div className="p-4 bg-white border-t flex gap-2">
                 <input className="flex-1 bg-slate-100 p-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="Ask Chef..." />
                 <button onClick={handleSendMessage} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200"><Send size={20}/></button>
             </div>
          </div>
      )}

    </div>
  );
};

const NutritionPill = ({ value, label, unit, color }: any) => (
    <div className={`rounded-2xl p-3 flex flex-col items-center justify-center w-full h-full ${color}`}>
        <span className="text-xl font-black">{value}<span className="text-xs font-bold opacity-70 ml-0.5">{unit}</span></span>
        <span className="text-[10px] font-bold uppercase opacity-70">{label}</span>
    </div>
);

const NutritionRow = ({ label, value, unit, daily, bold, noBorder }: any) => (
    <div className={`flex justify-between py-1 ${!noBorder ? 'border-b border-slate-200' : ''}`}>
        <div className="flex gap-1">
            <span className={`${bold ? 'font-black' : 'font-medium'}`}>{label}</span>
            <span className="text-slate-500">{value}{unit}</span>
        </div>
        {daily && <span className="font-bold text-slate-900">{daily}%</span>}
    </div>
);

export default RecipeDetail;

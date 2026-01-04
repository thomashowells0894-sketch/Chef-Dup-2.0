import React, { useState, useEffect } from 'react';
import { MealPlanEntry, Recipe } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Wand2, ArrowLeft, Plus } from 'lucide-react';

interface MealPlannerProps {
  plan: MealPlanEntry[];
  onAutoGenerate: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
  isLoading: boolean;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ 
  plan, 
  onAutoGenerate, 
  onSelectRecipe, 
  onBack,
  isLoading 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Generate dates for current week view (starting today)
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() + i);
    return d;
  });

  const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
  const getDayNum = (date: Date) => date.getDate();
  const getIsoDate = (date: Date) => date.toISOString().split('T')[0];

  const getMealsForDate = (date: Date) => {
    const iso = getIsoDate(date);
    return plan.filter(p => p.date === iso);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={20} className="text-emerald-600" /> Meal Planner
            </h1>
            <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Date Strip */}
        <div className="flex justify-between items-center gap-2 overflow-x-auto pb-2">
            {dates.map((date, idx) => {
                const isToday = getIsoDate(new Date()) === getIsoDate(date);
                return (
                    <div 
                        key={idx} 
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[60px] border ${
                            isToday ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-100'
                        }`}
                    >
                        <span className="text-xs font-bold uppercase opacity-80">{getDayName(date)}</span>
                        <span className="text-lg font-bold">{getDayNum(date)}</span>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
         {/* Magic Plan CTA */}
         {plan.length === 0 && (
             <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg text-center">
                 <Wand2 size={40} className="mx-auto mb-3 text-yellow-300" />
                 <h2 className="text-xl font-bold mb-2">Plan your week in seconds</h2>
                 <p className="text-indigo-100 mb-6 text-sm">NutriChef analyzes your pantry to create a zero-waste meal plan.</p>
                 <button 
                    onClick={onAutoGenerate}
                    disabled={isLoading}
                    className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center gap-2 mx-auto"
                 >
                    {isLoading ? 'Generating...' : 'Auto-Generate Plan'}
                 </button>
             </div>
         )}

         {/* Daily Views */}
         {dates.map((date) => {
             const meals = getMealsForDate(date);
             const dateStr = getIsoDate(date);
             const isToday = getIsoDate(new Date()) === dateStr;
             
             return (
                 <div key={dateStr} className="animate-in slide-in-from-bottom-4 duration-500">
                     <h3 className={`font-bold mb-3 ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                         {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                     </h3>
                     
                     <div className="space-y-3">
                         {/* Slots */}
                         {['Dinner'].map((type) => {
                             const meal = meals.find(m => m.mealType === type.toLowerCase());
                             return (
                                 <div key={type} className="flex gap-4">
                                     <div className="w-16 pt-3 text-xs font-bold text-slate-400 uppercase text-right">
                                         {type}
                                     </div>
                                     <div className="flex-1">
                                         {meal ? (
                                             <div 
                                                onClick={() => onSelectRecipe(meal.recipe)}
                                                className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                                             >
                                                 <img src={meal.recipe.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                                                 <div className="flex-1 py-1">
                                                     <div className="text-sm font-bold text-slate-900 line-clamp-1">{meal.recipe.title}</div>
                                                     <div className="text-xs text-slate-500 mt-1">{meal.recipe.calories} kcal • {meal.recipe.prepTimeMinutes} min</div>
                                                 </div>
                                             </div>
                                         ) : (
                                             <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 gap-2">
                                                 <Plus size={16} /> <span className="text-sm font-medium">Add Meal</span>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )
                         })}
                     </div>
                 </div>
             );
         })}
         
         <div className="h-20" /> {/* Spacer */}
      </div>
    </div>
  );
};

export default MealPlanner;
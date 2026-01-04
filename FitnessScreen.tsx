
import React, { useState, useMemo } from 'react';
import { WORKOUT_PLANS } from '../services/fitnessService';
import { WorkoutPlan, WorkoutCategory } from '../types';
import { Dumbbell, ArrowLeft, Flame, Timer, Activity, Plus, BarChart2, Search, Filter, Tag, Play } from 'lucide-react';

interface FitnessScreenProps {
  onBack: () => void;
  onStartPlan: (plan: WorkoutPlan | null) => void;
  recentLogs: any[]; // Pass logs to show history
}

type FilterCategory = 'All' | WorkoutCategory;

const FitnessScreen: React.FC<FitnessScreenProps> = ({ onBack, onStartPlan, recentLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('All');
  
  // Fake data for activity chart logic
  const activityData = [45, 60, 20, 30, 90, 45, 10];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const filteredPlans = useMemo(() => {
      return WORKOUT_PLANS.filter(plan => {
          const matchesSearch = plan.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                plan.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesCategory = activeCategory === 'All' || plan.category === activeCategory;
          return matchesSearch && matchesCategory;
      });
  }, [searchQuery, activeCategory]);

  const categories: FilterCategory[] = ['All', 'Strength', 'Yoga', 'HIIT', 'Calisthenics', 'Cardio'];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="p-6 pb-2 relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm font-bold uppercase tracking-wider transition-colors">
            <ArrowLeft size={16} /> Dashboard
        </button>
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">FITNESS+</h1>
                <p className="text-indigo-400 text-sm font-medium tracking-wide">Train like a pro.</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-white/10">
                <Dumbbell size={24} className="text-white" />
            </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-white/5 rounded-xl flex items-center px-4 border border-white/10 focus-within:border-indigo-500 focus-within:bg-white/10 transition-all">
                <Search size={18} className="text-slate-400" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search workouts..."
                    className="w-full bg-transparent border-none focus:outline-none p-3 text-sm placeholder:text-slate-400 font-medium text-white"
                />
            </div>
        </div>
        
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                        activeCategory === cat 
                        ? 'bg-white text-slate-950 border-white shadow-lg shadow-white/10' 
                        : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 relative z-10">
        {/* Activity Chart (Only show if not searching) */}
        {!searchQuery && activeCategory === 'All' && (
            <div className="mx-6 mt-2 mb-8 bg-slate-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                        <Activity size={14} /> Activity
                    </div>
                    <div className="text-right">
                         <div className="text-2xl font-black text-white leading-none">325<span className="text-sm text-slate-500 ml-1">min</span></div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase">This Week</div>
                    </div>
                </div>
                
                <div className="flex justify-between items-end h-28 gap-3">
                    {activityData.map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 group cursor-pointer">
                            <div className="w-full relative flex items-end justify-center h-full bg-slate-800/50 rounded-lg overflow-hidden">
                                <div 
                                    style={{ height: `${(val / 90) * 100}%` }} 
                                    className={`w-full transition-all duration-700 ease-out ${
                                        val > 0 
                                        ? 'bg-gradient-to-t from-indigo-600 via-purple-500 to-indigo-400 opacity-80 group-hover:opacity-100' 
                                        : 'bg-transparent'
                                    }`}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-white transition-colors">{days[i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Start Fresh */}
        <div className="px-6 mb-8">
            <button 
                onClick={() => onStartPlan(null)}
                className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg active:scale-98 transition-all hover:border-slate-600 group"
            >
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                    <Plus size={18} strokeWidth={3} />
                </div>
                <span>Start Empty Workout</span>
            </button>
        </div>

        {/* Plans List */}
        <div className="px-6">
            <h2 className="text-white font-black text-xl mb-4 flex items-center gap-3 tracking-tight">
                {activeCategory === 'All' ? 'Browse Programs' : `${activeCategory} Programs`} 
                <span className="text-xs font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">{filteredPlans.length}</span>
            </h2>
            
            <div className="space-y-5">
                {filteredPlans.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                        <Filter size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">No workouts found.</p>
                    </div>
                ) : (
                    filteredPlans.map(plan => (
                        <div 
                            key={plan.id}
                            onClick={() => onStartPlan(plan)}
                            className="bg-slate-900 relative group cursor-pointer rounded-3xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-900/20 active:scale-[0.98]"
                        >
                            {/* Decorative Background Gradient */}
                            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${
                                plan.category === 'Yoga' ? 'from-purple-500 to-indigo-900' :
                                plan.category === 'Strength' ? 'from-emerald-500 to-slate-900' :
                                plan.category === 'HIIT' ? 'from-orange-500 to-red-900' :
                                'from-blue-500 to-slate-900'
                            }`} />

                            <div className="relative z-10 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2">
                                        <Badge label={plan.category} color={
                                            plan.category === 'Yoga' ? 'purple' :
                                            plan.category === 'Strength' ? 'emerald' :
                                            plan.category === 'HIIT' ? 'orange' : 'blue'
                                        } />
                                        <Badge label={plan.difficulty} outline />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-white group-hover:text-black transition-colors">
                                        <Play size={14} fill="currentColor" />
                                    </div>
                                </div>
                                
                                <h3 className="text-2xl font-black text-white mb-2 leading-tight group-hover:text-indigo-200 transition-colors">
                                    {plan.title}
                                </h3>
                                <p className="text-slate-400 text-sm mb-6 line-clamp-2 font-medium leading-relaxed">{plan.description}</p>
                                
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-4 border-t border-white/5">
                                    <span className="flex items-center gap-1.5 text-slate-300">
                                        <Timer size={14} className="text-slate-500" /> {plan.durationMinutes} MIN
                                    </span>
                                    <span className="flex items-center gap-1.5 text-slate-300">
                                        <Dumbbell size={14} className="text-slate-500" /> {plan.exercises.length} MOVES
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const Badge = ({ label, color = 'slate', outline = false }: { label: string, color?: string, outline?: boolean }) => {
    const colors: any = {
        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
        emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
        orange: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
        slate: 'bg-slate-500/20 text-slate-300 border-slate-500/20',
    };

    const style = colors[color] || colors.slate;

    return (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${outline ? 'bg-transparent border-white/20 text-slate-400' : style}`}>
            {label}
        </span>
    );
};

export default FitnessScreen;

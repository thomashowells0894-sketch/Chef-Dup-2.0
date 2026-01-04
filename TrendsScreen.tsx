
import React, { useMemo } from 'react';
import { UserProfile, MealPlanEntry } from '../types';
import { calculateDynamicTDEE } from '../services/coachService';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, Target, Activity, Image as ImageIcon, Download, Table, Droplet, Zap, Citrus, BrainCircuit, ArrowRight } from 'lucide-react';

interface TrendsScreenProps {
  profile: UserProfile;
  mealHistory: MealPlanEntry[];
  onBack: () => void;
  onOpenGallery: () => void; 
  onExportData: () => void;
}

export const TrendsScreen: React.FC<TrendsScreenProps> = ({ profile, mealHistory, onBack, onOpenGallery, onExportData }) => {
  
  // --- Coach Logic ---
  const coachRec = useMemo(() => calculateDynamicTDEE(profile, mealHistory), [profile, mealHistory]);

  // --- Weight Logic ---
  const weightData = profile.weightHistory.length > 0 
    ? profile.weightHistory.slice(-7) // Last 7 entries
    : [{ date: new Date().toISOString().split('T')[0], weight: profile.weightKg }];
  
  const minWeight = Math.min(...weightData.map(d => d.weight)) - 1;
  const maxWeight = Math.max(...weightData.map(d => d.weight)) + 1;
  const weightRange = maxWeight - minWeight || 1; // Avoid divide by zero

  // --- Calorie Logic ---
  const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
  });

  const calorieData = last7Days.map(dateStr => {
      const dayMeals = mealHistory.filter(m => m.date === dateStr);
      const total = dayMeals.reduce((acc, m) => acc + m.recipe.calories, 0);
      return { date: dateStr, total };
  });

  const maxCals = Math.max(Math.max(...calorieData.map(c => c.total)), profile.dailyCalorieGoal) * 1.1;

  // --- Micro Logic (Today) ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeals = mealHistory.filter(m => m.date === todayStr);
  const micros = todayMeals.reduce((acc, m) => {
      acc.iron += m.recipe.iron || 0;
      acc.calcium += m.recipe.calcium || 0;
      acc.vitC += m.recipe.vitaminC || 0;
      acc.potassium += m.recipe.potassium || 0;
      return acc;
  }, { iron: 0, calcium: 0, vitC: 0, potassium: 0 });

  // --- SVG Helpers ---
  const svgHeight = 150;
  const svgWidth = 300;
  
  // Generate Line Path for Weight
  const weightPoints = weightData.map((d, i) => {
      const x = (i / (weightData.length - 1 || 1)) * svgWidth;
      const y = svgHeight - ((d.weight - minWeight) / weightRange) * svgHeight;
      return `${x},${y}`;
  }).join(' ');

  // Current Trend calculation
  const startWeight = weightData[0].weight;
  const currentWeight = profile.weightKg;
  const weightDiff = currentWeight - startWeight;

  const MicroRow = ({ label, value, target, unit, icon: Icon, color }: any) => {
      const pct = Math.min((value / target) * 100, 100);
      return (
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.bg} ${color.text}`}>
                  <Icon size={16} />
              </div>
              <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className="text-slate-400">{value} / {target}{unit}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color.bar} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
              </div>
          </div>
      )
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm z-10">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-black text-slate-900">Trends & Insights</h1>
            </div>
            
            <button 
                onClick={onOpenGallery}
                className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
            >
                <ImageIcon size={20} />
            </button>
        </div>
        <p className="text-slate-500 text-sm pl-2">Your progress over the last 7 days.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* NEW: Smart Coach Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <BrainCircuit size={20} />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider">Smart Coach</span>
                </div>
                {coachRec.direction !== 'maintain' && (
                    <div className="bg-white text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                        Action Needed
                    </div>
                )}
            </div>
            
            <div className="mb-4">
                <div className="text-3xl font-black mb-1">{coachRec.newCalorieTarget} <span className="text-base font-bold opacity-80">kcal</span></div>
                <p className="text-indigo-100 text-sm leading-relaxed">{coachRec.reason}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-xs font-bold opacity-70 uppercase tracking-wide">
                    Trend: {coachRec.weeklyChangeKg > 0 ? '+' : ''}{coachRec.weeklyChangeKg.toFixed(2)} kg/wk
                </div>
                <button className="flex items-center gap-1 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                    Apply New Target <ArrowRight size={12} />
                </button>
            </div>
        </div>

        {/* Weight Chart Card */}
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="text-indigo-500" size={20} /> Weight Trend
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-3xl font-black text-slate-900">{profile.weightKg}</span>
                        <span className="text-sm font-bold text-slate-400">kg</span>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            weightDiff < 0 ? 'bg-emerald-100 text-emerald-700' : weightDiff > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {weightDiff < 0 ? <TrendingDown size={12} /> : weightDiff > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
                            {Math.abs(weightDiff).toFixed(1)} kg
                        </div>
                    </div>
                </div>
            </div>

            {/* SVG Line Chart */}
            <div className="relative h-48 w-full">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    <line x1="0" y1="0" x2={svgWidth} y2="0" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="0" y1={svgHeight/2} x2={svgWidth} y2={svgHeight/2} stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="0" y1={svgHeight} x2={svgWidth} y2={svgHeight} stroke="#f1f5f9" strokeWidth="2" />

                    {/* The Line */}
                    <path 
                        d={`M ${weightPoints}`} 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                    
                    {/* Gradient Area under line */}
                    <path 
                        d={`M ${weightPoints} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`} 
                        fill="url(#weightGradient)" 
                        opacity="0.2"
                    />

                    {/* Data Points */}
                    {weightData.map((d, i) => {
                         const x = (i / (weightData.length - 1 || 1)) * svgWidth;
                         const y = svgHeight - ((d.weight - minWeight) / weightRange) * svgHeight;
                         return (
                             <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#6366f1" strokeWidth="3" />
                         );
                    })}

                    <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>
                
                {/* X-Axis Labels */}
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase">
                    {weightData.map((d, i) => (
                        <span key={i}>{new Date(d.date).toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    ))}
                </div>
            </div>
        </div>

        {/* Calorie Consistency Card */}
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Target className="text-emerald-500" size={20} /> Calorie Consistency
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Goal: {profile.dailyCalorieGoal} kcal</p>
                </div>
            </div>

            <div className="relative h-48 w-full">
                <div className="flex items-end justify-between h-full gap-2">
                    {calorieData.map((d, i) => {
                        const heightPercent = (d.total / maxCals) * 100;
                        const isOver = d.total > profile.dailyCalorieGoal + 100;
                        const isUnder = d.total < profile.dailyCalorieGoal - 300;
                        const isGood = !isOver && !isUnder;

                        let barColor = 'bg-slate-200';
                        if (d.total > 0) {
                            if (isGood) barColor = 'bg-emerald-500';
                            else if (isOver) barColor = 'bg-orange-400';
                            else barColor = 'bg-blue-400';
                        }

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                {d.total > 0 && (
                                    <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-4">
                                        {d.total}
                                    </div>
                                )}
                                <div className="w-full bg-slate-100 rounded-t-lg relative h-full flex items-end overflow-hidden">
                                     {/* Goal Line Indicator */}
                                     <div 
                                        className="absolute w-full border-t border-dashed border-slate-300 z-10" 
                                        style={{ bottom: `${(profile.dailyCalorieGoal / maxCals) * 100}%` }} 
                                     />
                                     
                                     <div 
                                        style={{ height: `${heightPercent}%` }} 
                                        className={`w-full rounded-t-lg transition-all duration-500 ${barColor}`}
                                     />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {new Date(d.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Micro-Nutrients (Feature 4) */}
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Droplet className="text-blue-500" size={20} /> Daily Micros
            </h2>
            <div className="space-y-4">
                <MicroRow 
                    label="Iron" 
                    value={micros.iron.toFixed(1)} 
                    target={18} 
                    unit="mg" 
                    icon={Target} 
                    color={{ bg: 'bg-red-50', text: 'text-red-500', bar: 'bg-red-500' }} 
                />
                <MicroRow 
                    label="Calcium" 
                    value={micros.calcium.toFixed(0)} 
                    target={1000} 
                    unit="mg" 
                    icon={Zap} 
                    color={{ bg: 'bg-blue-50', text: 'text-blue-500', bar: 'bg-blue-500' }} 
                />
                <MicroRow 
                    label="Vitamin C" 
                    value={micros.vitC.toFixed(0)} 
                    target={90} 
                    unit="mg" 
                    icon={Citrus} 
                    color={{ bg: 'bg-orange-50', text: 'text-orange-500', bar: 'bg-orange-500' }} 
                />
                <MicroRow 
                    label="Potassium" 
                    value={micros.potassium.toFixed(0)} 
                    target={3500} 
                    unit="mg" 
                    icon={Activity} 
                    color={{ bg: 'bg-emerald-50', text: 'text-emerald-500', bar: 'bg-emerald-500' }} 
                />
            </div>
        </div>

        {/* Export Data CTA (Feature 4) */}
        <button 
            onClick={onExportData}
            className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-50 transition-colors shadow-sm"
        >
            <Download size={20} /> Export Data (CSV)
        </button>

    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Activity, Target, ChevronRight, Calculator, Flame, Dumbbell, Apple, Utensils, RefreshCw, X, Leaf, Zap, WheatOff, Pizza, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ActivityLevel, FitnessGoal, Gender, UserProfile } from '../types';

interface OnboardingScreenProps {
  onComplete: (name: string, diet: { isVegan: boolean, isKeto: boolean, isGlutenFree: boolean }, biometrics?: Partial<UserProfile>) => void;
}

// Steps
// 1. Name
// 2. Biometrics (Gender, Age, Height, Weight)
// 3. Activity Level
// 4. Goal
// 5. Diet Preferences
// 6. The Blueprint (Review & Adjust)

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [animDir, setAnimDir] = useState('right'); // 'right' or 'left'
  
  // Data State
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState<number>(30);
  const [height, setHeight] = useState<number>(175); // cm
  const [weight, setWeight] = useState<number>(75); // kg
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<FitnessGoal>('maintain');
  const [diet, setDiet] = useState({ isVegan: false, isKeto: false, isGlutenFree: false });
  
  // Calculated State
  const [tdee, setTdee] = useState(2000);
  const [dailyCalories, setDailyCalories] = useState(2000);
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [trainingDays, setTrainingDays] = useState<3 | 4 | 5>(4); // New State for split preference

  const nextStep = () => {
    setAnimDir('right');
    // Pre-calculate plan before showing step 6
    if (step === 5) {
        calculatePlan(4); // Default to 4 days initially
    }
    setStep(s => s + 1);
  };

  const prevStep = () => {
      setAnimDir('left');
      setStep(s => s - 1);
  };

  const handleSkip = () => {
      // If skipping step 1 (Name), set a default
      if (step === 1 && !name.trim()) {
          setName("Chef");
      }
      
      if (step === 5) {
          calculatePlan(4);
      }
      setAnimDir('right');
      setStep(s => s + 1);
  };

  const calculatePlan = (days: 3 | 4 | 5) => {
      setTrainingDays(days);

      // 1. Calculate BMR (Mifflin-St Jeor)
      let bmr = 0;
      if (gender === 'male') {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      } else {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      }

      // 2. TDEE Multiplier
      const multipliers: Record<ActivityLevel, number> = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          active: 1.725,
          athlete: 1.9
      };
      const rawTdee = Math.round(bmr * multipliers[activity]);
      setTdee(rawTdee);

      // 3. Goal Adjustment (Only reset dailyCalories if not already set by user interaction in Step 6)
      if (step !== 6) {
          let target = rawTdee;
          if (goal === 'lose_weight') target -= 500;
          if (goal === 'build_muscle') target += 300;
          setDailyCalories(target);
      }

      // 4. Generate Workout Schedule based on Days
      generateSchedule(days, goal);
  };

  const generateSchedule = (days: 3 | 4 | 5, goalType: FitnessGoal) => {
    let newSchedule: Record<string, string> = {};

    if (days === 3) {
        // Full Body Split
        newSchedule = {
            'Mon': 'Full Body A',
            'Tue': 'Rest / Cardio',
            'Wed': 'Full Body B',
            'Thu': 'Rest / Yoga',
            'Fri': 'Full Body C',
            'Sat': 'Active Recovery',
            'Sun': 'Rest'
        };
    } else if (days === 4) {
        // Upper / Lower Split
        newSchedule = {
            'Mon': 'Upper Body Power',
            'Tue': 'Lower Body Power',
            'Wed': 'Rest / Cardio',
            'Thu': 'Upper Body Hypertrophy',
            'Fri': 'Lower Body Hypertrophy',
            'Sat': 'Active Recovery',
            'Sun': 'Rest'
        };
    } else {
        // Body Part Split / PPL
        newSchedule = {
            'Mon': 'Push (Chest/Tris)',
            'Tue': 'Pull (Back/Bis)',
            'Wed': 'Legs & Core',
            'Thu': 'Push (Shoulders)',
            'Fri': 'Pull (Accessories)',
            'Sat': 'Legs / Cardio',
            'Sun': 'Rest'
        };
    }

    setSchedule(newSchedule);
  };

  const handleFinish = () => {
      onComplete(name, diet, {
          age, gender, heightCm: height, weightKg: weight,
          activityLevel: activity, goal,
          dailyCalorieGoal: dailyCalories,
          // Rough Macro splits
          dailyProteinGoal: Math.round((dailyCalories * 0.3) / 4),
          dailyCarbGoal: Math.round((dailyCalories * 0.4) / 4),
          dailyFatGoal: Math.round((dailyCalories * 0.3) / 9),
          workoutSchedule: schedule
      });
  };

  const toggleDiet = (key: keyof typeof diet) => {
      setDiet(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearDiet = () => {
      setDiet({ isVegan: false, isKeto: false, isGlutenFree: false });
  };

  const hasDietPreferences = diet.isVegan || diet.isKeto || diet.isGlutenFree;

  // --- Helper for Step 6 Visualization ---
  const getCalorieContext = () => {
      const diff = dailyCalories - tdee;
      if (diff > 100) return { label: 'Surplus', color: 'text-emerald-400', icon: TrendingUp, desc: 'Optimized for Muscle Gain' };
      if (diff < -100) return { label: 'Deficit', color: 'text-orange-400', icon: TrendingDown, desc: 'Optimized for Fat Loss' };
      return { label: 'Maintenance', color: 'text-blue-400', icon: Minus, desc: 'Optimized for Recomp' };
  };

  const getWeightProjection = () => {
      const diff = dailyCalories - tdee;
      const weeklyChangeKg = (diff * 7) / 7700; // ~7700 kcal per kg of fat
      const sign = weeklyChangeKg > 0 ? '+' : '';
      return `${sign}${weeklyChangeKg.toFixed(2)} kg / week`;
  };

  const context = getCalorieContext();

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-600 rounded-full blur-[140px] opacity-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[140px] opacity-10 translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Header / Progress */}
      <div className="p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {step > 1 && (
                <button onClick={prevStep} className="text-slate-400 hover:text-white transition-colors text-sm font-bold">
                    Back
                </button>
            )}
            <div className="flex gap-1">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i <= step ? 'bg-emerald-500 scale-110' : 'bg-slate-700'}`} />
                ))}
            </div>
          </div>
          
          {step < 6 && (
              <button 
                onClick={handleSkip} 
                className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                  Skip
              </button>
          )}
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 z-10 overflow-y-auto">
        <div key={step} className={`animate-in ${animDir === 'right' ? 'slide-in-from-right' : 'slide-in-from-left'} duration-300 fade-in`}>
            
            {/* STEP 1: NAME */}
            {step === 1 && (
                <div className="space-y-6">
                    <h1 className="text-4xl font-bold leading-tight">Let's build your<br/><span className="text-emerald-400">Perfect Program.</span></h1>
                    <p className="text-slate-400 text-lg">First, what should we call you?</p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full bg-transparent border-b-2 border-slate-700 py-4 text-3xl font-bold focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-slate-700"
                        autoFocus
                    />
                </div>
            )}

            {/* STEP 2: BIOMETRICS */}
            {step === 2 && (
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">The Basics</h1>
                        <p className="text-slate-400">We use this to calculate your metabolism (BMR).</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                             <div className="flex bg-slate-800 rounded-xl p-1">
                                 {(['male', 'female'] as Gender[]).map(g => (
                                     <button 
                                        key={g} 
                                        onClick={() => setGender(g)}
                                        className={`flex-1 py-3 rounded-lg font-bold capitalize transition-all ${gender === g ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {g}
                                    </button>
                                 ))}
                             </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Age</label>
                             <input type="number" value={age} onChange={e => setAge(parseInt(e.target.value))} className="w-full bg-slate-800 rounded-xl p-4 text-center font-bold text-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                             <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase">Height</label>
                                <span className="text-emerald-400 font-bold">{height} cm</span>
                             </div>
                             <input type="range" min="140" max="220" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase">Weight</label>
                                <span className="text-emerald-400 font-bold">{weight} kg</span>
                             </div>
                             <input type="range" min="40" max="150" value={weight} onChange={e => setWeight(parseInt(e.target.value))} className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: ACTIVITY */}
            {step === 3 && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">How active are you?</h1>
                        <p className="text-slate-400">Be honest! This determines your daily burn.</p>
                    </div>
                    <div className="space-y-3">
                        <ActivityCard 
                            active={activity === 'sedentary'} 
                            onClick={() => setActivity('sedentary')}
                            title="Sedentary"
                            desc="Desk job, little to no exercise."
                            emoji="🛋️"
                        />
                        <ActivityCard 
                            active={activity === 'light'} 
                            onClick={() => setActivity('light')}
                            title="Lightly Active"
                            desc="1-3 days of exercise/week."
                            emoji="🚶"
                        />
                         <ActivityCard 
                            active={activity === 'moderate'} 
                            onClick={() => setActivity('moderate')}
                            title="Moderately Active"
                            desc="3-5 days of exercise/week."
                            emoji="🏃"
                        />
                         <ActivityCard 
                            active={activity === 'active'} 
                            onClick={() => setActivity('active')}
                            title="Very Active"
                            desc="6-7 days of hard exercise."
                            emoji="🔥"
                        />
                    </div>
                </div>
            )}

             {/* STEP 4: GOAL */}
             {step === 4 && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">What is your goal?</h1>
                        <p className="text-slate-400">We will tailor your plan to this.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <GoalCard 
                            active={goal === 'lose_weight'}
                            onClick={() => setGoal('lose_weight')}
                            title="Lose Weight"
                            desc="Deficit calories to burn fat."
                            icon={Flame}
                            color="text-orange-400"
                        />
                        <GoalCard 
                            active={goal === 'build_muscle'}
                            onClick={() => setGoal('build_muscle')}
                            title="Build Muscle"
                            desc="Surplus calories for gains."
                            icon={Dumbbell}
                            color="text-emerald-400"
                        />
                         <GoalCard 
                            active={goal === 'maintain'}
                            onClick={() => setGoal('maintain')}
                            title="Maintain"
                            desc="Stay fit and healthy."
                            icon={Activity}
                            color="text-blue-400"
                        />
                    </div>
                </div>
            )}

             {/* STEP 5: DIET (UPDATED UI) */}
             {step === 5 && (
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Any dietary needs?</h1>
                        <p className="text-slate-400">Select all that apply. We will filter recipes for you.</p>
                    </div>
                    
                    {/* Main "No Restrictions" Card */}
                     <button
                        onClick={clearDiet}
                        className={`w-full p-5 rounded-3xl border-2 transition-all duration-300 flex items-center gap-5 group relative overflow-hidden ${
                            !hasDietPreferences 
                            ? 'bg-slate-800 border-emerald-500 shadow-xl shadow-emerald-900/20' 
                            : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                    >
                        {/* Glow effect */}
                        {!hasDietPreferences && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 blur-[80px] opacity-20 -mr-10 -mt-10 pointer-events-none" />}

                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-lg ${
                            !hasDietPreferences ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 group-hover:bg-slate-600'
                        }`}>
                            <Utensils size={24} />
                        </div>
                        <div className="text-left flex-1 relative z-10">
                            <div className={`font-bold text-lg mb-0.5 ${!hasDietPreferences ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>No Restrictions</div>
                            <div className="text-sm text-slate-500 group-hover:text-slate-400">I eat everything</div>
                        </div>
                        { !hasDietPreferences && (
                            <div className="bg-emerald-500 rounded-full p-1.5 animate-in zoom-in duration-300 shadow-md">
                                <Check size={16} className="text-white" strokeWidth={4} />
                            </div>
                        )}
                    </button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-slate-800/50"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900 px-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest">Or Specific Diets</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <DietCard 
                            active={diet.isVegan}
                            onClick={() => toggleDiet('isVegan')}
                            title="Plant-Based"
                            desc="Vegan friendly"
                            icon={Leaf}
                            color="bg-green-500"
                        />
                        <DietCard 
                            active={diet.isKeto}
                            onClick={() => toggleDiet('isKeto')}
                            title="Keto"
                            desc="Low carb, high fat"
                            icon={Zap}
                            color="bg-amber-500"
                        />
                        <DietCard 
                            active={diet.isGlutenFree}
                            onClick={() => toggleDiet('isGlutenFree')}
                            title="Gluten Free"
                            desc="No wheat"
                            icon={WheatOff}
                            color="bg-orange-500"
                        />
                        <DietCard 
                            active={false}
                            onClick={() => {}} // Placeholder
                            title="More Coming"
                            desc="Paleo, Whole30..."
                            icon={Pizza}
                            color="bg-slate-700"
                            isPlaceholder
                        />
                    </div>

                    {/* Quick Skip Link if they are unsure */}
                    <div className="text-center pt-2">
                        <button 
                            onClick={() => { clearDiet(); nextStep(); }}
                            className="text-slate-500 text-sm font-medium hover:text-white transition-colors border-b border-transparent hover:border-slate-500 pb-0.5"
                        >
                            I'm not sure, skip for now
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 6: THE BLUEPRINT */}
            {step === 6 && (
                <div className="space-y-6 pb-24">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Calculator size={14} /> Blueprint
                        </div>
                        <h1 className="text-3xl font-bold">Your {goal.replace('_', ' ')} Plan</h1>
                        <p className="text-slate-400 text-sm">Review and tweak your targets.</p>
                    </div>

                    {/* Smart Calorie Card */}
                    <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
                        
                        {/* Status Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${context.color}`}>
                                <context.icon size={16} /> {context.label}
                            </div>
                            <div className="bg-slate-900 px-3 py-1 rounded-lg text-xs font-medium text-slate-400 border border-slate-700">
                                Maint: {tdee}
                            </div>
                        </div>
                        
                        {/* Main Number */}
                        <div className="mb-6 flex items-baseline gap-1">
                            <span className="text-5xl font-black text-white">{dailyCalories}</span>
                            <span className="text-lg font-bold text-slate-500">kcal/day</span>
                        </div>

                        {/* Projection */}
                        <div className="bg-slate-900/50 rounded-xl p-3 mb-6 flex items-center gap-3 border border-slate-700/50">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Activity size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Projected Progress</div>
                                <div className="text-sm font-bold text-white">{getWeightProjection()}</div>
                            </div>
                        </div>

                        {/* Interactive Slider */}
                        <div className="relative z-10 mb-6">
                             <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                <span>Min</span>
                                <span>Max</span>
                            </div>
                            <input 
                                type="range" 
                                min={tdee - 1000} 
                                max={tdee + 1000} 
                                step={50}
                                value={dailyCalories} 
                                onChange={(e) => setDailyCalories(parseInt(e.target.value))} 
                                className="w-full accent-emerald-500 h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer" 
                            />
                        </div>

                        {/* Macro Visual */}
                        <div className="grid grid-cols-3 gap-1 h-2 rounded-full overflow-hidden opacity-80">
                            <div className="bg-emerald-500" style={{ width: '100%' }} />
                            <div className="bg-amber-500" style={{ width: '100%' }} />
                            <div className="bg-rose-500" style={{ width: '100%' }} />
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1 text-[10px] font-bold text-center text-slate-500 uppercase">
                            <span>Protein</span>
                            <span>Carbs</span>
                            <span>Fat</span>
                        </div>
                    </div>

                    {/* Workout Schedule Preview */}
                    <div className="bg-white rounded-3xl p-6 text-slate-900 shadow-xl border border-slate-200">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold flex items-center gap-2">
                                 <Dumbbell className="text-emerald-600" size={20} /> Weekly Routine
                             </h3>
                             
                             {/* Split Selector */}
                             <div className="flex bg-slate-100 rounded-lg p-1">
                                {[3, 4, 5].map(d => (
                                    <button 
                                        key={d}
                                        onClick={() => calculatePlan(d as 3 | 4 | 5)}
                                        className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${trainingDays === d ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                                    >
                                        {d}d
                                    </button>
                                ))}
                             </div>
                         </div>
                         
                         <div className="space-y-3">
                             {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                 <div key={day} className="flex gap-4 items-center">
                                     <div className="w-8 font-bold text-xs text-slate-400 uppercase">{day}</div>
                                     <div className="flex-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-sm font-semibold text-slate-700 flex justify-between items-center group">
                                         {schedule[day]}
                                         <div className={`w-2 h-2 rounded-full ${schedule[day].includes('Rest') ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>

                </div>
            )}
        </div>
      </div>

      <div className="p-6 bg-slate-900 border-t border-slate-800 z-20">
        <button
          onClick={step === 6 ? handleFinish : nextStep}
          disabled={step === 1 && !name.trim()}
          className="w-full py-4 bg-emerald-600 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-emerald-500"
        >
          {step === 6 ? "Let's Cook & Train" : 'Next'} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Sub Components ---

const ActivityCard = ({ active, onClick, title, desc, emoji }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
            active 
            ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
        }`}
    >
        <div className="text-2xl bg-slate-900 w-12 h-12 flex items-center justify-center rounded-lg">{emoji}</div>
        <div>
            <div className={`font-bold ${active ? 'text-emerald-400' : 'text-slate-200'}`}>{title}</div>
            <div className="text-xs opacity-70 mt-0.5">{desc}</div>
        </div>
    </button>
);

const GoalCard = ({ active, onClick, title, desc, icon: Icon, color }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all text-center ${
            active 
            ? `bg-slate-800 border-emerald-500 text-white shadow-lg` 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
        }`}
    >
        <Icon size={32} className={active ? color : 'text-slate-500'} />
        <div>
            <div className={`font-bold text-lg ${active ? 'text-white' : 'text-slate-300'}`}>{title}</div>
            <div className="text-xs opacity-70 mt-1">{desc}</div>
        </div>
    </button>
);

const DietCard = ({ active, onClick, title, desc, icon: Icon, color, isPlaceholder }: any) => {
    if (isPlaceholder) {
        return (
             <button 
                disabled
                className="p-4 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-2 text-center opacity-50 cursor-not-allowed"
            >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <Icon size={20} />
                </div>
                <div>
                    <div className="font-bold text-sm text-slate-500">{title}</div>
                    <div className="text-[10px] text-slate-600 font-medium">{desc}</div>
                </div>
            </button>
        )
    }

    return (
        <button 
            onClick={onClick}
            className={`relative p-4 rounded-2xl border-2 flex flex-col items-start gap-3 transition-all text-left overflow-hidden group w-full ${
                active 
                ? 'bg-slate-800 border-emerald-500 shadow-lg' 
                : 'bg-slate-800/50 border-transparent hover:bg-slate-800 hover:border-slate-700'
            }`}
        >
            {/* Glow effect on active */}
            {active && <div className={`absolute top-0 right-0 w-24 h-24 ${color} blur-[50px] opacity-20 -mr-6 -mt-6 pointer-events-none`} />}
            
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg ${active ? color + ' text-white' : 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'}`}>
                <Icon size={20} />
            </div>
            
            <div className="flex-1 relative z-10">
                <div className={`font-bold text-sm ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium group-hover:text-slate-400">{desc}</div>
            </div>

            {/* Checkmark for active state */}
            <div className={`absolute top-3 right-3 transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                <div className="bg-emerald-500 rounded-full p-1 shadow-md">
                    <Check size={12} className="text-white" strokeWidth={4} />
                </div>
            </div>
        </button>
    );
};

export default OnboardingScreen;

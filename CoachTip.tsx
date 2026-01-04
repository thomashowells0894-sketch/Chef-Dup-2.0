
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Zap, X, ArrowRight, Lightbulb } from 'lucide-react';

interface CoachTipProps {
  profile: UserProfile;
  remainingCalories: number;
}

const CoachTip: React.FC<CoachTipProps> = ({ profile, remainingCalories }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  // Simple heuristic logic
  let tip = "Stay consistent! You're doing great.";
  let type: 'warning' | 'success' | 'info' = 'info';

  if (remainingCalories < -200) {
      tip = "You've exceeded your calorie goal. Consider a lighter dinner or an evening walk!";
      type = 'warning';
  } else if (remainingCalories > 800) {
      tip = "You have plenty of fuel left. Make sure to hit your protein goal for recovery.";
      type = 'info';
  } else if (profile.streak.currentStreak > 3) {
      tip = `🔥 ${profile.streak.currentStreak} day streak! Keep this momentum going to build a lasting habit.`;
      type = 'success';
  }

  const styles = {
      warning: 'bg-orange-50 border-orange-100 text-orange-800',
      success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      info: 'bg-indigo-50 border-indigo-100 text-indigo-800'
  };

  const iconStyles = {
      warning: 'text-orange-500',
      success: 'text-emerald-500',
      info: 'text-indigo-500'
  };

  return (
    <div className={`mx-6 mb-6 p-4 rounded-2xl border flex items-start gap-3 relative shadow-sm animate-in slide-in-from-top duration-500 ${styles[type]}`}>
      <div className={`p-2 bg-white rounded-full shadow-sm shrink-0 ${iconStyles[type]}`}>
          <Lightbulb size={18} fill="currentColor" />
      </div>
      <div className="flex-1 pt-1">
          <div className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Smart Coach</div>
          <p className="text-sm font-medium leading-relaxed pr-6">{tip}</p>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1.5 hover:bg-black/5 rounded-full text-current opacity-50 hover:opacity-100 transition-all"
      >
          <X size={14} />
      </button>
    </div>
  );
};

export default CoachTip;

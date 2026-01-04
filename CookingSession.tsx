
import React, { useEffect, useState } from 'react';
import { Recipe } from '../types';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { Mic, ArrowLeft, CheckCircle, Volume2, SkipForward, SkipBack } from 'lucide-react';

interface CookingSessionProps {
  recipe: Recipe;
  onFinish: () => void;
  onExit: () => void;
}

const CookingSession: React.FC<CookingSessionProps> = ({ recipe, onFinish, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const currentStep = recipe.steps[currentStepIndex];
  const isLastStep = currentStepIndex === recipe.steps.length - 1;
  const progress = ((currentStepIndex + 1) / recipe.steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleRepeat = () => {
    speak(currentStep.text);
  };

  const { isListening, speak } = useVoiceAssistant({
    onNext: handleNext,
    onBack: handleBack,
    onRepeat: handleRepeat,
    enabled: true
  });

  // Auto-speak new steps
  useEffect(() => {
    speak(`Step ${currentStep.id}. ${currentStep.text}`);
  }, [currentStepIndex, currentStep, speak]);

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Immersive Background */}
      <div className="absolute inset-0 bg-slate-900 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      {/* Top Bar */}
      <div className="relative z-10 p-6 flex justify-between items-center">
        <button onClick={onExit} className="p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md">
          <ArrowLeft />
        </button>
        
        {/* Voice Status Pill */}
        <div className={`px-4 py-2 rounded-full border flex items-center gap-3 transition-all ${
            isListening 
            ? 'bg-red-500/20 border-red-500 text-red-200' 
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}>
            {isListening ? (
                <div className="flex gap-1 items-center h-4">
                    <div className="w-1 h-2 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite]"></div>
                    <div className="w-1 h-4 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.1s]"></div>
                    <div className="w-1 h-3 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.2s]"></div>
                </div>
            ) : (
                <Mic size={16} />
            )}
            <span className="text-xs font-bold uppercase tracking-wider">
                {isListening ? 'Listening...' : 'Mic Off'}
            </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto w-full">
        
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold uppercase tracking-widest border border-emerald-500/30">
            Step {currentStepIndex + 1} / {recipe.steps.length}
        </div>
        
        <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8 drop-shadow-lg transition-all duration-300">
          {currentStep.text}
        </h2>

        {currentStep.durationSeconds && (
          <div className="bg-white/10 border border-white/20 px-8 py-6 rounded-2xl flex flex-col items-center gap-2 backdrop-blur-md">
             <span className="text-6xl font-black font-mono tracking-tighter">{currentStep.durationSeconds}</span>
             <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">Seconds Timer</span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl border-t border-white/5 p-8 pb-10">
        <div className="flex items-center justify-between max-w-md mx-auto gap-6">
            <button 
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className="p-4 rounded-full bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
            >
                <SkipBack size={24} />
            </button>

            <button 
                onClick={handleRepeat}
                className="flex-1 py-4 bg-slate-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-slate-600 transition-colors"
            >
                <Volume2 size={24} />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Repeat</span>
            </button>

            <button 
                onClick={handleNext}
                className="p-6 rounded-full bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
                {isLastStep ? <CheckCircle size={32} /> : <SkipForward size={32} />}
            </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-700">
            <div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-500"
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>
      
      <style>{`
        @keyframes wave {
            0%, 100% { height: 50%; }
            50% { height: 100%; }
        }
      `}</style>
    </div>
  );
};

export default CookingSession;

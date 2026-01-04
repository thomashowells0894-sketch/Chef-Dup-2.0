
import React, { useState, useEffect } from 'react';
import { FastingState } from '../types';
import { Play, Square, Clock, Zap } from 'lucide-react';

interface FastTimerProps {
  fastingState: FastingState;
  onToggle: () => void;
  onSetTarget: (hours: number) => void;
}

const FastTimer: React.FC<FastTimerProps> = ({ fastingState, onToggle, onSetTarget }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => {
      if (fastingState.isFasting && fastingState.startTime) {
        setElapsed(Date.now() - fastingState.startTime);
      } else {
        setElapsed(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000); // Update every second
    return () => clearInterval(interval);
  }, [fastingState]);

  // Calculate Progress
  const targetMs = fastingState.targetHours * 60 * 60 * 1000;
  const progressPercent = Math.min((elapsed / targetMs) * 100, 100);
  
  // Time Formatting
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

  const formatTime = (val: number) => val.toString().padStart(2, '0');

  // SVG Ring Calculations
  const size = 100;
  const stroke = 6;
  const radius = size / 2;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100/50 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
      {/* Dynamic Background Gradient when active */}
      <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0 transition-opacity duration-500 ${fastingState.isFasting ? 'opacity-10' : ''}`} />
      
      <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md transition-transform ${fastingState.isFasting ? 'animate-pulse' : ''}`}>
                  <Clock size={20} strokeWidth={2.5} />
              </div>
              <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">Intermittent Fasting</h3>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {fastingState.isFasting ? 'Fasting Active' : 'Not Fasting'}
                  </div>
              </div>
          </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
          {/* Ring */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
             <svg height={size} width={size} className="rotate-[-90deg] absolute inset-0 w-full h-full">
                <circle stroke="#e2e8f0" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                <circle 
                    stroke="url(#fastGradient)" 
                    strokeWidth={stroke} 
                    strokeDasharray={circumference + ' ' + circumference} 
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }} 
                    strokeLinecap="round"
                    fill="transparent" 
                    r={normalizedRadius} 
                    cx={radius} 
                    cy={radius} 
                />
                <defs>
                    <linearGradient id="fastGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                 {fastingState.isFasting ? (
                     <div className="text-center">
                         <div className="text-[10px] font-bold text-slate-400">{Math.round(progressPercent)}%</div>
                         <Zap size={12} className="text-indigo-500 mx-auto fill-indigo-500" />
                     </div>
                 ) : (
                     <div className="text-xs font-bold text-slate-300">Ready</div>
                 )}
            </div>
          </div>

          {/* Controls & Time */}
          <div className="flex-1">
             {fastingState.isFasting ? (
                 <div className="mb-2">
                     <div className="text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                         {hours}:{formatTime(minutes)}:{formatTime(seconds)}
                     </div>
                     <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                         Target: {fastingState.targetHours}h
                     </div>
                 </div>
             ) : (
                 <div className="flex gap-1 mb-3">
                     {[13, 16, 18, 20].map(h => (
                         <button 
                            key={h}
                            onClick={() => onSetTarget(h)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${fastingState.targetHours === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200'}`}
                         >
                             {h}:{(24-h)}
                         </button>
                     ))}
                 </div>
             )}
             
             <button 
                onClick={onToggle}
                className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    fastingState.isFasting 
                    ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500' 
                    : 'bg-slate-900 text-white shadow-lg shadow-indigo-500/20'
                }`}
             >
                 {fastingState.isFasting ? (
                     <><Square size={12} fill="currentColor" /> End Fast</>
                 ) : (
                     <><Play size={12} fill="currentColor" /> Start Fast</>
                 )}
             </button>
          </div>
      </div>
    </div>
  );
};

export default FastTimer;

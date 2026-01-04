
import React, { useState, useEffect } from 'react';
import { WorkoutPlan, WorkoutSession, WorkoutExercise, Exercise, WorkoutSet } from '../types';
import { EXERCISE_DB, getExerciseById, calculateCaloriesBurned } from '../services/fitnessService';
import { ArrowLeft, Plus, Check, Save, Clock, Trash2, Search, X, Play, Pause, RotateCcw, MessageSquare, AlignLeft } from 'lucide-react';

interface ActiveWorkoutProps {
  plan: WorkoutPlan | null;
  onFinish: (session: WorkoutSession) => void;
  onExit: () => void;
}

const ActiveWorkoutScreen: React.FC<ActiveWorkoutProps> = ({ plan, onFinish, onExit }) => {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);
  
  // Rest Timer State
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Initialize from plan or empty
  useEffect(() => {
    if (plan) {
      const initialExercises: WorkoutExercise[] = plan.exercises.map(pe => {
        const exerciseDef = getExerciseById(pe.exerciseId);
        if (!exerciseDef) return null;
        
        // Create empty sets based on target
        const sets: WorkoutSet[] = Array.from({ length: pe.targetSets }).map((_, i) => ({
            id: `set_${Date.now()}_${i}`,
            reps: pe.targetReps,
            weight: 0,
            completed: false
        }));

        return {
            id: `we_${Date.now()}_${pe.exerciseId}`,
            exercise: exerciseDef,
            sets
        };
      }).filter(Boolean) as WorkoutExercise[];
      setExercises(initialExercises);
    }
  }, [plan]);

  // Main Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Rest Timer Logic
  useEffect(() => {
      let interval: any;
      if (isResting && restTimer > 0) {
          interval = setInterval(() => {
              setRestTimer(prev => prev - 1);
          }, 1000);
      } else if (restTimer === 0 && isResting) {
          setIsResting(false);
          // Play a sound here in real app
      }
      return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const startRest = (seconds: number) => {
      setRestTimer(seconds);
      setIsResting(true);
  };

  const formatTime = (totalSeconds: number) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAddSet = (exerciseIndex: number) => {
      const updated = [...exercises];
      const prevSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
      updated[exerciseIndex].sets.push({
          id: `set_${Date.now()}`,
          reps: prevSet ? prevSet.reps : 10,
          weight: prevSet ? prevSet.weight : 0,
          completed: false
      });
      setExercises(updated);
  };

  const handleUpdateSet = (exIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) => {
      const updated = [...exercises];
      updated[exIndex].sets[setIndex] = {
          ...updated[exIndex].sets[setIndex],
          [field]: value
      };
      setExercises(updated);
  };

  const toggleSetNote = (exIndex: number, setIndex: number) => {
    const updated = [...exercises];
    const currentSet = updated[exIndex].sets[setIndex];
    
    // If note is undefined, initialize it to empty string to show input
    // If it exists, we assume user wants to close it only if it's empty? 
    // Or just strictly toggle logic. Let's strictly toggle visibility via state presence.
    
    if (currentSet.note === undefined) {
        currentSet.note = "";
    } else {
        // If user toggles off, and text is empty, remove the field to clean up
        if (currentSet.note.trim() === "") {
            delete currentSet.note;
        } else {
            // If text exists, do we hide it? No, let's keep it visible but maybe minimized in future.
            // For now, let's treat the button as an "Open/Close" toggle, but save data if present.
            // Actually, simpler UX: Button opens input. 
            // If they want to close it, they can leave it? 
            // Let's make the button remove the note field if clicked again (toggle).
             delete currentSet.note;
        }
    }
    setExercises(updated);
  };

  const toggleSetComplete = (exIndex: number, setIndex: number) => {
      const updated = [...exercises];
      const isComplete = !updated[exIndex].sets[setIndex].completed;
      updated[exIndex].sets[setIndex].completed = isComplete;
      setExercises(updated);

      if (isComplete) {
          const restTime = updated[exIndex].exercise.defaultRestSeconds || 60;
          if (restTime > 0) {
              startRest(restTime);
          }
      }
  };

  const handleAddExercise = (exercise: Exercise) => {
      const newEx: WorkoutExercise = {
          id: `we_${Date.now()}`,
          exercise,
          sets: [
              { id: `set_${Date.now()}`, reps: 10, weight: 0, completed: false }
          ]
      };
      setExercises([...exercises, newEx]);
      setShowAddExercise(false);
  };

  const handleFinish = () => {
      const session: WorkoutSession = {
          id: `session_${Date.now()}`,
          date: new Date().toISOString(),
          exercises,
          totalVolume: exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0),
          durationSeconds: elapsed,
          caloriesBurned: 0 // Will calc below
      };
      session.caloriesBurned = calculateCaloriesBurned(session);
      onFinish(session);
  };

  return (
    <div className="flex flex-col h-screen bg-white relative">
      {/* Rest Timer Overlay */}
      {isResting && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/90 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-top duration-300 backdrop-blur-md border border-slate-700">
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resting</span>
                  <span className="text-2xl font-mono font-bold">{formatTime(restTimer)}</span>
              </div>
              <div className="h-8 w-px bg-slate-700"></div>
              <div className="flex gap-2">
                  <button onClick={() => setRestTimer(t => t + 30)} className="p-2 hover:bg-slate-700 rounded-full text-slate-300"><Plus size={16}/></button>
                  <button onClick={() => setIsResting(false)} className="p-2 hover:bg-red-900/50 rounded-full text-red-400"><X size={16}/></button>
              </div>
          </div>
      )}

      {/* Enhanced Header with Prominent Timer */}
      <div className="bg-slate-900 text-white px-4 py-6 flex justify-between items-start shadow-xl z-20 border-b border-slate-800">
        <div className="flex-1">
            <button onClick={onExit} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
            </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center -mt-2">
            <div className="flex items-center gap-2 text-emerald-400 mb-1 opacity-90">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Active</span>
            </div>
            <div className="text-4xl font-mono font-black tracking-tight tabular-nums text-white drop-shadow-lg">
                {formatTime(elapsed)}
            </div>
        </div>
        
        <div className="flex-1 flex justify-end">
             <button 
                onClick={handleFinish}
                className="bg-emerald-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95 transition-all"
            >
                Finish
            </button>
        </div>
      </div>

      {/* Main Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {plan && <div className="text-xl font-bold text-slate-900 px-2">{plan.title}</div>}
          
          {exercises.map((ex, exIdx) => (
              <div key={ex.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900">{ex.exercise.name}</h3>
                      <button className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => {
                          const updated = exercises.filter(e => e.id !== ex.id);
                          setExercises(updated);
                      }}><Trash2 size={16} /></button>
                  </div>
                  
                  <div className="p-2">
                      <div className="grid grid-cols-10 gap-2 mb-2 text-xs font-bold text-slate-400 uppercase text-center px-2">
                          <div className="col-span-1">Set</div>
                          <div className="col-span-3">kg / lbs</div>
                          <div className="col-span-3">Reps</div>
                          <div className="col-span-3">Done</div>
                      </div>
                      
                      <div className="space-y-2">
                        {ex.sets.map((set, setIdx) => (
                            <div key={set.id} className="flex flex-col gap-1">
                                <div className={`grid grid-cols-10 gap-2 items-center px-2 py-2 rounded-lg transition-colors ${set.completed ? 'bg-emerald-50' : ''}`}>
                                    <div className="col-span-1 flex flex-col items-center gap-1">
                                        <div className="text-center font-bold text-slate-500">{setIdx + 1}</div>
                                        <button 
                                            onClick={() => toggleSetNote(exIdx, setIdx)}
                                            className={`p-1 rounded-full transition-colors ${set.note !== undefined ? 'text-indigo-500 bg-indigo-50' : 'text-slate-300 hover:text-indigo-400'}`}
                                        >
                                            <MessageSquare size={12} fill={set.note ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            type="number" 
                                            value={set.weight || ''} 
                                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value))}
                                            placeholder="0"
                                            className="w-full text-center bg-slate-100 rounded-md py-2 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            type="number" 
                                            value={set.reps || ''} 
                                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', parseFloat(e.target.value))}
                                            placeholder="0"
                                            className="w-full text-center bg-slate-100 rounded-md py-2 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3 flex justify-center">
                                        <button 
                                            onClick={() => toggleSetComplete(exIdx, setIdx)}
                                            className={`w-full py-2 rounded-md flex items-center justify-center transition-colors shadow-sm active:scale-95 ${
                                                set.completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                                            }`}
                                        >
                                            <Check size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Note Input Row */}
                                {set.note !== undefined && (
                                    <div className="px-2 pb-2 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-yellow-400">
                                            <AlignLeft size={14} className="text-yellow-600 shrink-0" />
                                            <input 
                                                type="text"
                                                value={set.note}
                                                onChange={(e) => handleUpdateSet(exIdx, setIdx, 'note', e.target.value)}
                                                placeholder="Add a note (e.g. 'Felt heavy', 'Good form')..."
                                                className="w-full bg-transparent text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleAddSet(exIdx)}
                        className="w-full mt-3 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                      >
                          <Plus size={16} /> Add Set
                      </button>
                  </div>
              </div>
          ))}

          <button 
            onClick={() => setShowAddExercise(true)}
            className="w-full py-5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
          >
              <Plus size={20} /> Add Exercise
          </button>
          
          <div className="h-20" /> {/* Spacer */}
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Select Exercise</h3>
                      <button onClick={() => setShowAddExercise(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} className="text-slate-400" /></button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-2">
                      {EXERCISE_DB.map(ex => (
                          <button 
                            key={ex.id}
                            onClick={() => handleAddExercise(ex)}
                            className="w-full p-4 text-left bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 transition-colors group"
                          >
                              <div className="font-bold text-slate-900 group-hover:text-indigo-700">{ex.name}</div>
                              <div className="text-xs text-slate-500 uppercase">{ex.muscleGroup} • {ex.type}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ActiveWorkoutScreen;

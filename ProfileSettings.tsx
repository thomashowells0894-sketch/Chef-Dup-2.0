
import React, { useState, useEffect } from 'react';
import { UserProfile, WorkoutSession } from '../types';
import Tooltip from './Tooltip';
import { ArrowLeft, Award, Zap, Leaf, WheatOff, Check, LogOut, Bell, Scale, Calendar, Clock, Flame, Dumbbell, History, PieChart, AlertCircle, Watch, Smartphone } from 'lucide-react';

interface ProfileSettingsProps {
  profile: UserProfile;
  workoutLogs: WorkoutSession[];
  onUpdate: (updates: Partial<UserProfile>) => void;
  onBack: () => void;
  onLogout: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, workoutLogs, onUpdate, onBack, onLogout }) => {
  const [macros, setMacros] = useState({
      protein: profile.dailyProteinGoal,
      carbs: profile.dailyCarbGoal,
      fat: profile.dailyFatGoal
  });

  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);

  const proteinCals = macros.protein * 4;
  const carbsCals = macros.carbs * 4;
  const fatCals = macros.fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;
  const diff = totalCals - profile.dailyCalorieGoal;
  const isMatch = Math.abs(diff) < 50; 

  useEffect(() => {
      setMacros({
          protein: profile.dailyProteinGoal,
          carbs: profile.dailyCarbGoal,
          fat: profile.dailyFatGoal
      });
  }, [profile.dailyProteinGoal, profile.dailyCarbGoal, profile.dailyFatGoal]);

  const saveMacros = () => {
      onUpdate({
          dailyProteinGoal: macros.protein,
          dailyCarbGoal: macros.carbs,
          dailyFatGoal: macros.fat
      });
  };

  const handleConnectDevice = (deviceName: string) => {
      setConnectingDevice(deviceName);
      // Simulate connection delay
      setTimeout(() => {
          const currentDevices = profile.connectedDevices || [];
          let updatedDevices;
          if (currentDevices.includes(deviceName)) {
              updatedDevices = currentDevices.filter(d => d !== deviceName);
          } else {
              updatedDevices = [...currentDevices, deviceName];
          }
          onUpdate({ connectedDevices: updatedDevices });
          setConnectingDevice(null);
      }, 1500);
  };

  const ToggleRow = ({ label, value, field, icon: Icon }: any) => (
    <div 
      className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => onUpdate({ [field]: !value })}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${value ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          <Icon size={20} />
        </div>
        <span className="font-medium text-slate-900">{label}</span>
      </div>
      <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${value ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 bg-white shadow-sm flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Apps & Devices (New Feature) */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Smartphone className="text-blue-500" size={20} />
                <h2 className="text-lg font-bold text-slate-900">Apps & Devices</h2>
            </div>
            
            <div className="space-y-3">
                {['Apple Health', 'Google Fit', 'Fitbit', 'Garmin'].map(device => {
                    const isConnected = (profile.connectedDevices || []).includes(device);
                    const isProcessing = connectingDevice === device;
                    
                    return (
                        <div key={device} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Watch size={18} className="text-slate-700" />
                                </div>
                                <span className="font-bold text-slate-700">{device}</span>
                            </div>
                            <button 
                                onClick={() => handleConnectDevice(device)}
                                disabled={isProcessing}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isConnected 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {isProcessing ? 'Syncing...' : isConnected ? 'Connected' : 'Connect'}
                            </button>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
                Sync steps, workouts, and calories burned automatically.
            </p>
        </section>

        {/* Macro Goals */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <PieChart className="text-indigo-600" size={20} />
                <h2 className="text-lg font-bold text-slate-900">Macro Goals</h2>
            </div>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-1">
                        <span>Protein (4 cal/g)</span>
                        <span className="text-emerald-600">{macros.protein}g</span>
                    </div>
                    <input 
                        type="range" min="50" max="300" step="5"
                        value={macros.protein}
                        onChange={(e) => setMacros({...macros, protein: parseInt(e.target.value)})}
                        className="w-full accent-emerald-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-1">
                        <span>Carbs (4 cal/g)</span>
                        <span className="text-amber-600">{macros.carbs}g</span>
                    </div>
                    <input 
                        type="range" min="20" max="500" step="5"
                        value={macros.carbs}
                        onChange={(e) => setMacros({...macros, carbs: parseInt(e.target.value)})}
                        className="w-full accent-amber-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-1">
                        <span>Fat (9 cal/g)</span>
                        <span className="text-rose-600">{macros.fat}g</span>
                    </div>
                    <input 
                        type="range" min="20" max="200" step="5"
                        value={macros.fat}
                        onChange={(e) => setMacros({...macros, fat: parseInt(e.target.value)})}
                        className="w-full accent-rose-500 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-sm ${isMatch ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100'}`}>
                    <div>
                        <div className="font-bold text-slate-700">Total: {totalCals} kcal</div>
                        <div className="text-xs text-slate-400">Target: {profile.dailyCalorieGoal} kcal</div>
                    </div>
                    {isMatch ? (
                        <div className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check size={16} /> Balanced
                        </div>
                    ) : (
                        <div className="text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={16} /> {diff > 0 ? `+${diff}` : diff}
                        </div>
                    )}
                </div>

                <button 
                    onClick={saveMacros}
                    disabled={!isMatch}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md disabled:opacity-50 disabled:shadow-none"
                >
                    Save Macros
                </button>
            </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Impact</h2>
          <div className="grid grid-cols-2 gap-4">
            <Tooltip text="Estimated Grocery Savings">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-lg cursor-default">
                <div className="text-3xl font-bold mb-1">${profile.totalSaved.toFixed(0)}</div>
                <div className="text-emerald-100 text-sm font-medium">Money Saved</div>
                </div>
            </Tooltip>
            
            <Tooltip text="Achievements Unlocked">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-default">
                <div className="text-3xl font-bold text-slate-900 mb-1">{profile.badges.length}</div>
                <div className="text-slate-500 text-sm font-medium">Badges Earned</div>
                </div>
            </Tooltip>
          </div>
        </section>

        {/* Settings List */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Dietary Goals</h2>
          <ToggleRow label="Vegan / Plant Based" value={profile.isVegan} field="isVegan" icon={Leaf} />
          <ToggleRow label="Gluten Free" value={profile.isGlutenFree} field="isGlutenFree" icon={WheatOff} />
          <ToggleRow label="Keto / Low Carb" value={profile.isKeto} field="isKeto" icon={Zap} />
        </section>

        <section className="pt-4 pb-20 border-t border-slate-200">
             <button 
                onClick={onLogout}
                className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors shadow-sm"
             >
                 <LogOut size={18} /> Log Out
             </button>
             <p className="text-center text-xs text-slate-400 mt-4">Version 1.1.0 (Pro)</p>
        </section>

      </div>
    </div>
  );
};

export default ProfileSettings;

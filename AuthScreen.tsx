import React, { useState, useEffect } from 'react';
import * as AuthService from '../services/auth';
import { ChefHat, Mail, Lock, User, ArrowRight, Loader2, KeyRound, ArrowLeft, CheckCircle, Database, Bell, Zap } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: () => void;
}

type AuthView = 'LOGIN' | 'SIGNUP' | 'FORGOT' | 'NEW_PASSWORD';

const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset Flow State
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showFakeNotification, setShowFakeNotification] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [savedAccounts, setSavedAccounts] = useState<{name: string, email: string}[]>([]);

  // Load saved accounts for debugging visibility
  useEffect(() => {
    setSavedAccounts(AuthService.getRegisteredUsers());
  }, [view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (view === 'LOGIN') {
        await AuthService.login(email, password);
        onSuccess();
      } else if (view === 'SIGNUP') {
        if (!name.trim()) throw new Error('Name is required.');
        await AuthService.signup(name, email, password);
        onSuccess();
      } else if (view === 'FORGOT') {
        if (!email.trim()) throw new Error('Please enter your email address.');
        await AuthService.resetPassword(email);
        setResetEmail(email);
        setResetSent(true);
        
        // SIMULATION: Trigger a fake push notification after 2.5 seconds
        setTimeout(() => {
            setShowFakeNotification(true);
        }, 2500);

      } else if (view === 'NEW_PASSWORD') {
        if (!password.trim()) throw new Error('Please enter a new password.');
        if (password.length < 4) throw new Error('Password must be at least 4 characters.');
        
        await AuthService.updatePassword(resetEmail, password);
        
        // Success -> Redirect to login
        alert('Password updated successfully! Please log in with your new password.');
        setView('LOGIN');
        setResetSent(false);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
      setLoading(true);
      setError(null);
      try {
          await AuthService.login('demo@chef.ai', 'demo123');
          onSuccess();
      } catch (err: any) {
          setError(err.message);
          setLoading(false);
      }
  };

  const handleAutoFill = (accEmail: string) => {
      setEmail(accEmail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotificationClick = () => {
      setShowFakeNotification(false);
      setView('NEW_PASSWORD'); 
      setPassword(''); 
      setError(null);
  };

  // Render Forgot Password View
  if (view === 'FORGOT') {
    return (
        <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            
            {/* Simulated Push Notification */}
            {showFakeNotification && (
                <div 
                    onClick={handleNotificationClick}
                    className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 cursor-pointer animate-in slide-in-from-top duration-500 z-50 flex gap-3 hover:bg-white transition-colors"
                >
                    <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white">
                        <Mail size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-sm text-slate-900">NutriChef Support</span>
                            <span className="text-[10px] text-slate-400">Now</span>
                        </div>
                        <p className="text-xs font-medium text-slate-800">Reset your password</p>
                        <p className="text-xs text-slate-500 truncate">Tap here to create a new password for your account.</p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <KeyRound size={32} />
                    </div>
                </div>
                
                <h1 className="text-2xl font-extrabold text-slate-900 text-center mb-2">Reset Password</h1>
                <p className="text-slate-500 text-center mb-8">
                    {resetSent 
                        ? `We sent a recovery link to ${email}`
                        : "Enter your email and we'll send you a link to reset your password."
                    }
                </p>

                <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
                    {resetSent ? (
                        <div className="text-center py-4">
                            <div className="flex justify-center mb-4">
                                <CheckCircle size={48} className="text-green-500 animate-in zoom-in spin-in-180 duration-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Check your inbox</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                We've sent an email to <strong>{email}</strong> with a link to reset your password.
                            </p>
                            
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6 text-xs text-slate-400">
                                <div className="flex items-center justify-center gap-2 mb-1 font-bold text-slate-500">
                                    <Bell size={12} /> Demo Mode
                                </div>
                                Waiting for simulated email...
                            </div>

                            <button 
                                onClick={() => { setView('LOGIN'); setResetSent(false); setError(null); setShowFakeNotification(false); }}
                                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Back to Log In
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative group">
                                <Mail size={20} className="absolute top-3.5 left-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="text-red-600 text-sm font-bold text-center bg-red-50 py-3 rounded-lg border border-red-100 animate-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                            </button>

                            <button 
                                type="button"
                                onClick={() => { setView('LOGIN'); setError(null); }}
                                className="w-full py-2 text-slate-500 font-semibold text-sm hover:text-slate-800 flex items-center justify-center gap-1"
                            >
                                <ArrowLeft size={16} /> Back to Log In
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
  }

  // Render New Password View
  if (view === 'NEW_PASSWORD') {
      return (
        <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Lock size={32} />
                    </div>
                </div>
                
                <h1 className="text-2xl font-extrabold text-slate-900 text-center mb-2">New Password</h1>
                <p className="text-slate-500 text-center mb-8">
                    Create a new password for <span className="font-bold text-slate-700">{resetEmail}</span>
                </p>

                <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative group">
                            <Lock size={20} className="absolute top-3.5 left-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm font-bold text-center bg-red-50 py-3 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      );
  }

  // Render Login/Signup View
  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500 flex flex-col max-h-screen">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6 shrink-0">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20 mb-4 transform rotate-3">
                    <ChefHat size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">NutriChef</h1>
                <p className="text-slate-500 font-medium">Smart Nutrition & Fitness</p>
            </div>

            {/* Auth Card */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 shrink-0">
                <div className="flex gap-4 mb-8 p-1 bg-slate-100 rounded-lg">
                    <button 
                        onClick={() => { setView('LOGIN'); setError(null); }}
                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${view === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Log In
                    </button>
                    <button 
                         onClick={() => { setView('SIGNUP'); setError(null); }}
                         className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${view === 'SIGNUP' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {view === 'SIGNUP' && (
                        <div className="relative group">
                            <User size={20} className="absolute top-3.5 left-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                            />
                        </div>
                    )}
                    
                    <div className="relative group">
                        <Mail size={20} className="absolute top-3.5 left-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="relative group">
                        <Lock size={20} className="absolute top-3.5 left-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                    </div>

                    {view === 'LOGIN' && (
                        <div className="flex justify-end">
                            <button 
                                type="button" 
                                onClick={() => { setView('FORGOT'); setError(null); }}
                                className="text-sm text-blue-600 font-bold hover:underline"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-600 text-sm font-bold text-center bg-red-50 py-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {view === 'LOGIN' ? 'Log In' : 'Join NutriChef'} <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    {/* Quick Demo Login Button */}
                    {view === 'LOGIN' && (
                        <button 
                            type="button" 
                            onClick={handleDemoLogin}
                            disabled={loading}
                            className="w-full bg-emerald-50 text-emerald-700 border border-emerald-100 py-3 rounded-xl font-bold hover:bg-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            <Zap size={16} /> Quick Login (Demo)
                        </button>
                    )}
                </form>
            </div>

            {/* Local DB Debug Viewer */}
            {savedAccounts.length > 0 && view === 'LOGIN' && (
                <div className="mt-6 w-full animate-in slide-in-from-bottom duration-500 overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-400 mb-2 justify-center">
                        <Database size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Device Accounts (Local DB)</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-24 overflow-y-auto">
                        {savedAccounts.map((acc, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleAutoFill(acc.email)}
                                className="text-xs bg-white/50 border border-slate-200 p-2 rounded-lg text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all text-left flex justify-between group"
                            >
                                <span className="font-bold">{acc.name}</span>
                                <span className="opacity-70 group-hover:opacity-100">{acc.email}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <p className="text-center text-slate-400 text-xs mt-4 shrink-0">
                By continuing, you agree to our Terms of Service & Privacy Policy.
            </p>
        </div>
    </div>
  );
};

export default AuthScreen;
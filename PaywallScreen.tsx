import React from 'react';
import { Lock, Star, Check, X } from 'lucide-react';

interface PaywallProps {
  onSubscribe: () => void;
  onClose: () => void;
}

const PaywallScreen: React.FC<PaywallProps> = ({ onSubscribe, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white z-10 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-center text-white relative overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[length:16px_16px]"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl transform rotate-3 border border-white/30">
              <Lock size={40} className="text-white drop-shadow-md" />
            </div>
            <h2 className="text-3xl font-extrabold mb-2 tracking-tight">Unlock Chef Mode</h2>
            <p className="text-emerald-100 font-medium">You've used all your free scans.</p>
          </div>
        </div>

        {/* Benefits List */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <BenefitRow text="Unlimited Fridge Scans" />
            <BenefitRow text="Voice-Guided Cooking Assistant" />
            <BenefitRow text="Personalized Diet Plans (Vegan/Keto)" />
            <BenefitRow text="Save $100s on groceries monthly" />
          </div>

          {/* Pricing & Call to Action */}
          <div className="pt-4">
             <button 
              onClick={onSubscribe}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              <Star fill="currentColor" className="text-yellow-400 group-hover:scale-110 transition-transform" size={20} />
              <span>Start Free Trial</span>
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              $4.99/month after 7-day trial. Cancel anytime.
            </p>
          </div>

          <div className="text-center">
             <button onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                Restore Purchases
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BenefitRow = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
      <Check size={14} className="text-emerald-600 stroke-[3]" />
    </div>
    <span className="font-medium text-slate-700">{text}</span>
  </div>
);

export default PaywallScreen;
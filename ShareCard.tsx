import React from 'react';
import { Recipe } from '../types';
import { Share2, Home } from 'lucide-react';

interface ShareCardProps {
  recipe: Recipe;
  savings: number;
  onHome: () => void;
}

const ShareCard: React.FC<ShareCardProps> = ({ recipe, savings, onHome }) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'I cooked with NutriChef!',
          text: `I just saved $${savings.toFixed(2)} by cooking ${recipe.title} with ingredients I already had! #WasteWarrior #NutriChef`,
          url: window.location.href
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      alert("Sharing not supported on this browser.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transform rotate-1 hover:rotate-0 transition-transform duration-500">
        <div className="bg-emerald-600 p-6 text-center text-white">
            <h2 className="text-3xl font-bold font-serif italic">Bon Appétit!</h2>
        </div>
        
        <div className="relative h-64">
          <img src={recipe.imageUrl} alt="Result" className="w-full h-full object-cover" />
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-emerald-800 font-bold px-4 py-2 rounded-lg shadow-lg border border-emerald-100">
             Saved ${savings.toFixed(2)}!
          </div>
        </div>

        <div className="p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{recipe.title}</h3>
            <p className="text-slate-500 text-sm mb-6">
                You're a certified Waste Warrior. By using what you had, you helped the planet.
            </p>
            
            <div className="flex gap-3">
                <button 
                    onClick={onHome}
                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                    <Home size={18} /> Home
                </button>
                <button 
                    onClick={handleShare}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                >
                    <Share2 size={18} /> Share
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
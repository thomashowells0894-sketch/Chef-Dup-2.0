
import React, { useState } from 'react';
import { ArrowLeft, Globe, Link as LinkIcon, Loader2, Check, AlertCircle, ChefHat } from 'lucide-react';
import { Recipe } from '../types';
import * as AIService from '../services/aiService';

interface RecipeImporterProps {
  onBack: () => void;
  onImportComplete: (recipe: Recipe) => void;
}

const RecipeImporter: React.FC<RecipeImporterProps> = ({ onBack, onImportComplete }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.includes('.')) {
        setError("Please enter a valid URL");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
        const recipe = await AIService.importRecipeFromUrl(url);
        onImportComplete(recipe);
    } catch (e) {
        setError("Could not extract recipe. Try a different site.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="p-6 bg-white shadow-sm flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Import Recipe</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Globe size={40} className="text-indigo-600" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-2">Web Scraper</h2>
              <p className="text-slate-500 mb-8">
                  Paste a link from any food blog or recipe site. Our AI will extract ingredients and steps instantly.
              </p>

              <div className="relative mb-4">
                  <LinkIcon size={20} className="absolute top-4 left-4 text-slate-400" />
                  <input 
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.allrecipes.com/..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
              </div>

              {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-bold mb-4 bg-red-50 p-3 rounded-lg">
                      <AlertCircle size={16} /> {error}
                  </div>
              )}

              <button 
                onClick={handleImport}
                disabled={isLoading || !url}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                  {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" /> Extracting...
                      </>
                  ) : (
                      <>
                        <ChefHat size={20} /> Import Recipe
                      </>
                  )}
              </button>
              
              <div className="mt-6 text-xs text-slate-400 font-medium">
                  Supported: AllRecipes, FoodNetwork, Tasty, and 500+ blogs.
              </div>
          </div>
      </div>
    </div>
  );
};

export default RecipeImporter;

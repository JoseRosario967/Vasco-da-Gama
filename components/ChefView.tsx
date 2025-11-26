import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { generateChefRecipe } from '../services/geminiService';
import { Recipe, UploadedFile } from '../types';
import { ChefHat, UploadCloud, X, Utensils, Clock, Flame, Award, Printer } from 'lucide-react';

export const ChefView: React.FC = () => {
  const [ingredients, setIngredients] = useState('');
  const [image, setImage] = useState<UploadedFile | null>(null);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleRestriction = (r: string) => {
    setRestrictions(prev => prev.includes(r) ? prev.filter(i => i !== r) : [...prev, r]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage({
            file,
            previewUrl: result,
            base64Data: result.split(',')[1],
            mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!ingredients && !image) return;
    setIsLoading(true);
    setRecipe(null);
    
    try {
        const result = await generateChefRecipe(
            ingredients, 
            restrictions, 
            image ? { base64Data: image.base64Data, mimeType: image.mimeType } : undefined
        );
        setRecipe(result);
    } catch (e) {
        alert("Erro ao gerar receita. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <ChefHat className="w-8 h-8 text-amber-500" />
                Chef Michelin AI
            </h2>

            {/* Image Upload */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Foto do Frigorífico / Ingredientes</label>
                {!image ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-slate-800/50 transition-all"
                    >
                        <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-400">Carregar Foto (Opcional)</span>
                    </div>
                ) : (
                    <div className="relative h-48 rounded-lg overflow-hidden border border-slate-600">
                        <img src={image.previewUrl} className="w-full h-full object-cover" alt="Ingredients" />
                        <button 
                            onClick={() => { setImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
            </div>

            {/* Ingredients Text */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Lista de Ingredientes / Desejos</label>
                <textarea 
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="Ex: Tenho frango, massa e natas. Quero algo rápido."
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 resize-none"
                />
            </div>

            {/* Restrictions */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-2">Restrições</label>
                <div className="flex flex-wrap gap-2">
                    {['Vegetariano', 'Vegan', 'Sem Glúten', 'Sem Lactose', 'Baixas Calorias'].map(r => (
                        <button
                            key={r}
                            onClick={() => toggleRestriction(r)}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${restrictions.includes(r) ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <Button 
                onClick={handleGenerate} 
                isLoading={isLoading} 
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-orange-500/20"
                icon={<Utensils className="w-5 h-5" />}
            >
                Criar Receita Gourmet
            </Button>
        </div>
      </div>

      {/* Result Section */}
      <div className="h-full">
         {recipe ? (
             <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
                 <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 blur-[60px] opacity-20" />
                     <h3 className="text-2xl font-serif font-bold mb-2 relative z-10">{recipe.title}</h3>
                     <p className="text-slate-300 text-sm italic relative z-10">{recipe.description}</p>
                     
                     <div className="flex gap-4 mt-4 text-xs font-medium text-amber-400 relative z-10">
                         <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.prepTime}</div>
                         <div className="flex items-center gap-1"><Award className="w-3 h-3" /> {recipe.difficulty}</div>
                         {recipe.calories && <div className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipe.calories}</div>}
                     </div>
                 </div>

                 <div className="p-8 font-serif">
                     <div className="flex flex-col md:flex-row gap-8">
                         <div className="flex-1">
                             <h4 className="text-amber-700 font-bold uppercase tracking-wider text-sm mb-4 border-b border-amber-200 pb-2">Ingredientes</h4>
                             <ul className="space-y-2 text-sm text-slate-700">
                                 {recipe.ingredients.map((ing, i) => (
                                     <li key={i} className="flex gap-2">
                                         <span className="text-amber-500">•</span> {ing}
                                     </li>
                                 ))}
                             </ul>
                         </div>
                         <div className="flex-[1.5]">
                             <h4 className="text-amber-700 font-bold uppercase tracking-wider text-sm mb-4 border-b border-amber-200 pb-2">Preparação</h4>
                             <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                                 {recipe.steps.map((step, i) => (
                                     <div key={i} className="flex gap-3">
                                         <span className="font-bold text-slate-400">{i+1}.</span>
                                         <p>{step}</p>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>

                     <div className="mt-8 bg-slate-50 p-4 rounded-lg border-l-4 border-amber-500">
                         <h5 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                             <ChefHat className="w-4 h-4 text-amber-500" /> Dica do Chef
                         </h5>
                         <p className="text-sm text-slate-600 italic">{recipe.chefTips}</p>
                     </div>

                     <div className="mt-8 flex justify-center">
                         <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-900 transition-colors"
                         >
                             <Printer className="w-4 h-4" /> Imprimir Receita
                         </button>
                     </div>
                 </div>
             </div>
         ) : (
             <div className="h-full bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                 <ChefHat className="w-16 h-16 opacity-20 mb-4" />
                 <p className="text-lg font-medium">O seu prato aparecerá aqui</p>
                 <p className="text-sm max-w-xs mt-2 opacity-60">A IA vai analisar os seus ingredientes e criar uma receita digna de estrela Michelin.</p>
             </div>
         )}
      </div>
    </div>
  );
};
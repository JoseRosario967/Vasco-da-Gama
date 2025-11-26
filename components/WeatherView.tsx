
import React, { useState } from 'react';
import { Button } from './Button';
import { generateWeatherReport } from '../services/geminiService';
import { WeatherReport } from '../types';
import { CloudSun, CloudRain, Sun, Wind, Thermometer, MapPin, Shirt } from 'lucide-react';

export const WeatherView: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const districts = [
    'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 
    'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre', 
    'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
    'Madeira', 'Açores'
  ];

  const handleConsult = async (district: string) => {
    setSelectedDistrict(district);
    setIsLoading(true);
    setReport(null);
    try {
        const data = await generateWeatherReport(district);
        setReport(data);
    } catch (e) {
        alert("Erro ao obter previsão.");
    } finally {
        setIsLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
      const c = condition.toLowerCase();
      if (c.includes('chuv')) return <CloudRain className="w-8 h-8 text-blue-400" />;
      if (c.includes('sol') || c.includes('limpo')) return <Sun className="w-8 h-8 text-yellow-400" />;
      return <CloudSun className="w-8 h-8 text-slate-300" />;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
            <CloudSun className="w-8 h-8 text-sky-500" />
            Meteorologia à Antiga
        </h2>
        <p className="text-slate-400 text-sm mb-8">Selecione o distrito para ver a previsão com a sabedoria popular.</p>

        {/* Map Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
            {districts.map(d => (
                <button
                    key={d}
                    onClick={() => handleConsult(d)}
                    disabled={isLoading}
                    className={`
                        p-3 rounded-lg text-sm font-medium transition-all
                        ${selectedDistrict === d 
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' 
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-white'}
                    `}
                >
                    {d}
                </button>
            ))}
        </div>

        {/* Loading */}
        {isLoading && (
            <div className="text-center py-12 animate-pulse">
                <div className="w-16 h-16 bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CloudSun className="w-8 h-8 text-sky-500 animate-bounce" />
                </div>
                <p className="text-slate-300">A consultar os astros para {selectedDistrict}...</p>
            </div>
        )}

        {/* Report Card */}
        {report && !isLoading && (
            <div className="bg-gradient-to-br from-sky-900/50 to-slate-900 border border-sky-500/30 rounded-2xl p-6 md:p-8 animate-in slide-in-from-bottom-4 shadow-2xl">
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b border-sky-500/20 pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-sky-400 mb-2">
                            <MapPin className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wider">{report.district}</span>
                        </div>
                        <h3 className="text-4xl font-bold text-white mb-2">{report.currentTemp}</h3>
                        <p className="text-lg text-slate-300">{report.condition}</p>
                    </div>
                    
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 max-w-sm">
                        <p className="text-xl font-serif text-sky-200 italic leading-relaxed">
                            "{report.popularSummary}"
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {report.hourlyForecast.map((h, i) => (
                        <div key={i} className="bg-slate-950/50 rounded-lg p-3 text-center border border-slate-800">
                            <p className="text-xs text-slate-500 mb-2">{h.time}</p>
                            <div className="flex justify-center mb-2">
                                {getWeatherIcon(h.icon)}
                            </div>
                            <p className="font-bold text-white">{h.temp}</p>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-3 bg-slate-950/30 p-4 rounded-lg border border-slate-800">
                    <Shirt className="w-6 h-6 text-indigo-400 mt-1" />
                    <div>
                        <h4 className="font-bold text-sm text-indigo-300 mb-1">O que vestir?</h4>
                        <p className="text-sm text-slate-400">{report.clothingTip}</p>
                    </div>
                </div>

            </div>
        )}
      </div>
    </div>
  );
};

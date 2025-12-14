
import React, { useState } from 'react';
import { generatePPT } from '../services/gemini';
import { Presentation } from '../types';
import { Presentation as PresentationIcon, Loader2, Download, Share2 } from 'lucide-react';

interface PPTGeneratorProps {
  onSave: (ppt: Presentation) => void;
}

const PPTGenerator: React.FC<PPTGeneratorProps> = ({ onSave }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [ppt, setPpt] = useState<Presentation | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generatePPT(topic, 5);
      setPpt(result);
      onSave(result); // Auto-save to library
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <PresentationIcon className="w-8 h-8 text-orange-500" />
          AI PPT Creator
        </h2>
        {ppt && (
             <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                 <Download className="w-4 h-4"/> Export PDF
             </button>
        )}
      </div>

      {!ppt ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
           <div className="max-w-xl mx-auto space-y-4">
              <label className="block font-medium dark:text-gray-300">Presentation Topic</label>
              <input 
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. The Solar System, History of Rome"
                className="w-full p-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              />
              <button 
                onClick={handleGenerate}
                disabled={loading || !topic}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Generate Slides'}
              </button>
           </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Sidebar Slides */}
            <div className="w-64 bg-white dark:bg-gray-800 rounded-xl shadow overflow-y-auto p-4 space-y-4 border border-gray-200 dark:border-gray-700">
                {ppt.slides.map((slide, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`w-full text-left p-3 rounded border transition-all ${activeSlide === idx ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                        <span className="text-xs font-bold text-gray-400">Slide {idx + 1}</span>
                        <p className="text-sm font-medium truncate dark:text-gray-200">{slide.title}</p>
                    </button>
                ))}
            </div>

            {/* Main Preview */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-12 border border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="border-b pb-4 mb-8">
                     <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{ppt.slides[activeSlide].title}</h1>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-8">
                    <ul className="space-y-4 list-disc pl-5 text-xl text-gray-700 dark:text-gray-300">
                        {ppt.slides[activeSlide].bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                        ))}
                    </ul>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 italic p-4 text-center">
                        Image Placeholder: <br/>{ppt.slides[activeSlide].imageDescription}
                    </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
                    <p className="text-sm font-bold text-yellow-800 dark:text-yellow-500 uppercase tracking-wide mb-1">Speaker Notes</p>
                    <p className="text-gray-700 dark:text-gray-300">{ppt.slides[activeSlide].speakerNotes}</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PPTGenerator;

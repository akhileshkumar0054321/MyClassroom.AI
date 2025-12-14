
import React, { useState, useRef } from 'react';
import { resolveDoubt } from '../services/gemini';
import { HelpCircle, Image as ImageIcon, Send, Loader2, Volume2, AlertTriangle, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DoubtResponse } from '../types';

const DoubtTutor: React.FC = () => {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DoubtResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getBase64Data = (dataUrl: string) => {
      return dataUrl.split(',')[1];
  }

  const handleSolve = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q && !image) return;
    
    setLoading(true);
    setResponse(null);
    setErrorMsg('');
    
    try {
      const imgData = image ? getBase64Data(image) : undefined;
      const res = await resolveDoubt(q, imgData);
      
      if (!res.isAcademic) {
          setErrorMsg("I can only help with educational questions related to your curriculum.");
      } else {
          setResponse(res);
          // Auto-speak answer for "Voice+Text" feel
          speakAnswer(res.answer);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setLoading(false);
      setQuery(''); // clear input
    }
  };

  const speakAnswer = (text: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text.substring(0, 200) + "..."); // Speak summary
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
      }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
            <HelpCircle className="w-6 h-6 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Live Doubt Resolver</h2>
            <p className="text-gray-500 text-sm">Voice & Text AI Tutoring</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-inner p-6 border border-gray-200 dark:border-gray-700 relative">
        {!response && !loading && !errorMsg && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p>Upload a photo of a math problem or ask a question.</p>
          </div>
        )}
        
        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-primary-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <span className="font-medium animate-pulse">Analyzing problem...</span>
          </div>
        )}

        {errorMsg && (
            <div className="h-full flex flex-col items-center justify-center text-red-500">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p className="font-bold">{errorMsg}</p>
            </div>
        )}

        {response && (
           <div className="animate-fade-in">
             <div className="flex items-start gap-4 mb-6">
                 <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">AI</div>
                 <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl rounded-tl-none">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-purple-800 dark:text-purple-300">Solution</h3>
                        <button onClick={() => speakAnswer(response.answer)} className="text-gray-400 hover:text-purple-600">
                            <Volume2 className="w-5 h-5" />
                        </button>
                     </div>
                     <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                        <ReactMarkdown>{response.answer}</ReactMarkdown>
                     </div>
                 </div>
             </div>

             {/* Related Questions */}
             {response.relatedQuestions.length > 0 && (
                 <div className="ml-14">
                     <p className="text-xs font-bold text-gray-400 uppercase mb-2">Related Topics</p>
                     <div className="flex flex-wrap gap-2">
                         {response.relatedQuestions.map((q, i) => (
                             <button 
                                key={i}
                                onClick={() => handleSolve(q)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-sm rounded-full text-gray-700 dark:text-gray-300 transition-colors"
                             >
                                {q}
                             </button>
                         ))}
                     </div>
                 </div>
             )}
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        {image && (
          <div className="mb-4 relative inline-block">
             <img src={image} alt="Preview" className="h-32 rounded-lg border border-gray-300" />
             <button 
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs"
             >
                ×
             </button>
          </div>
        )}
        <div className="flex gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSolve()}
            placeholder="Type your question here (e.g. 'Explain Newton's First Law')..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white placeholder-gray-400"
          />
          <button 
            onClick={() => handleSolve()}
            disabled={loading || (!query && !image)}
            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors shadow-lg"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoubtTutor;

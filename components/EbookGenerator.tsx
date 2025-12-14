
import React, { useState } from 'react';
import { generateEbookContentStream } from '../services/gemini';
import { BookOpen, Download, Loader2, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface EbookGeneratorProps {
    onSave?: (title: string, content: string) => void;
}

const EbookGenerator: React.FC<EbookGeneratorProps> = ({ onSave }) => {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setContent('');
    setIsGenerating(true);
    let fullContent = '';
    try {
      await generateEbookContentStream(topic, (text) => {
        fullContent += text;
        setContent(prev => prev + text);
      });
      
      // Auto Save when complete
      if (onSave) onSave(topic, fullContent);

    } catch (error) {
      console.error("Error generating ebook", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-primary-500" />
          AI Ebook Creator
        </h2>
        {content && !isGenerating && (
          <div className="flex gap-2">
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <Printer className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <Download className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter ebook topic..."
          className="flex-1 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : 'Generate'}
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-inner p-8 overflow-y-auto border border-gray-200 dark:border-gray-700 prose dark:prose-invert max-w-none">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <p>Enter a topic to generate your comprehensive guide.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EbookGenerator;

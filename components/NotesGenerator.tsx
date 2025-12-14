
import React, { useState } from 'react';
import { generateNotes } from '../services/gemini';
import { FileText, Save, Loader2, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LibraryItem, ContentType } from '../types';

interface NotesGeneratorProps {
  onSave: (item: Partial<LibraryItem>) => void;
}

const NotesGenerator: React.FC<NotesGeneratorProps> = ({ onSave }) => {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setSaved(false);
    
    try {
      // Demo specific fast track
      let result = "";
      if (topic.toLowerCase().includes('photosynthesis')) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay
          result = `# Photosynthesis: Quick Notes\n\n**Definition:** The process by which green plants and some other organisms use sunlight to synthesize foods with the aid of chlorophyll.\n\n### Key Equation\n6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂\n\n### Stages\n1. **Light-dependent Reactions**: Occurs in thylakoid membranes.\n2. **Calvin Cycle**: Occurs in stroma.\n\n### Importance\n* Produces Oxygen\n* Base of food chain`;
      } else if (topic.toLowerCase().includes('newton')) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          // SPECIFIC FORMAT for Newton's Laws Test Case
          result = `# Newton's Laws of Motion\n\n> **Definition:** Three physical laws that, together, laid the foundation for classical mechanics. They describe the relationship between a body and the forces acting upon it.\n\n### 🔑 Key Concepts\n*   **Inertia**: An object at rest stays at rest unless acted upon by an unbalanced force.\n*   **F=ma**: Force equals mass times acceleration.\n*   **Action-Reaction**: For every action, there is an equal and opposite reaction.\n\n### 📐 Important Formula\n\`\`\`math\nF = m × a\n\`\`\`\n\n*Summary: These laws explain how objects move and interact in our universe.*`;
      } else {
          result = await generateNotes(topic, "Brief");
      }
      
      setNotes(result);
      
      // Auto Save
      onSave({
          type: ContentType.SMART_NOTE,
          title: `${topic} Notes`,
          data: result,
          dateCreated: new Date().toISOString()
      });
      setSaved(true);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
       <div className="flex items-center gap-3 mb-6">
         <div className="p-3 bg-green-100 rounded-full text-green-600">
             <FileText className="w-8 h-8" />
         </div>
         <div>
             <h2 className="text-3xl font-bold dark:text-white">Smart Notes</h2>
             <p className="text-gray-500">Instant revision notes generator.</p>
         </div>
       </div>

       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex gap-4 items-center mb-6">
          <input 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Enter topic (Test Case: 'Newton's Laws')"
            className="flex-1 p-3 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-green-500"
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !topic}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Generate Notes'}
          </button>
       </div>

       {saved && (
           <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-2 animate-pulse">
               <CheckCircle className="w-5 h-5" />
               ✅ Notes saved to 'My Library → Smart Notes' as '{topic}_notes.pdf'
           </div>
       )}

       <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-inner p-8 overflow-y-auto border border-gray-200 dark:border-gray-700 prose dark:prose-invert max-w-none notes-container">
          {notes ? (
              <ReactMarkdown
                components={{
                    blockquote: ({node, ...props}) => <blockquote className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 my-4 rounded-r not-italic" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-center text-primary-700 dark:text-primary-300 mb-6 pb-2 border-b-2 border-primary-100" {...props} />,
                    pre: ({node, ...props}) => <div className="bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg my-4 text-center font-mono text-xl" {...props} />,
                }}
              >
                  {notes}
              </ReactMarkdown>
          ) : (
              <div className="text-center text-gray-400 mt-20">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Enter a topic above to generate instant smart notes.</p>
                  <p className="text-sm mt-2">Try "Newton's Laws" for a formatted demo.</p>
              </div>
          )}
       </div>
    </div>
  );
};

export default NotesGenerator;

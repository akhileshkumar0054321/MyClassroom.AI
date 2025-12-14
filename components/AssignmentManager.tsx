
import React, { useState } from 'react';
import { User, UserRole, Assignment } from '../types';
import { FileText, Plus, Bot, Upload, Loader2, CheckCircle, Clock } from 'lucide-react';

interface AssignmentManagerProps {
  user: User;
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'AI' | 'MANUAL' | 'LIST'>('LIST');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([
      { id: '101', title: 'Calculus Problem Set 1', description: 'Solve problems 1-10', classroomId: 'SCI-10A', dueDate: '2023-12-01', status: 'PENDING', type: 'MANUAL' }
  ]);

  const handleAiGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    // Simulate AI Generation
    setTimeout(() => {
        setGeneratedContent([
            "1. A car accelerates at 5m/s². Calculate velocity after 10s.",
            "2. Define Newton's Second Law with an example.",
            "3. Calculate the potential energy of a 5kg mass at 10m height.",
            "4. Explain the difference between speed and velocity.",
            "5. What is the SI unit of Force?"
        ]);
        setLoading(false);
    }, 1500);
  };

  const publishAssignment = (type: 'AI' | 'MANUAL', title: string) => {
      const newAssign: Assignment = {
          id: Date.now().toString(),
          title: title,
          description: type === 'AI' ? 'AI Generated Questions' : 'Manual Upload',
          classroomId: 'SCI-10A',
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
          status: 'PENDING',
          type: type,
          questions: generatedContent
      };
      setAssignments([newAssign, ...assignments]);
      setActiveTab('LIST');
      setTopic('');
      setGeneratedContent([]);
  };

  // STUDENT VIEW
  if (user.role === UserRole.STUDENT) {
      return (
          <div className="p-6 max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold dark:text-white mb-6 flex items-center gap-2">
                  <FileText className="w-8 h-8 text-orange-600" />
                  My Assignments
              </h2>
              <div className="grid gap-4">
                  {assignments.map(assign => (
                      <div key={assign.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <div className="flex gap-4 items-center">
                              <div className={`p-3 rounded-full ${assign.type === 'AI' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {assign.type === 'AI' ? <Bot className="w-6 h-6"/> : <FileText className="w-6 h-6"/>}
                              </div>
                              <div>
                                  <h3 className="font-bold text-lg dark:text-white">{assign.title}</h3>
                                  <p className="text-sm text-gray-500">Due: {assign.dueDate} • {assign.questions?.length || 0} Questions</p>
                              </div>
                          </div>
                          <button className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700">
                              Start
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  // TEACHER VIEW
  return (
    <div className="p-6 max-w-6xl mx-auto">
       <div className="flex justify-between items-center mb-8">
           <h2 className="text-3xl font-bold dark:text-white flex items-center gap-2">
               <FileText className="w-8 h-8 text-teal-600" />
               Assignment Manager
           </h2>
           <button onClick={() => setActiveTab('LIST')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'LIST' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500'}`}>View All</button>
       </div>

       {activeTab === 'LIST' ? (
           <div className="grid gap-8">
               <div className="grid grid-cols-2 gap-6">
                   <button onClick={() => setActiveTab('AI')} className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all text-left relative overflow-hidden group">
                       <Bot className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform"/>
                       <h3 className="text-2xl font-bold">AI Assignment Generator</h3>
                       <p className="opacity-90">Auto-generate questions from any topic instantly.</p>
                   </button>
                   <button onClick={() => setActiveTab('MANUAL')} className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 rounded-xl hover:border-teal-500 transition-colors text-left group">
                       <Upload className="w-12 h-12 mb-4 text-gray-400 group-hover:text-teal-500"/>
                       <h3 className="text-2xl font-bold dark:text-white">Manual Upload</h3>
                       <p className="text-gray-500">Create custom questions or upload files.</p>
                   </button>
               </div>
               
               <div>
                   <h3 className="font-bold text-xl mb-4 dark:text-white">Active Assignments</h3>
                   {assignments.map(assign => (
                       <div key={assign.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 flex justify-between items-center">
                           <span className="font-medium dark:text-white">{assign.title}</span>
                           <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                       </div>
                   ))}
               </div>
           </div>
       ) : (
           <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
               <div className="flex items-center gap-2 mb-6">
                   <button onClick={() => setActiveTab('LIST')} className="text-gray-400 hover:text-gray-600">Back</button>
                   <h3 className="text-xl font-bold dark:text-white">
                       {activeTab === 'AI' ? '🤖 AI Generator' : '📄 Manual Creation'}
                   </h3>
               </div>

               {activeTab === 'AI' && (
                   <div className="max-w-2xl">
                       <label className="block font-medium mb-2 dark:text-gray-300">Enter Topic</label>
                       <div className="flex gap-4 mb-6">
                           <input 
                               value={topic}
                               onChange={e => setTopic(e.target.value)}
                               placeholder="e.g. Physics, World War II"
                               className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                           />
                           <button 
                               onClick={handleAiGenerate}
                               disabled={loading || !topic}
                               className="bg-blue-600 text-white px-6 rounded-lg font-bold flex items-center gap-2"
                           >
                               {loading ? <Loader2 className="animate-spin"/> : 'Generate'}
                           </button>
                       </div>

                       {generatedContent.length > 0 && (
                           <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl mb-6">
                               <h4 className="font-bold mb-4 dark:text-white">Generated Questions:</h4>
                               <ul className="space-y-3">
                                   {generatedContent.map((q, i) => (
                                       <li key={i} className="text-gray-700 dark:text-gray-300">{q}</li>
                                   ))}
                               </ul>
                           </div>
                       )}

                       {generatedContent.length > 0 && (
                           <button 
                               onClick={() => publishAssignment('AI', `${topic} Assignment`)}
                               className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"
                           >
                               <CheckCircle className="w-5 h-5"/> Publish to Class
                           </button>
                       )}
                   </div>
               )}

               {activeTab === 'MANUAL' && (
                   <div className="max-w-2xl text-center py-10 text-gray-500">
                       <p>Manual creation form would go here.</p>
                       <button onClick={() => publishAssignment('MANUAL', 'Custom Assignment')} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg">
                           Save Draft
                       </button>
                   </div>
               )}
           </div>
       )}
    </div>
  );
};

export default AssignmentManager;

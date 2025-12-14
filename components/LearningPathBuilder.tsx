
import React, { useState, useEffect } from 'react';
import { generateLearningPath } from '../services/gemini';
import { LearningPath, DailyPlan } from '../types';
import { Map, Calendar, CheckSquare, Square, Loader2, Share2, PlayCircle } from 'lucide-react';

const LearningPathBuilder: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mock "5-second" generation for demo feel
  const handleGenerate = async () => {
    setLoading(true);
    // Real generation in background
    try {
        const result = await generateLearningPath(goal);
        // Artificial delay for demo effect "Watch Learning Path generate in 5 seconds"
        await new Promise(resolve => setTimeout(resolve, 3000));
        setPath(result);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (!path) return;
    const newSchedule = [...path.schedule];
    newSchedule[dayIndex].completed = !newSchedule[dayIndex].completed;
    const newPath = { ...path, schedule: newSchedule };
    setPath(newPath);
    
    // Update progress bar
    const completed = newSchedule.filter(d => d.completed).length;
    setProgress(Math.round((completed / newSchedule.length) * 100));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-teal-100 rounded-full text-teal-600">
            <Map className="w-8 h-8" />
        </div>
        <div>
            <h2 className="text-3xl font-bold dark:text-white">AI Learning Path Builder</h2>
            <p className="text-gray-500">Create a personalized study schedule in seconds.</p>
        </div>
      </div>

      {!path ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
            <label className="block text-lg font-bold mb-3 dark:text-white">What do you want to learn?</label>
            <input 
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Master Python Basics in 5 days"
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-0 mb-6 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            />
            <button 
                onClick={handleGenerate}
                disabled={loading || !goal}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg disabled:opacity-70 transition-all"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Generating Path...
                    </>
                ) : (
                    <>
                        <PlayCircle className="w-6 h-6" />
                        Generate Schedule
                    </>
                )}
            </button>
            <p className="mt-4 text-sm text-gray-500 text-center">
                Try: "Learn Quantum Physics Basics" or "Master Spanish for Travel"
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar Summary */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-fit lg:sticky lg:top-4">
                <h3 className="text-xl font-bold dark:text-white mb-2">{path.goal}</h3>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4 dark:bg-gray-700">
                    <div className="bg-teal-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm font-bold text-teal-600 mb-6">{progress}% Completed</p>
                
                <button className="w-full border-2 border-teal-600 text-teal-600 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-teal-50 dark:hover:bg-teal-900/20">
                    <Share2 className="w-4 h-4" /> Share Path
                </button>
                <button 
                    onClick={() => { setPath(null); setProgress(0); setGoal(''); }} 
                    className="w-full mt-3 text-gray-400 text-sm hover:text-red-500"
                >
                    Create New Path
                </button>
            </div>

            {/* Schedule List */}
            <div className="lg:col-span-2 space-y-4">
                {path.schedule.map((day, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => toggleDay(idx)}
                        className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-2 cursor-pointer transition-all ${day.completed ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-teal-300'}`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 ${day.completed ? 'text-teal-600' : 'text-gray-300'}`}>
                                {day.completed ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className={`font-bold text-lg ${day.completed ? 'text-teal-800 dark:text-teal-300 line-through' : 'text-gray-800 dark:text-white'}`}>
                                        Day {day.day}: {day.topic}
                                    </h4>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                                    {day.activities.map((act, i) => (
                                        <li key={i}>{act}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default LearningPathBuilder;


import React, { useState } from 'react';
import { UserRole } from '../types';
import { Settings, RefreshCw, LogOut, PlayCircle, FileText, CheckCircle, X, ShieldAlert, Loader2 } from 'lucide-react';
import { generateDemoScript } from '../services/gemini';

interface JudgeControlsProps {
    onLogout: () => void;
    onReset: () => void;
    onLoadScenario: (scenario: 'TEACHER_DEMO' | 'STUDENT_DEMO') => void;
    userRole: UserRole;
}

const JudgeControls: React.FC<JudgeControlsProps> = ({ onLogout, onReset, onLoadScenario, userRole }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [script, setScript] = useState('');
    const [loadingScript, setLoadingScript] = useState(false);

    const handleGenerateScript = async () => {
        setLoadingScript(true);
        try {
            const res = await generateDemoScript(userRole === UserRole.TEACHER ? "Teacher" : "Student");
            setScript(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingScript(false);
        }
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-slide-in">
                <div className="bg-gradient-to-r from-gray-900 to-black p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-yellow-400" /> 
                        Judge Control Suite
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5"/></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* SCENARIOS */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">⚡ Quick Scenarios</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => { onLoadScenario('TEACHER_DEMO'); setIsOpen(false); }}
                                className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-700 text-sm font-bold hover:bg-purple-100 flex flex-col items-center gap-2"
                            >
                                <PlayCircle className="w-6 h-6" />
                                Teacher Demo
                            </button>
                            <button 
                                onClick={() => { onLoadScenario('STUDENT_DEMO'); setIsOpen(false); }}
                                className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-700 text-sm font-bold hover:bg-blue-100 flex flex-col items-center gap-2"
                            >
                                <ShieldAlert className="w-6 h-6" />
                                Student Proctoring
                            </button>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">🛠️ System Tools</h4>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { onReset(); setIsOpen(false); }}
                                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 dark:text-white"
                            >
                                <RefreshCw className="w-4 h-4"/> Reset Data
                            </button>
                            <button 
                                onClick={onLogout}
                                className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4"/> Force Logout
                            </button>
                        </div>
                    </div>

                    {/* SCRIPT GENERATOR */}
                    <div className="border-t pt-4 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-xs font-bold text-gray-500 uppercase">🎬 Demo Script Helper</h4>
                             <button 
                                onClick={handleGenerateScript}
                                disabled={loadingScript}
                                className="text-xs bg-black dark:bg-white dark:text-black text-white px-3 py-1 rounded-full flex items-center gap-1 hover:opacity-80"
                            >
                                {loadingScript ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Generate Script'}
                             </button>
                        </div>
                        {script && (
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-300 h-32 overflow-y-auto whitespace-pre-wrap font-mono border border-gray-200 dark:border-gray-700">
                                {script}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JudgeControls;

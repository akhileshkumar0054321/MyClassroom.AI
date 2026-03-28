import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Heart, Users, ArrowRight, Loader2, Globe, Search } from 'lucide-react';
import { SHARED_EXAM_LIST } from '../constants';

interface ExamPortalLoginProps {
    onLogin: (examId: string) => void;
    onBack: () => void;
    addNotification: (title: string, message: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'EMAIL') => void;
}

const ExamPortalLogin: React.FC<ExamPortalLoginProps> = ({ onLogin, onBack, addNotification }) => {
    const [regId, setRegId] = useState('');
    const [password, setPassword] = useState('');
    const [motherName, setMotherName] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [examSearch, setExamSearch] = useState('');
    const [showExamDropdown, setShowExamDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filteredExams = SHARED_EXAM_LIST.filter(e => 
        e.title.toLowerCase().includes(examSearch.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedExam) {
            setError("Please select an exam from the list.");
            addNotification('Selection Required', 'Please select an exam', 'ERROR');
            return;
        }

        console.log("ExamPortalLogin: handleSubmit called", { regId, password, selectedExam });
        setError(null);
        setIsLoading(true);
        
        // Simulate verification with a shorter delay
        setTimeout(() => {
            setIsLoading(false);
            addNotification('Identity Verified', `Welcome to ${selectedExam}`, 'SUCCESS');
            onLogin(selectedExam);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-800">
                        <ShieldCheck className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Exam Portal Login</h2>
                    <p className="text-slate-500 text-sm mt-2 font-bold uppercase tracking-widest">Candidate Verification</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Select Examination</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 z-10" />
                            <input 
                                required
                                value={selectedExam || examSearch}
                                onFocus={() => { setShowExamDropdown(true); setExamSearch(''); }}
                                onChange={e => { setExamSearch(e.target.value); setSelectedExam(''); setShowExamDropdown(true); }}
                                placeholder="Search Exam (e.g. JEE, SAT, GRE)"
                                className="w-full pl-11 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none transition-all dark:text-white font-bold"
                            />
                            {showExamDropdown && examSearch.length >= 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2 animate-fade-in">
                                    {filteredExams.length > 0 ? (
                                        filteredExams.map(exam => (
                                            <button 
                                                key={exam.id}
                                                type="button"
                                                onClick={() => { setSelectedExam(exam.title); setExamSearch(exam.title); setShowExamDropdown(false); }}
                                                className="w-full text-left p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-bold dark:text-white"
                                            >
                                                {exam.title}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase">No matching exams found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Registration ID</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                            <input 
                                required
                                value={regId}
                                onChange={e => setRegId(e.target.value)}
                                placeholder="REG-123456"
                                className="w-full pl-11 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none transition-all dark:text-white font-bold tracking-widest"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Password</label>
                        <div className="relative group">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                            <input 
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-11 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none transition-all dark:text-white font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mother's Name</label>
                            <div className="relative group">
                                <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                <input 
                                    required
                                    value={motherName}
                                    onChange={e => setMotherName(e.target.value)}
                                    placeholder="Name"
                                    className="w-full pl-11 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none transition-all dark:text-white font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Father's Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                <input 
                                    required
                                    value={fatherName}
                                    onChange={e => setFatherName(e.target.value)}
                                    placeholder="Name"
                                    className="w-full pl-11 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none transition-all dark:text-white font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-[2rem] shadow-xl shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-lg mt-6"
                    >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ShieldCheck className="w-6 h-6"/> Authenticate & Enter</>}
                    </button>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold text-center animate-fade-in">
                            {error}
                        </div>
                    )}
                </form>

                <button 
                    onClick={onBack}
                    className="mt-8 w-full text-slate-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                    Back to Selection
                </button>
            </div>
        </div>
    );
};

export default ExamPortalLogin;


import React, { useState, useRef, useEffect } from 'react';
import { generateTest, analyzeProctoringFrame } from '../services/gemini';
import { TestData, User, TestResult, QuestionType, UserRole, Question, TestSettings, TestStatus } from '../types';
import { 
    Play, Plus, Loader2, ShieldCheck, Hash, 
    Copy, CheckCircle, Sparkles, Send, Mic, 
    Camera, Eye, Activity, Clock, ShieldAlert, X, GraduationCap, 
    Layout, Settings, Edit3, Trash2, List, CheckSquare, AlertCircle, 
    ChevronRight, ChevronLeft, Save, Globe, Monitor, BarChart3, Info,
    PlusCircle, FileText, Shield, User as UserIcon, Keyboard, Calculator, Search,
    QrCode, Pause, PlayCircle, MessageSquare, AlertTriangle, ArrowRight, BookOpen,
    Trophy, RotateCcw, Share2, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- DEMO CONSTANT ---
const PHYSICS_DEMO_TEST: TestData = {
    id: 'DEMO-000000',
    title: 'Introductory Physics Demo Test',
    subject: 'Physics',
    creatorId: 'SYSTEM',
    instructions: 'This is a demo physics test. You can practice the test-taking interface here.',
    status: 'LIVE',
    accessCode: '000000',
    questions: [
        {
            id: 1,
            text: 'What is the SI unit of force?',
            type: QuestionType.MCQ,
            options: ['Joule', 'Newton', 'Watt', 'Pascal'],
            correctAnswer: 'Newton',
            difficulty: 'Easy',
            explanation: 'The SI unit of force is the Newton (N), named after Isaac Newton.',
            marks: 2
        },
        {
            id: 2,
            text: 'Which law states that every action has an equal and opposite reaction?',
            type: QuestionType.MCQ,
            options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravitation"],
            correctAnswer: "Newton's Third Law",
            difficulty: 'Easy',
            explanation: "Newton's Third Law states that for every action force, there is an equal and opposite reaction force.",
            marks: 2
        },
        {
            id: 3,
            text: 'Calculate the acceleration of a 10kg object when a force of 50N is applied.',
            type: QuestionType.SHORT,
            correctAnswer: '5 m/s²',
            modelAnswer: '5 m/s²',
            difficulty: 'Medium',
            explanation: 'Using F = ma, a = F/m = 50N / 10kg = 5 m/s².',
            marks: 3
        },
        {
            id: 4,
            text: 'Light travels faster in water than in air.',
            type: QuestionType.TRUE_FALSE,
            options: ['True', 'False'],
            correctAnswer: 'False',
            difficulty: 'Medium',
            explanation: 'Light travels slower in denser media. It travels at ~3x10⁸ m/s in vacuum/air and ~2.25x10⁸ m/s in water.',
            marks: 2
        },
        {
            id: 5,
            text: 'Explain the concept of conservation of energy with an example.',
            type: QuestionType.ESSAY,
            difficulty: 'Hard',
            explanation: 'Energy cannot be created or destroyed, only transformed. Example: A pendulum converting potential energy to kinetic energy.',
            marks: 5
        }
    ],
    settings: {
        timeLimitMinutes: 20,
        proctoring: false, // Disabled for demo
        requireWebcam: false,
        preventTabSwitch: false,
        allowCalculator: true,
        allowInternet: false,
        adaptive: false,
        shuffleQuestions: false
    }
};

interface ExaminationCenterProps {
    user: User;
    globalTests: TestData[];
    onAddTest: (test: TestData) => void;
    onSaveResult: (result: TestResult) => void;
}

const ExaminationCenter: React.FC<ExaminationCenterProps> = ({ user, globalTests, onAddTest, onSaveResult }) => {
    // --- NAVIGATION ---
    const [view, setView] = useState<'HUB' | 'INV_STEP1' | 'INV_STEP2' | 'INV_STEP3' | 'INV_DASHBOARD' | 'INV_MONITOR' | 'STU_ENTRY' | 'STU_LOBBY' | 'STU_ARENA' | 'STU_SUBMITTING' | 'STU_RESULTS'>('HUB');
    
    // --- INVIGILATOR STATE ---
    const [creationMethod, setCreationMethod] = useState<'AI' | 'MANUAL'>('AI');
    const [isGenerating, setIsGenerating] = useState(false);
    const [workingTest, setWorkingTest] = useState<Partial<TestData>>({
        title: '',
        subject: '',
        instructions: 'Follow all instructions carefully. AI proctoring is enabled.',
        questions: [],
        settings: {
            timeLimitMinutes: 30,
            proctoring: true,
            requireWebcam: true,
            preventTabSwitch: true,
            allowCalculator: false,
            allowInternet: false,
            adaptive: false,
            shuffleQuestions: true
        }
    });
    const [aiConfig, setAiConfig] = useState({
        topic: '',
        count: 5,
        difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard' | 'Mixed',
        distributions: { MCQ: 60, TF: 20, SHORT: 10, ESSAY: 10 }
    });
    const [activeEditIdx, setActiveEditIdx] = useState<number | null>(null);
    const [generatedCode, setGeneratedCode] = useState('');
    const [copied, setCopied] = useState(false);

    // --- STUDENT STATE ---
    const [joinCode, setJoinCode] = useState('');
    const [activeTest, setActiveTest] = useState<TestData | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [warnings, setWarnings] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [proctorStatus, setProctorStatus] = useState('Monitoring');
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [isCodeValidating, setIsCodeValidating] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [showExplanations, setShowExplanations] = useState(false);

    // --- REFS ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const lastViolationRef = useRef<number>(0);

    // --- HANDLERS: INVIGILATOR ---

    const handleGenerateAI = async () => {
        if (!aiConfig.topic) return;
        setIsGenerating(true);
        try {
            const data = await generateTest(aiConfig.topic, aiConfig.difficulty, aiConfig.count);
            setWorkingTest(prev => ({
                ...prev,
                title: data.title || `${aiConfig.topic} Examination`,
                subject: aiConfig.topic,
                questions: data.questions
            }));
            setView('INV_STEP2');
        } catch (e) {
            alert("AI generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const addManualQuestion = () => {
        const newQ: Question = {
            id: Date.now(),
            text: '',
            type: QuestionType.MCQ,
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
            difficulty: 'Medium',
            marks: 1
        };
        setWorkingTest(prev => ({
            ...prev,
            questions: [...(prev.questions || []), newQ]
        }));
        setActiveEditIdx((workingTest.questions?.length || 0));
    };

    const finalizeTestCreation = () => {
        if (!workingTest.title || (workingTest.questions?.length || 0) === 0) {
            alert("Please provide a title and at least one question.");
            return;
        }
        // Format: PHY-7B3K-9D2M style
        const code = `PHY-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
        const newTest: TestData = {
            ...workingTest as TestData,
            id: Date.now().toString(),
            creatorId: user.id,
            status: 'LIVE',
            accessCode: code,
            resultsPublished: false
        };
        onAddTest(newTest);
        setGeneratedCode(code);
        setView('INV_DASHBOARD');
    };

    // --- Fix: Added missing deleteQuestion function ---
    const deleteQuestion = (index: number) => {
        setWorkingTest(prev => ({
            ...prev,
            questions: prev.questions?.filter((_, i) => i !== index)
        }));
    };

    // --- HANDLERS: STUDENT ---

    const validateJoinCode = () => {
        setIsCodeValidating(true);
        setTimeout(() => {
            if (joinCode === '000000') {
                setIsDemoMode(true);
                setActiveTest(PHYSICS_DEMO_TEST);
                setView('STU_LOBBY');
            } else {
                const test = globalTests.find(t => t.accessCode === joinCode);
                if (test) {
                    setIsDemoMode(false);
                    setActiveTest(test);
                    setView('STU_LOBBY');
                } else {
                    alert("Invalid code. Please check and try again.");
                }
            }
            setIsCodeValidating(false);
        }, 1200);
    };

    // --- Fix: Added missing startStudentArena function ---
    const startStudentArena = async () => {
        if (!activeTest) return;
        
        if (activeTest.settings.requireWebcam && !isDemoMode) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                streamRef.current = stream;
                
                // Initialize audio analysis if needed
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                    analyserRef.current = audioContextRef.current.createAnalyser();
                    const source = audioContextRef.current.createMediaStreamSource(stream);
                    source.connect(analyserRef.current);
                }
            } catch (e) {
                alert("Camera and Microphone permissions are required for this proctored examination.");
                return;
            }
        }
        
        setTimeLeft((activeTest.settings.timeLimitMinutes || 20) * 60);
        setCurrentQIdx(0);
        setAnswers({});
        setWarnings(0);
        setView('STU_ARENA');
    };

    const submitStudentExam = (auto = false) => {
        setView('STU_SUBMITTING');
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        
        setTimeout(() => {
            let correct = 0;
            activeTest?.questions.forEach(q => {
                if (q.type === QuestionType.MCQ || q.type === QuestionType.TRUE_FALSE) {
                    if (answers[q.id] === q.correctAnswer) correct++;
                } else if (q.type === QuestionType.SHORT) {
                    if (answers[q.id]?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()) correct++;
                }
            });

            const result: TestResult = {
                testId: activeTest?.id || 'public',
                studentId: user.id,
                score: correct,
                maxScore: activeTest?.questions.length || 0,
                answers,
                dateTaken: new Date().toISOString(),
                status: 'COMPLETED',
                autoSubmitted: auto
            };
            onSaveResult(result);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            setView('STU_RESULTS');
        }, 2000);
    };

    // --- PROCTORING SYSTEM ---
    useEffect(() => {
        let visionInterval: any;
        let audioInterval: any;

        if (view === 'STU_ARENA' && activeTest?.settings.proctoring && streamRef.current && !isDemoMode) {
            if (videoRef.current) videoRef.current.srcObject = streamRef.current;
            visionInterval = setInterval(async () => {
                if (!videoRef.current) return;
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 240;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                setProctorStatus('Scanning...');
                const res = await analyzeProctoringFrame(base64);
                if (res.suspicious) triggerViolation(`AI Warning: ${res.reason}`);
                setProctorStatus('Monitoring');
            }, 8000);

            audioInterval = setInterval(() => {
                if (!analyserRef.current) return;
                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b) / data.length;
                setAudioLevel(avg);
                if (avg > 25) triggerViolation("Noise Level High");
            }, 500);
        }

        return () => {
            clearInterval(visionInterval);
            clearInterval(audioInterval);
        };
    }, [view, activeTest, isDemoMode]);

    const triggerViolation = (reason: string) => {
        if (isDemoMode) return;
        if (Date.now() - lastViolationRef.current < 5000) return;
        lastViolationRef.current = Date.now();
        setWarnings(prev => {
            const next = prev + 1;
            if (next >= 5) submitStudentExam(true);
            return next;
        });
        showViolationToast(reason);
    };

    const showViolationToast = (msg: string) => {
        const toast = document.createElement('div');
        toast.className = "fixed top-12 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-full shadow-2xl z-[999] animate-bounce font-bold border-2 border-white";
        toast.innerText = `PROCTOR ALERT: ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    useEffect(() => {
        let t: any;
        if (view === 'STU_ARENA' && timeLeft > 0) {
            t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (view === 'STU_ARENA' && timeLeft === 0) {
            submitStudentExam(true);
        }
        return () => clearInterval(t);
    }, [view, timeLeft]);

    useEffect(() => {
        const handleVisibility = () => {
            if (view === 'STU_ARENA' && document.hidden && activeTest?.settings.preventTabSwitch && !isDemoMode) {
                triggerViolation("Tab Switching Detected");
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [view, activeTest, isDemoMode]);

    // --- AUTO SAVE ---
    useEffect(() => {
        if (view === 'STU_ARENA') {
            const saveInterval = setInterval(() => {
                // In a real app, this would send to backend
                console.log('Auto-saving progress...');
            }, 30000);
            return () => clearInterval(saveInterval);
        }
    }, [view, answers]);

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col font-sans overflow-hidden">
            
            {/* VIEW: HUB */}
            {view === 'HUB' && (
                <div className="flex-1 flex flex-col justify-center animate-fade-in">
                    <div className="text-center mb-16">
                        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-red-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Examination Arena</h1>
                        <p className="text-gray-500 text-xl font-medium">Professional grade testing hub with AI invigilation and flexible test architecting.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto w-full">
                        <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-12 shadow-2xl border-b-8 border-indigo-600 group transition-all hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Shield className="w-32 h-32" /></div>
                            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-[2rem] flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform">
                                <ShieldCheck className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-4xl font-black dark:text-white mb-4">Invigilator</h2>
                            <p className="text-gray-500 mb-10 text-lg">Architect manual or AI-generated exams. Manage large student batches and monitor integrity live.</p>
                            <button onClick={() => setView('INV_STEP1')} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Layout className="w-6 h-6" /> Create Hall
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-12 shadow-2xl border-b-8 border-red-600 group transition-all hover:-translate-y-2 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-5"><GraduationCap className="w-32 h-32" /></div>
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-[2rem] flex items-center justify-center mb-8 group-hover:-rotate-6 transition-transform">
                                <GraduationCap className="w-10 h-10 text-red-600" />
                            </div>
                            <h2 className="text-4xl font-black dark:text-white mb-4">Student</h2>
                            <p className="text-gray-500 mb-10 text-lg">Access examination halls using unique codes. Enter the secure arena where AI ensures a fair environment.</p>
                            <button onClick={() => setView('STU_ENTRY')} className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Play className="w-6 h-6" /> Join Hall
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INVIGILATOR STEP 1: Method Choice */}
            {view === 'INV_STEP1' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
                    <button onClick={() => setView('HUB')} className="text-gray-500 font-bold mb-12 hover:text-black">← Return</button>
                    <h2 className="text-4xl font-black mb-10 dark:text-white uppercase tracking-tight">Select Creation Method</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                        <button 
                            onClick={() => { setCreationMethod('MANUAL'); setWorkingTest({...workingTest, questions: []}); setView('INV_STEP2'); }}
                            className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-xl border-4 border-transparent hover:border-indigo-600 transition-all text-left"
                        >
                            <FileText className="w-12 h-12 text-indigo-600 mb-6" />
                            <h3 className="text-2xl font-bold dark:text-white mb-2">Manual Creation</h3>
                            <p className="text-gray-500">Start with an empty template and craft every question using the rich question builder.</p>
                        </button>
                        <button 
                            onClick={() => { setCreationMethod('AI'); setWorkingTest({...workingTest, questions: []}); setView('INV_STEP2'); }}
                            className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-xl border-4 border-transparent hover:border-purple-600 transition-all text-left"
                        >
                            <Sparkles className="w-12 h-12 text-purple-600 mb-6" />
                            <h3 className="text-2xl font-bold dark:text-white mb-2">AI-Generated</h3>
                            <p className="text-gray-500">Provide a topic or upload material and let AI distribution algorithms draft the questions.</p>
                        </button>
                    </div>
                </div>
            )}

            {/* INVIGILATOR STEP 2: Builder */}
            {view === 'INV_STEP2' && (
                <div className="flex-1 flex flex-col lg:flex-row gap-8 animate-fade-in overflow-hidden h-full pb-10">
                    <div className="w-full lg:w-96 space-y-6 overflow-y-auto pr-2">
                        {creationMethod === 'AI' && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-black mb-4 flex items-center gap-2 dark:text-white"><Sparkles className="w-5 h-5 text-indigo-500" /> AI Distribution</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Topic</label>
                                        <input value={aiConfig.topic} onChange={e => setAiConfig({...aiConfig, topic: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none text-sm dark:text-white" placeholder="e.g. Organic Chemistry" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Count: {aiConfig.count}</label>
                                        <input type="range" min="5" max="50" step="5" value={aiConfig.count} onChange={e => setAiConfig({...aiConfig, count: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Type Distribution</label>
                                        <div className="flex items-center gap-2"><span className="text-[10px] w-8">MCQ</span><div className="flex-1 h-2 bg-indigo-600 rounded"></div><span className="text-[10px]">60%</span></div>
                                        <div className="flex items-center gap-2"><span className="text-[10px] w-8">T/F</span><div className="flex-1 h-2 bg-green-600 rounded" style={{width:'20%'}}></div><span className="text-[10px]">20%</span></div>
                                    </div>
                                    <button onClick={handleGenerateAI} disabled={isGenerating || !aiConfig.topic} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
                                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>} Generate Questions
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow border border-gray-100 dark:border-gray-700">
                             <h3 className="text-lg font-black mb-4 flex items-center gap-2 dark:text-white"><Settings className="w-5 h-5" /> Config</h3>
                             <div className="space-y-4">
                                <input value={workingTest.title} onChange={e => setWorkingTest({...workingTest, title: e.target.value})} placeholder="Test Name" className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none text-sm dark:text-white" />
                                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><input type="number" value={workingTest.settings?.timeLimitMinutes} onChange={e => setWorkingTest({...workingTest, settings: {...workingTest.settings!, timeLimitMinutes: Number(e.target.value)}})} className="w-20 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border-none text-sm" /> mins</div>
                                <textarea value={workingTest.instructions} onChange={e => setWorkingTest({...workingTest, instructions: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none text-sm h-24" />
                             </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl p-8 border dark:border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black dark:text-white flex items-center gap-3"><List className="w-6 h-6 text-indigo-600" /> Questions ({workingTest.questions?.length || 0})</h2>
                            <div className="flex gap-2">
                                <button onClick={addManualQuestion} className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all dark:text-white"><PlusCircle className="w-4 h-4" /> Add Question</button>
                                <button onClick={() => setView('INV_STEP3')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg">Next Step <ArrowRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                             {workingTest.questions?.map((q, idx) => (
                                 <div key={q.id} className="p-6 border border-gray-100 dark:border-gray-700 rounded-2xl flex justify-between items-start group hover:border-indigo-500 transition-colors">
                                     <div className="flex gap-4">
                                         <span className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center font-black text-indigo-600">{idx+1}</span>
                                         <div>
                                             <p className="font-bold dark:text-white text-lg">{q.text || "Untitled Question"}</p>
                                             <div className="flex gap-3 mt-2">
                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-black text-gray-500">{q.type}</span>
                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-black text-gray-500">{q.marks} MARKS</span>
                                             </div>
                                         </div>
                                     </div>
                                     <div className="flex gap-1">
                                         <button onClick={() => setActiveEditIdx(idx)} className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600"><Edit3 className="w-5 h-5"/></button>
                                         <button onClick={() => deleteQuestion(idx)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}

            {/* INVIGILATOR STEP 3: Security & Code Generation */}
            {view === 'INV_STEP3' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
                    <div className="max-w-xl w-full bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-2xl border dark:border-gray-700">
                        <h2 className="text-3xl font-black mb-8 dark:text-white uppercase tracking-tight text-center">Security Protocols</h2>
                        <div className="space-y-4 mb-10">
                            {[
                                { key: 'proctoring', label: 'Enable AI Proctoring', icon: Eye },
                                { key: 'requireWebcam', label: 'Require Webcam Monitoring', icon: Camera },
                                { key: 'preventTabSwitch', label: 'Strict Tab Focus Lock', icon: Layers },
                                { key: 'allowCalculator', label: 'Include Virtual Calculator', icon: Calculator },
                                { key: 'allowInternet', label: 'Open Internet Access', icon: Globe },
                            ].map((s: any) => (
                                <label key={s.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                                    <div className="flex items-center gap-4">
                                        <s.icon className="w-6 h-6 text-gray-400" />
                                        <span className="font-bold dark:text-white">{s.label}</span>
                                    </div>
                                    <input type="checkbox" checked={((workingTest.settings as any)[s.key])} onChange={() => setWorkingTest({...workingTest, settings: {...workingTest.settings!, [s.key]: !((workingTest.settings as any)[s.key])}})} className="w-6 h-6 rounded border-gray-300 text-indigo-600" />
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setView('INV_STEP2')} className="px-8 py-5 font-black text-gray-400 hover:text-gray-600">Back</button>
                            <button onClick={finalizeTestCreation} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-indigo-700 transition-all">Launch Test Hall</button>
                        </div>
                    </div>
                </div>
            )}

            {/* INVIGILATOR DASHBOARD */}
            {view === 'INV_DASHBOARD' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-fade-in relative">
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-[4rem] shadow-2xl border border-indigo-50 dark:border-gray-700 max-w-2xl w-full text-center relative z-10">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"><CheckCircle className="w-12 h-12 text-green-600" /></div>
                        <h2 className="text-5xl font-black mb-4 dark:text-white">Active Hall Open</h2>
                        <p className="text-gray-500 mb-10 text-xl font-medium">Session ID: {generatedCode}</p>
                        <div className="bg-indigo-50 dark:bg-gray-900 p-10 rounded-[3rem] mb-12 flex flex-col items-center justify-center border-2 border-indigo-100 dark:border-indigo-900/40">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-4">ACCESS CODE</span>
                            <div className="flex items-center gap-6">
                                <span className="text-6xl font-mono font-black tracking-widest text-indigo-600 select-all">{generatedCode}</span>
                                <button onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                                    {copied ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-gray-500" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setView('HUB')} className="py-5 bg-gray-100 dark:bg-gray-700 rounded-[2rem] font-black text-xl hover:bg-gray-200">Return Hub</button>
                            <button onClick={() => setView('INV_MONITOR')} className="py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all">
                                <Monitor className="w-6 h-6"/> Monitor Live
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INVIGILATOR MONITORING DASHBOARD */}
            {view === 'INV_MONITOR' && (
                <div className="flex-1 flex flex-col animate-fade-in h-full">
                    <div className="flex justify-between items-center mb-8 border-b pb-6 dark:border-gray-700">
                        <div>
                            <button onClick={() => setView('INV_DASHBOARD')} className="text-gray-500 font-bold mb-1 hover:text-black">← Back</button>
                            <h2 className="text-4xl font-black dark:text-white flex items-center gap-3"><Activity className="w-10 h-10 text-red-600 animate-pulse"/> Monitoring: {workingTest.title}</h2>
                        </div>
                        <div className="flex gap-3">
                             <button className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm hover:bg-gray-50"><Pause className="w-5 h-5 text-gray-500"/></button>
                             <button className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm hover:bg-gray-50"><MessageSquare className="w-5 h-5 text-indigo-500"/></button>
                             <button className="bg-red-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20">End Test</button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-10">
                        {[
                            { name: 'John Doe', q: 3, time: '12:45', status: 'Normal' },
                            { name: 'Jane Smith', q: 5, time: '8:30', status: 'Warning', alert: 'Multiple tab switches detected' },
                            { name: 'Bob Wilson', q: 'Submitted', time: '--', status: 'Completed' }
                        ].map((s, i) => (
                            <div key={i} className={`bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-xl border-4 transition-all ${s.status === 'Warning' ? 'border-red-500' : 'border-transparent'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold">{s.name[0]}</div>
                                        <div>
                                            <p className="font-black dark:text-white">{s.name}</p>
                                            <p className="text-xs text-gray-500">Seat ID: B-10{i}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${s.status === 'Completed' ? 'bg-green-100 text-green-700' : s.status === 'Warning' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>{s.status}</span>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase"><span>Progress</span><span>Q{s.q} / 5</span></div>
                                    <div className="h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-600" style={{width: typeof s.q === 'number' ? `${(s.q/5)*100}%` : '100%'}}></div>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-gray-400 uppercase">Time Left</span>
                                        <span className="text-indigo-600 font-mono">{s.time}</span>
                                    </div>
                                </div>
                                {s.alert && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex gap-2 items-center"><AlertTriangle className="w-3 h-3" /> {s.alert}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW: STUDENT ENTRY */}
            {view === 'STU_ENTRY' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
                    <button onClick={() => setView('HUB')} className="text-gray-500 font-bold mb-12 hover:text-black">← Back to Hub</button>
                    <div className="max-w-xl w-full text-center">
                        <div className="w-24 h-24 bg-red-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg shadow-red-500/10">
                            <Hash className="w-12 h-12 text-red-600" />
                        </div>
                        <h2 className="text-5xl font-black mb-4 dark:text-white uppercase tracking-tight">Hall Authentication</h2>
                        <p className="text-gray-500 mb-12 text-xl font-medium max-w-md mx-auto">Enter your session access code to initialze seated position.</p>
                        <div className="relative mb-6">
                            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="000000" className="w-full p-10 bg-white dark:bg-gray-800 rounded-[3rem] shadow-xl border-none text-7xl font-mono font-black text-center text-red-600 tracking-[1.5rem] focus:ring-8 focus:ring-red-500/5 outline-none transition-all placeholder:text-gray-100" />
                            {isCodeValidating && <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[3rem] flex items-center justify-center"><Loader2 className="w-12 h-12 text-red-600 animate-spin" /></div>}
                        </div>
                        <p className="text-indigo-500 font-bold mb-6 flex items-center justify-center gap-2"><Info className="w-4 h-4"/> For demo, use code: <span className="underline select-all">000000</span></p>
                        <button onClick={validateJoinCode} disabled={joinCode.length < 6 || isCodeValidating} className="w-full py-7 bg-red-600 hover:bg-red-700 text-white rounded-[3rem] font-black text-3xl shadow-2xl transition-all active:scale-95 disabled:opacity-50">Access Arena</button>
                    </div>
                </div>
            )}

            {/* VIEW: STUDENT LOBBY */}
            {view === 'STU_LOBBY' && activeTest && (
                <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto animate-fade-in">
                    {isDemoMode && <div className="mb-6 bg-indigo-600 text-white px-8 py-2 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-lg flex items-center gap-3"><PlayCircle className="w-4 h-4" /> Demo Mode: Practice Arena Enabled</div>}
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-[4rem] shadow-2xl border border-red-50 dark:border-gray-700 w-full relative overflow-hidden">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-[2rem] flex items-center justify-center flex-shrink-0 shadow-inner"><ShieldAlert className="w-10 h-10 text-red-600" /></div>
                            <div>
                                <h2 className="text-4xl font-black dark:text-white mb-2">{activeTest.title}</h2>
                                <p className="text-red-600 font-black uppercase tracking-[0.3em] text-xs flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> Session Securely Encrypted</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] flex gap-5 border dark:border-gray-800">
                                <Eye className="w-8 h-8 text-red-600 flex-shrink-0" />
                                <div><p className="font-black text-lg dark:text-white uppercase tracking-tight">AI Vision</p><p className="text-xs text-gray-500">{isDemoMode ? 'Disabled for practice session.' : 'System scans gaze and occupancy every few seconds.'}</p></div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] flex gap-5 border dark:border-gray-800">
                                <Mic className="w-8 h-8 text-red-600 flex-shrink-0" />
                                <div><p className="font-black text-lg dark:text-white uppercase tracking-tight">Sonic Sensor</p><p className="text-xs text-gray-500">{isDemoMode ? 'Disabled for practice session.' : 'Detects whispering or ambient voice frequencies.'}</p></div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] flex gap-5 border dark:border-gray-800">
                                <Monitor className="w-8 h-8 text-red-600 flex-shrink-0" />
                                <div><p className="font-black text-lg dark:text-white uppercase tracking-tight">Focus Enforcement</p><p className="text-xs text-gray-500">{isDemoMode ? 'Disabled: Tab switching allowed.' : 'Switching tabs will trigger immediate auto-submission.'}</p></div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] flex gap-5 border dark:border-gray-800">
                                <Clock className="w-8 h-8 text-red-600 flex-shrink-0" />
                                <div><p className="font-black text-lg dark:text-white uppercase tracking-tight">20:00 Timer</p><p className="text-xs text-gray-500">Fixed duration session. No pause or exit permitted once started.</p></div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <button onClick={() => setView('HUB')} className="px-10 py-5 font-black text-gray-400 hover:text-gray-600">Abort</button>
                            <button onClick={startStudentArena} className="flex-1 py-6 bg-red-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-red-700 transition-all">Begin Examination</button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: STUDENT ARENA */}
            {view === 'STU_ARENA' && activeTest && (
                <div className="flex-1 flex flex-col lg:flex-row gap-8 animate-fade-in pb-20 overflow-hidden relative">
                    {isDemoMode && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-purple-600 z-50"></div>}
                    
                    <div className="w-full lg:w-80 flex flex-col gap-6 order-2 lg:order-1 overflow-y-auto">
                        <div className="bg-black rounded-[2.5rem] overflow-hidden aspect-video relative border-4 border-red-600 shadow-2xl flex-shrink-0">
                            {isDemoMode ? (
                                <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center text-center p-6"><p className="text-white text-xs font-black uppercase tracking-widest opacity-80">Demo Practice: Camera Check Disabled</p></div>
                            ) : (
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            )}
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] text-white font-black border border-white/10">
                                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></div> {isDemoMode ? 'PRACTICE' : 'LIVE ENCRYPTED'}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border dark:border-gray-700 flex-shrink-0">
                             <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4 text-green-500" /> Metrics</h3>
                                <div className="flex gap-1.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-3.5 h-1.5 rounded-full ${i <= warnings ? 'bg-red-600 animate-pulse' : 'bg-gray-100 dark:bg-gray-700'}`}></div>)}</div>
                             </div>
                             <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem]">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-2xl flex items-center justify-center flex-shrink-0"><Calculator className="w-5 h-5 text-indigo-600" /></div>
                                    <p className="text-[10px] font-black text-indigo-800 dark:text-indigo-200 uppercase tracking-widest">Virtual Calc Available</p>
                                </div>
                             </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border dark:border-gray-700 flex-1 min-h-[250px]">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Hall Map</h3>
                            <div className="grid grid-cols-5 gap-3">
                                {activeTest.questions.map((_, i) => (
                                    <button key={i} onClick={() => setCurrentQIdx(i)} className={`w-full aspect-square rounded-2xl font-black text-sm transition-all border-2 ${currentQIdx === i ? 'bg-red-600 text-white scale-110 shadow-xl border-red-600' : answers[activeTest.questions[i].id] ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-transparent hover:border-gray-200'}`}>{i + 1}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-6 order-1 lg:order-2 overflow-hidden">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 z-30 backdrop-blur-xl bg-white/90">
                            <div>
                                <h1 className="text-2xl font-black dark:text-white line-clamp-1">{isDemoMode ? '[DEMO MODE] ' : ''}{activeTest.title}</h1>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Question {currentQIdx + 1} of {activeTest.questions.length}</p>
                            </div>
                            <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/30 px-8 py-3 rounded-[1.5rem] border border-red-100 dark:border-red-900/20 shadow-inner">
                                <Clock className="w-7 h-7 text-red-600 animate-pulse" />
                                <span className="text-4xl font-mono font-black text-red-600 tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        <div className="flex-1 bg-white dark:bg-gray-800 p-12 rounded-[4rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-y-auto flex flex-col relative group">
                            <div className="flex-1">
                                <div className="flex gap-6 mb-12 items-start">
                                    <span className="text-8xl font-black text-red-600/5 select-none leading-none -mt-4">{currentQIdx + 1}</span>
                                    <h2 className="text-4xl font-black dark:text-white leading-[1.2]">{activeTest.questions[currentQIdx].text}</h2>
                                </div>

                                {activeTest.questions[currentQIdx].type === QuestionType.MCQ || activeTest.questions[currentQIdx].type === QuestionType.TRUE_FALSE ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
                                        {activeTest.questions[currentQIdx].options?.map((opt, oIdx) => (
                                            <button key={oIdx} onClick={() => setAnswers({...answers, [activeTest.questions[currentQIdx].id]: opt})} className={`w-full text-left p-8 rounded-[2.5rem] border-4 transition-all flex items-center gap-6 group relative overflow-hidden ${answers[activeTest.questions[currentQIdx].id] === opt ? 'border-red-600 bg-red-50 dark:bg-red-900/20 ring-8 ring-red-600/5' : 'border-gray-50 dark:bg-gray-900 hover:bg-gray-50'}`}>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${answers[activeTest.questions[currentQIdx].id] === opt ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 group-hover:bg-red-100 group-hover:text-red-600'}`}>{String.fromCharCode(65 + oIdx)}</div>
                                                <span className={`text-xl font-bold ${answers[activeTest.questions[currentQIdx].id] === opt ? 'text-red-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{opt}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="relative group/input">
                                        <textarea value={answers[activeTest.questions[currentQIdx].id] || ''} onChange={e => setAnswers({...answers, [activeTest.questions[currentQIdx].id]: e.target.value})} className="w-full p-10 bg-gray-50 dark:bg-gray-900 rounded-[3rem] border-none text-2xl dark:text-white h-80 focus:ring-8 focus:ring-red-500/5" placeholder="Draft your academic response..." />
                                        <div className="absolute bottom-6 left-10 flex gap-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                             <span className="flex items-center gap-1"><Info className="w-3 h-3"/> Word Count: {(answers[activeTest.questions[currentQIdx].id] || '').split(/\s+/).filter(x => x).length}</span>
                                             {activeTest.questions[currentQIdx].type === QuestionType.SHORT && <span className="text-indigo-400">Hint: Use F = ma</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 flex justify-between border-t-2 border-gray-50 dark:border-gray-900 pt-10">
                                <button disabled={currentQIdx === 0} onClick={() => setCurrentQIdx(currentQIdx - 1)} className="p-6 bg-gray-100 dark:bg-gray-900 rounded-[2rem] font-black text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-20 transition-all"><ChevronLeft className="w-10 h-10" /></button>
                                <div className="flex gap-4">
                                    {currentQIdx === activeTest.questions.length - 1 ? (
                                        <button onClick={() => submitStudentExam()} className="px-16 bg-green-600 text-white font-black text-2xl rounded-[2.5rem] shadow-2xl shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 flex items-center gap-3"><CheckCircle className="w-8 h-8" /> Submit Hall</button>
                                    ) : (
                                        <button onClick={() => setCurrentQIdx(currentQIdx + 1)} className="px-10 bg-red-600 text-white rounded-[2rem] shadow-2xl shadow-red-600/20 hover:bg-red-700 transition-all"><ChevronRight className="w-10 h-10" /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: STUDENT SUBMITTING */}
            {view === 'STU_SUBMITTING' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
                    <div className="relative w-48 h-48 mb-12">
                        <div className="absolute inset-0 border-[12px] border-gray-100 dark:border-gray-800 rounded-full"></div>
                        <div className="absolute inset-0 border-[12px] border-green-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center"><Shield className="w-16 h-16 text-green-500" /></div>
                    </div>
                    <h2 className="text-5xl font-black mb-4 dark:text-white uppercase tracking-tight">Decrypting Logs</h2>
                    <p className="text-gray-500 text-2xl font-medium max-w-xl mx-auto">{isDemoMode ? 'Calculating your demo results and generating feedback report.' : 'AI vision logs and response metadata are being encrypted for evaluation. Stand by.'}</p>
                </div>
            )}

            {/* VIEW: STUDENT RESULTS (DEMO) */}
            {view === 'STU_RESULTS' && activeTest && (
                <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto animate-fade-in py-10 w-full">
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-[4rem] shadow-2xl border border-indigo-50 dark:border-gray-700 w-full">
                        <div className="text-center mb-12">
                             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy className="w-10 h-10 text-green-600" /></div>
                             <h2 className="text-5xl font-black dark:text-white mb-2 uppercase">Arena Completed</h2>
                             <p className="text-gray-500 text-xl font-medium">Practice results are processed and indexed.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-10 rounded-[3rem] text-center border-2 border-indigo-100 dark:border-indigo-800">
                                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-2">Practice Score</span>
                                <span className="text-7xl font-black text-indigo-600">{Object.keys(answers).length} / {activeTest.questions.length}</span>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-10 rounded-[3rem] text-center border-2 border-green-100 dark:border-green-800">
                                <span className="text-xs font-black text-green-400 uppercase tracking-widest block mb-2">Accuracy Rate</span>
                                <span className="text-7xl font-black text-green-600">{Math.round((Object.keys(answers).length / activeTest.questions.length) * 100)}%</span>
                            </div>
                        </div>

                        <div className="space-y-6 mb-12 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                            <div className="flex justify-between items-center mb-4"><h3 className="font-black text-2xl dark:text-white uppercase tracking-tighter">Response Key</h3><button onClick={() => setShowExplanations(!showExplanations)} className="text-sm font-bold text-indigo-600 hover:underline">{showExplanations ? 'Hide Explanations' : 'View Explanations'}</button></div>
                            {activeTest.questions.map((q, idx) => {
                                const isCorrect = answers[q.id] === q.correctAnswer || (q.type === QuestionType.SHORT && answers[q.id]?.toLowerCase() === q.correctAnswer?.toLowerCase());
                                return (
                                    <div key={idx} className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-start mb-4">
                                            <p className="font-black text-xl dark:text-white leading-tight flex-1">{idx+1}. {q.text}</p>
                                            {isCorrect ? <CheckCircle className="w-8 h-8 text-green-500" /> : <XCircle className="w-8 h-8 text-red-500" />}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border"><span className="text-[10px] font-black text-gray-400 block mb-1">YOUR ANSWER</span><p className="font-bold dark:text-white">{answers[q.id] || 'NO RESPONSE'}</p></div>
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-green-200"><span className="text-[10px] font-black text-green-400 block mb-1">CORRECT KEY</span><p className="font-bold text-green-600">{q.correctAnswer || q.modelAnswer}</p></div>
                                        </div>
                                        {showExplanations && <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800"><p className="text-xs font-black text-indigo-600 uppercase mb-1">AI Context</p><p className="text-sm text-gray-700 dark:text-indigo-200">{q.explanation}</p></div>}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => { setAnswers({}); setCurrentQIdx(0); setView('STU_LOBBY'); }} className="flex-1 py-5 bg-gray-100 dark:bg-gray-700 rounded-[2rem] font-black text-xl hover:bg-gray-200 flex items-center justify-center gap-2 transition-all"><RotateCcw className="w-5 h-5" /> Retake Arena</button>
                            <button onClick={() => setView('HUB')} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all"><Layout className="w-5 h-5" /> Portal Dashboard</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const XCircle = ({className}: {className?:string}) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>

export default ExaminationCenter;

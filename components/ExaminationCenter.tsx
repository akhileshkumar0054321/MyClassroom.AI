import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { analyzeProctoringFrame } from '../services/gemini';
import { TestResult, QuestionType, Question, User, StudentSession } from '../types';
import { SHARED_EXAM_LIST } from '../constants';
import { 
    Play, ShieldCheck, Hash, CheckCircle, Camera, Activity, 
    Clock, ShieldAlert, ChevronRight, ChevronLeft, 
    Shield, UserCheck, Mic, Laptop, Search, Loader2, AlertTriangle, 
    Trophy, Monitor, LogOut, Globe, ArrowRight, PlayCircle, User as UserIcon,
    Fingerprint, Smartphone, UserRoundCheck, Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

const MOCK_QUESTIONS: Question[] = [
    { id: 1, text: "In a stock market context, what does IPO stand for?", type: QuestionType.MCQ, options: ["Internal Profit Option", "Initial Public Offering", "International Payment Order", "Investment Portfolio Overhaul"], correctAnswer: "Initial Public Offering", difficulty: "Easy", explanation: "IPO is the first time a company sells stock to the public.", marks: 2 },
    { id: 2, text: "Which protocol is primarily used for secure communication over a computer network?", type: QuestionType.MCQ, options: ["HTTP", "FTP", "HTTPS", "SMTP"], correctAnswer: "HTTPS", difficulty: "Medium", explanation: "HTTPS encrypts communication between a browser and a server.", marks: 2 },
    { id: 3, text: "What is the primary function of a router in a network?", type: QuestionType.MCQ, options: ["To store data", "To route packets between networks", "To provide power to devices", "To display web pages"], correctAnswer: "To route packets between networks", difficulty: "Medium", explanation: "Routers forward data packets across network boundaries.", marks: 2 },
    { id: 4, text: "Cloud computing 'AWS' stands for what?", type: QuestionType.MCQ, options: ["Advanced Web Systems", "Amazon Web Services", "Apple Web Software", "Apex Wireless Solutions"], correctAnswer: "Amazon Web Services", difficulty: "Easy", explanation: "AWS is Amazon's cloud platform.", marks: 2 },
    { id: 5, text: "What is the standard port for SSH?", type: QuestionType.MCQ, options: ["21", "22", "80", "443"], correctAnswer: "22", difficulty: "Hard", explanation: "SSH typically uses port 22.", marks: 2 }
];

type PortalPhase = 'WELCOME' | 'VERIFY_APP' | 'IDENTITY_CAPTURE' | 'MATCHING' | 'INSTRUCTIONS' | 'ARENA' | 'SUBMITTING' | 'RESULT' | 'BLOCKED';

interface ExaminationCenterProps {
    user: User;
    onSaveResult: (result: TestResult) => void;
    onLogout: () => void; 
    globalTests?: any;
    onAddTest?: any;
    preSelectedExam?: string;
}

const ExaminationCenter: React.FC<ExaminationCenterProps> = ({ user, onSaveResult, onLogout, preSelectedExam }) => {
    const [phase, setPhase] = useState<PortalPhase>('WELCOME');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    
    // Multi-Step Verification States
    const [verificationStep, setVerificationStep] = useState(1);
    const [candidateName, setCandidateName] = useState('');
    const [dob, setDob] = useState('');
    const [aadhaar, setAadhaar] = useState('');
    const [otp, setOtp] = useState('');
    const [otpTimer, setOtpTimer] = useState(0);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [appNumber, setAppNumber] = useState('');
    const [fetchedCandidate, setFetchedCandidate] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    
    // Identity State
    const [captures, setCaptures] = useState<{ front: string | null; left: string | null; right: string | null }>({ front: null, left: null, right: null });
    const [matchingStatus, setMatchingStatus] = useState<'idle' | 'processing' | 'matched' | 'failed'>('idle');

    // Handle pre-selected exam from login
    useEffect(() => {
        if (preSelectedExam) {
            setSelectedExam(preSelectedExam);
            setPhase('VERIFY_APP'); // Start with verification
            setAppNumber(`REG-${Math.floor(Math.random() * 1000000)}`);
        }
    }, [preSelectedExam]);

    // Exam Arena State
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [warnings, setWarnings] = useState(0);
    const [proctorStatus, setProctorStatus] = useState('Monitoring');
    const [aiWarning, setAiWarning] = useState<string | null>(null);
    const [terminationMessage, setTerminationMessage] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const lastViolationRef = useRef<number>(0);
    const socketRef = useRef<Socket | null>(null);

    // Callback ref for video to ensure stream attachment
    const setVideoRef = (el: HTMLVideoElement | null) => {
        if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
        }
        (videoRef as any).current = el;
    };

    // Filtered Exams
    const filteredExams = SHARED_EXAM_LIST.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // OTP Timer Effect
    useEffect(() => {
        let interval: any;
        if (otpTimer > 0) {
            interval = setInterval(() => setOtpTimer(p => p - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    // --- HARDWARE KILLSWITCH & CLEANUP ---
    useEffect(() => {
        const monitoringPhases: PortalPhase[] = ['IDENTITY_CAPTURE', 'MATCHING', 'INSTRUCTIONS', 'ARENA'];
        if (!monitoringPhases.includes(phase)) {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
        }
    }, [phase]);

    useEffect(() => {
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
        };
    }, [stream]);

    // --- AI INVIGILATOR AGENT ---
    useEffect(() => {
        let visionInterval: any;
        let audioInterval: any;
        let streamingInterval: any;

        if (phase === 'ARENA' && stream) {
            // Connect to real-time invigilation server
            const socket = io(window.location.origin);
            socketRef.current = socket;

            socket.on('connect', () => {
                const session: StudentSession = {
                    studentId: user.id,
                    studentName: user.name,
                    examId: selectedExam,
                    examTitle: selectedExam,
                    startTime: new Date().toISOString(),
                    status: 'ACTIVE',
                    slashCount: warnings
                };
                socket.emit('student_joined', session);
            });

            socket.on('student_kicked', (data: { reason: string }) => {
                setTerminationMessage(data.reason || "You have been removed from the examination by an invigilator.");
                setPhase('BLOCKED');
            });

            // Streaming frames to invigilator (Simple SFU approach)
            streamingInterval = setInterval(() => {
                if (!videoRef.current) return;
                const canvas = document.createElement('canvas');
                canvas.width = 160; canvas.height = 120; // Low res for bandwidth
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const frame = canvas.toDataURL('image/jpeg', 0.4);
                socket.emit('stream_frame', { studentId: user.id, frame });
            }, 2000);

            // Setup Audio Context for Background Voice Detection
            try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);
                analyserRef.current.fftSize = 256;
                
                if (audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }

                // Audio Monitoring (Rule 3)
                audioInterval = setInterval(() => {
                    if (!analyserRef.current) return;
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    
                    if (avg > 25) { 
                        handleAction({ action: 'WARNING', message: "Background audio detected. Please ensure complete silence during the examination." });
                    }
                }, 1000);
            } catch (e) { console.error("Invigilation Audio Setup Failed", e); }

            // Keyboard / System activity (Rule 4)
            const blockKeys = (e: KeyboardEvent) => {
                e.preventDefault();
                handleAction({ action: 'TERMINATE_EXAM', message: "Unauthorized system activity detected. The exam has been terminated." });
            };
            window.addEventListener('keydown', blockKeys);

            // Tab Switching & Fullscreen Monitoring
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    handleAction({ action: 'WARNING', message: "Unauthorized tab switching detected. This is strictly prohibited!" });
                }
            };

            const handleFullscreenChange = () => {
                if (!document.fullscreenElement) {
                    handleAction({ action: 'WARNING', message: "Exiting fullscreen mode is prohibited. Please maintain fullscreen." });
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            document.addEventListener('fullscreenchange', handleFullscreenChange);

            // Vision Monitoring (Rule 1, 2)
            visionInterval = setInterval(async () => {
                if (!videoRef.current) return;
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 240;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                
                setProctorStatus('Active AI Monitoring');
                try {
                    const res = await analyzeProctoringFrame(base64);
                    handleAction(res);
                } catch (e) {
                    console.error("Vision check failed", e);
                }
            }, 8000); // Check every 8 seconds

            return () => {
                clearInterval(visionInterval);
                clearInterval(audioInterval);
                clearInterval(streamingInterval);
                if (socketRef.current) socketRef.current.disconnect();
                window.removeEventListener('keydown', blockKeys);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
            };
        }
    }, [phase, stream]);

    // Termination Check
    useEffect(() => {
        if (warnings >= 5) {
            setTerminationMessage("Maximum integrity warnings reached. The exam has been terminated.");
            setPhase('BLOCKED');
        }
    }, [warnings]);

    const handleAction = (res: { action: string, message?: string }) => {
        if (res.action === 'NONE') {
            setAiWarning(null);
            return;
        }

        // Debounce warnings to avoid spam
        const now = Date.now();
        if (res.action === 'WARNING' && now - lastViolationRef.current < 5000) return;
        lastViolationRef.current = now;

        if (res.action === 'TERMINATE_EXAM') {
            setTerminationMessage(res.message || "Unauthorized system activity detected. The exam has been terminated.");
            setPhase('BLOCKED');
            return;
        }

        if (res.action === 'CRITICAL_VIOLATION') {
            setAiWarning(res.message || "Critical integrity violation detected.");
            setWarnings(prev => {
                const newWarnings = prev + 2;
                if (socketRef.current) {
                    socketRef.current.emit('violation_updated', {
                        studentId: user.id,
                        slashCount: newWarnings,
                        lastViolation: res.message || "Critical integrity violation detected."
                    });
                }
                return newWarnings;
            });
        } else {
            setAiWarning(res.message || "Integrity warning detected.");
            setWarnings(prev => {
                const newWarnings = prev + 1;
                if (socketRef.current) {
                    socketRef.current.emit('violation_updated', {
                        studentId: user.id,
                        slashCount: newWarnings,
                        lastViolation: res.message || "Integrity warning detected."
                    });
                }
                return newWarnings;
            });
        }

        // Auto-clear visual warning after a few seconds
        setTimeout(() => setAiWarning(null), 4000);
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
                audio: { echoCancellation: true, noiseSuppression: true } 
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (e) {
            alert("Camera and Microphone access are mandatory to enter the examination hall.");
        }
    };

    // --- VERIFICATION HANDLERS ---
    const handleSendOtp = () => {
        if (aadhaar.length !== 12) return;
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            setVerificationStep(2);
            setOtpTimer(60);
        }, 1200);
    };

    const handleVerifyOtp = () => {
        if (otp.length < 4) return;
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            setIsOtpVerified(true);
            setVerificationStep(3);
        }, 1500);
    };

    const handleFetchCandidate = () => {
        if (!appNumber.trim()) return;
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            setFetchedCandidate({
                name: candidateName || "Candidate Verification",
                photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&h=150&auto=format&fit=crop",
                appId: appNumber,
                status: "VERIFIED"
            });
            setVerificationStep(4);
        }, 2000);
    };

    const handleProceedToCapture = () => {
        setPhase('IDENTITY_CAPTURE');
        startCamera();
    };

    const captureView = (view: 'front' | 'left' | 'right') => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        setCaptures(prev => ({ ...prev, [view]: canvas.toDataURL('image/jpeg') }));
    };

    const runIdentityMatch = () => {
        setPhase('MATCHING');
        setMatchingStatus('processing');
        setTimeout(() => {
            setMatchingStatus('matched');
            setTimeout(() => setPhase('INSTRUCTIONS'), 1500);
        }, 3000);
    };

    const startTest = () => {
        document.documentElement.requestFullscreen().then(() => {
            setPhase('ARENA');
        }).catch(() => alert("Full-screen mode is mandatory for this assessment."));
    };

    const finalizeTest = () => {
        setPhase('SUBMITTING');
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setTimeout(() => {
            onLogout(); 
        }, 2000);
    };

    useEffect(() => {
        let t: any;
        if (phase === 'ARENA' && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000);
        else if (phase === 'ARENA' && timeLeft === 0) finalizeTest();
        return () => clearInterval(t);
    }, [phase, timeLeft]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-500 relative">
            
            {/* PORTAL HEADER */}
            <header className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue-600/20 shadow-lg">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        MyClassroom
                    </span>
                    <span className="ml-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                        Exam Mode
                    </span>
                </div>

                <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-sm hover:bg-red-100 transition-all shadow-sm active:scale-95 group"
                >
                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Log Out
                </button>
            </header>

            {/* WELCOME PHASE */}
            {phase === 'WELCOME' && (
                <div className="flex-1 flex flex-col items-center py-12 px-6 animate-fade-in max-w-5xl mx-auto w-full">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200 dark:border-emerald-800/50">
                            <Activity className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Live Assessments</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Browse and attempt ongoing examinations currently active in your region.</p>
                    </div>
                    
                    <div className="w-full max-w-3xl mb-12">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Search className="h-6 w-6 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by exam name or board..."
                                className="w-full pl-16 pr-6 py-5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 text-lg dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full space-y-4">
                        {filteredExams.map(exam => (
                            <div key={exam.id} className="w-full bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-all hover:border-blue-200 dark:hover:border-blue-900 group">
                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex-shrink-0 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                        <Globe className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">{exam.title}</h3>
                                            <span className="flex-shrink-0 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200 dark:border-emerald-800/50 animate-pulse">LIVE</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-500 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Open for candidates nationwide</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedExam(exam.title); setPhase('VERIFY_APP'); setVerificationStep(1); }} className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                                    Start Test <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VERIFICATION PORTAL */}
            {phase === 'VERIFY_APP' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative">
                        <button 
                            onClick={() => setPhase('WELCOME')}
                            className="absolute top-8 left-8 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                            title="Back to Exam List"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="mb-10 text-center">
                            <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{selectedExam}</p>
                            <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Let's Start</h2>
                            <div className="w-12 h-1 bg-blue-600 mx-auto mt-4 rounded-full opacity-20"></div>
                        </div>

                        <div className="space-y-6 text-left">
                            {/* STEP 1: CANDIDATE DETAILS */}
                            <div className={`space-y-4 transition-all duration-500 ${verificationStep > 1 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${verificationStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest">Candidate Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Name (as per Certificate)</label>
                                        <div className="relative group">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                            <input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Full Name" className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all dark:text-white" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of Birth</label>
                                        <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Aadhaar Number (12 Digits)</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                            <input value={aadhaar} maxLength={12} onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))} placeholder="0000 0000 0000" className="w-full pl-12 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none tracking-[0.3em] font-mono text-lg transition-all dark:text-white" />
                                        </div>
                                        {verificationStep === 1 && (
                                            <button onClick={handleSendOtp} disabled={aadhaar.length !== 12 || isVerifying} className="px-6 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-30 transition-all hover:scale-105 active:scale-95">
                                                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Link'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2: OTP VERIFICATION */}
                            <div className={`space-y-4 transition-all duration-500 ${verificationStep < 2 ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : verificationStep > 2 ? 'opacity-40 grayscale pointer-events-none' : 'animate-slide-up'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${verificationStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest">Mobile OTP Verification</h3>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1 group">
                                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                        <input value={otp} maxLength={6} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit OTP" className="w-full pl-12 p-3.5 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-100 dark:border-blue-800 focus:border-blue-500 outline-none tracking-[0.5em] font-mono text-xl transition-all dark:text-white" />
                                    </div>
                                    {verificationStep === 2 && (
                                        <button onClick={handleVerifyOtp} disabled={otp.length < 4 || isVerifying} className="px-8 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-30">
                                            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Verify'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sent to Registered Mobile</p>
                                    {otpTimer > 0 ? (
                                        <span className="text-[10px] text-blue-600 font-black">RESEND IN {otpTimer}s</span>
                                    ) : (
                                        <button onClick={() => setOtpTimer(60)} className="text-[10px] text-blue-600 font-black hover:underline">RESEND OTP</button>
                                    )}
                                </div>
                            </div>

                            {/* STEP 3: APPLICATION NUMBER */}
                            <div className={`space-y-4 transition-all duration-500 ${verificationStep < 3 ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : verificationStep > 3 ? 'opacity-40 grayscale pointer-events-none' : 'animate-slide-up'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${verificationStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest">Application Verification</h3>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1 group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                        <input value={appNumber} disabled={!isOtpVerified} onChange={e => setAppNumber(e.target.value.toUpperCase())} placeholder="Enter Application ID" className="w-full pl-12 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all dark:text-white font-black tracking-widest disabled:cursor-not-allowed" />
                                    </div>
                                    {verificationStep === 3 && (
                                        <button onClick={handleFetchCandidate} disabled={!appNumber || isVerifying} className="px-6 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-30">
                                            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Check DB'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* STEP 4: DATABASE RESULTS */}
                            {verificationStep === 4 && fetchedCandidate && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 p-6 rounded-3xl animate-scale-in">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg bg-white shrink-0">
                                            <img src={fetchedCandidate.photo} alt="Candidate" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <UserRoundCheck className="w-3 h-3" /> Record Matched
                                            </p>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white truncate">{fetchedCandidate.name}</h4>
                                            <p className="text-xs font-mono font-bold text-slate-500">APP-ID: {fetchedCandidate.appId}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Candidate data successfully validated against records.</p>
                                    </div>
                                    <button onClick={handleProceedToCapture} className="mt-6 w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95">
                                        Verify Biometrics & Continue
                                    </button>
                                </div>
                            )}
                        </div>

                        <button onClick={() => { setPhase('WELCOME'); setVerificationStep(1); }} className="mt-10 text-slate-400 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
                            <ChevronLeft className="w-3 h-3" /> Choose a different exam
                        </button>
                    </div>
                </div>
            )}

            {/* IDENTITY CAPTURE PHASE */}
            {phase === 'IDENTITY_CAPTURE' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="w-full max-w-4xl bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-center relative">
                        <button 
                            onClick={() => setPhase('VERIFY_APP')}
                            className="absolute top-10 left-10 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                            title="Back to Verification"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-3xl font-black mb-2 dark:text-white uppercase tracking-tighter">Identity Verification</h2>
                        <p className="text-slate-500 mb-8">Please capture three clear views of your face.</p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border-4 border-slate-100 dark:border-slate-800">
                                <video ref={setVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {['front', 'left', 'right'].map(v => (
                                    <div key={v} className="space-y-2">
                                        <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative border-2 border-slate-200 dark:border-slate-700">
                                            {(captures as any)[v] ? <img src={(captures as any)[v]} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold">{v}</div>}
                                        </div>
                                        <button onClick={() => captureView(v as any)} className={`w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all ${(captures as any)[v] ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white shadow-lg'}`}>{(captures as any)[v] ? 'Retake' : `Snap ${v}`}</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button disabled={!captures.front || !captures.left || !captures.right} onClick={runIdentityMatch} className="mt-10 w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black text-xl shadow-2xl disabled:opacity-30 transition-all">Verify Identity</button>
                    </div>
                </div>
            )}

            {/* MATCHING PHASE */}
            {phase === 'MATCHING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in text-center relative">
                    <button 
                        onClick={() => setPhase('IDENTITY_CAPTURE')}
                        className="absolute top-10 left-10 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        title="Back to Capture"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="relative w-32 h-32 mb-8">
                        <div className="absolute inset-0 border-8 border-slate-100 dark:border-slate-800 rounded-full"></div>
                        <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <UserCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Comparing Biometrics</h2>
                    <p className="text-slate-500 animate-pulse">Running neural match with records...</p>
                </div>
            )}

            {/* INSTRUCTIONS PHASE */}
            {phase === 'INSTRUCTIONS' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-2xl border-t-8 border-blue-600 relative">
                        <button 
                            onClick={() => setPhase('IDENTITY_CAPTURE')}
                            className="absolute top-10 left-10 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                            title="Back to Verification"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-4xl font-black mb-6 dark:text-white uppercase tracking-tighter text-center">Exam Rules & Protocols</h2>
                        <div className="space-y-4 mb-10">
                            {[
                                { icon: Monitor, label: "Strict full-screen mode enforced." },
                                { icon: Camera, label: "Real-time AI head and gaze tracking." },
                                { icon: Mic, label: "Background voice monitoring active." },
                                { icon: Laptop, label: "Keyboard interaction is strictly prohibited." },
                                { icon: ShieldAlert, label: "Zero tolerance for integrity violations." }
                            ].map((rule, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <rule.icon className="w-6 h-6 text-blue-600" />
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{rule.label}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={startTest} className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-3">
                            <Play className="w-6 h-6 fill-current" /> Enter Hall
                        </button>
                    </div>
                </div>
            )}

            {/* ARENA PHASE */}
            {phase === 'ARENA' && (
                <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 animate-fade-in overflow-hidden relative select-none">
                    {/* PROFESSIONAL AI WARNING OVERLAY */}
                    {aiWarning && (
                        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md text-white px-10 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up font-bold text-center border-2 border-blue-500/30 flex items-center gap-4 max-w-[90vw]">
                            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" /> {aiWarning}
                        </div>
                    )}

                    <div className="w-full lg:w-72 flex flex-col gap-4">
                        <div className="bg-black rounded-[2rem] aspect-video overflow-hidden border-2 border-red-600 relative shadow-2xl">
                            <video ref={setVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-black text-white">
                                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div> AI INVIGILATOR LIVE
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                <span>Integrity Meter</span>
                                <span className="text-red-600">{warnings}/5 Flags</span>
                             </div>
                             <div className="flex gap-1.5">
                                {[1,2,3,4,5].map(i => <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-700 ${i <= warnings ? 'bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-100 dark:bg-slate-800'}`}></div>)}
                             </div>
                             <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2"><Laptop className="w-3 h-3"/> Keypad Locked</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex-1">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Exam Progress</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {MOCK_QUESTIONS.map((_, i) => (
                                    <button key={i} onClick={() => setCurrentQIdx(i)} className={`aspect-square rounded-xl font-black text-xs transition-all ${currentQIdx === i ? 'bg-blue-600 text-white shadow-lg' : answers[MOCK_QUESTIONS[i].id] ? 'bg-green-100 text-green-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black dark:text-white line-clamp-1">{selectedExam}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Application: {appNumber}</p>
                            </div>
                            <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/30 px-8 py-3 rounded-2xl border border-red-100/50 shadow-inner">
                                <Clock className="w-6 h-6 text-red-600 animate-pulse" />
                                <span className="text-3xl font-mono font-black text-red-600 tabular-nums">
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-y-auto flex flex-col relative group">
                            <div className="flex-1">
                                <div className="flex gap-6 mb-12">
                                    <span className="text-8xl font-black text-blue-600/5 select-none leading-none -mt-3">{currentQIdx + 1}</span>
                                    <h2 className="text-3xl font-black dark:text-white leading-tight">{MOCK_QUESTIONS[currentQIdx].text}</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                                    {MOCK_QUESTIONS[currentQIdx].options?.map((opt, oIdx) => (
                                        <button key={oIdx} onClick={() => setAnswers({...answers, [MOCK_QUESTIONS[currentQIdx].id]: opt})} className={`w-full text-left p-8 rounded-[2rem] border-4 transition-all flex items-center gap-6 group overflow-hidden ${answers[MOCK_QUESTIONS[currentQIdx].id] === opt ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-inner' : 'border-slate-50 dark:border-slate-800/50 hover:bg-slate-50'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all ${answers[MOCK_QUESTIONS[currentQIdx].id] === opt ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-blue-100'}`}>{String.fromCharCode(65 + oIdx)}</div>
                                            <span className={`text-lg font-bold ${answers[MOCK_QUESTIONS[currentQIdx].id] === opt ? 'text-blue-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-12 flex justify-between items-center border-t-2 border-slate-50 dark:border-slate-800 pt-10">
                                <button disabled={currentQIdx === 0} onClick={() => setCurrentQIdx(currentQIdx - 1)} className="p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl disabled:opacity-10 transition-all hover:bg-slate-200"><ChevronLeft className="w-8 h-8 text-slate-400" /></button>
                                <div className="flex gap-4">
                                    {currentQIdx === MOCK_QUESTIONS.length - 1 ? (
                                        <button onClick={finalizeTest} className="px-12 bg-green-600 text-white font-black text-xl rounded-[2rem] shadow-xl hover:bg-green-700 transition-all active:scale-95">Finish Session</button>
                                    ) : (
                                        <button onClick={() => setCurrentQIdx(currentQIdx + 1)} className="px-10 bg-blue-600 text-white rounded-[2rem] shadow-xl hover:bg-blue-700 transition-all active:scale-95"><ChevronRight className="w-8 h-8" /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUBMITTING PHASE */}
            {phase === 'SUBMITTING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in text-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-8" />
                    <h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Finalizing Response</h2>
                    <p className="text-slate-500">Encrypting behavioral logs and indexing results...</p>
                </div>
            )}

            {/* BLOCKED PHASE */}
            {phase === 'BLOCKED' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mb-8 animate-bounce">
                        <AlertTriangle className="w-12 h-12 text-red-600" />
                    </div>
                    <h2 className="text-4xl font-black text-red-600 uppercase tracking-tighter mb-4">Session Terminated</h2>
                    <p className="text-slate-500 max-w-md mb-10 leading-relaxed font-bold">
                        {terminationMessage || "A security protocol violation was detected. Unauthorized actions have resulted in immediate termination of this assessment."}
                    </p>
                    <button onClick={() => window.location.reload()} className="px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black text-xl hover:bg-red-700 shadow-2xl transition-all">Exit Hall</button>
                </div>
            )}
        </div>
    );
};

export default ExaminationCenter;
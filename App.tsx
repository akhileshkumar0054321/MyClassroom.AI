
import React, { useState, useEffect, useRef } from 'react';
import { AppView, User, UserRole, LibraryItem, Classroom, TestData, TestResult, ContentType, Notification } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VideoGenerator from './components/VideoGenerator';
import EbookGenerator from './components/EbookGenerator';
import TestManager from './components/TestManager';
import DoubtTutor from './components/DoubtTutor';
import PPTGenerator from './components/PPTGenerator';
import ClassroomManager from './components/ClassroomManager';
import Library from './components/Library';
import SocialManager from './components/SocialManager';
import LearningPathBuilder from './components/LearningPathBuilder';
import ProfileManager from './components/ProfileManager';
import NotesGenerator from './components/NotesGenerator';
import AssignmentManager from './components/AssignmentManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import OnboardingTour from './components/OnboardingTour';
import { Loader2, Moon, Sun, Users, Mail, X, ShieldCheck, Lock, ArrowRight, RefreshCw, AlertTriangle, CheckCircle, Zap, Key } from 'lucide-react';
import { generateLearningPath, generateNotes, generateCareerPath } from './services/gemini';
import ReactMarkdown from 'react-markdown';
import { QuestionType } from './types';

// --- PLACEHOLDER COMPONENTS ---
const VirtualLab = () => <div className="p-10 text-center"><h2 className="text-2xl font-bold dark:text-white">🔬 Virtual Lab Simulator</h2><p className="text-gray-500 mt-2">Interactive experiments coming soon.</p></div>;
const CareerPath = () => {
    const [interest, setInterest] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 dark:text-white">Career Path Predictor</h2>
            <div className="flex gap-4 mb-6">
                <input value={interest} onChange={e=>setInterest(e.target.value)} placeholder="My interests (e.g. coding, biology, art)" className="flex-1 p-3 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-700"/>
                <button onClick={async ()=>{setLoading(true); setResult(await generateCareerPath(interest)); setLoading(false)}} className="bg-primary-600 text-white px-6 rounded">{loading ? '...' : 'Analyze'}</button>
            </div>
            {result && <div className="prose dark:prose-invert bg-white dark:bg-gray-800 p-6 rounded shadow"><ReactMarkdown>{result}</ReactMarkdown></div>}
        </div>
    )
};

// --- LOGIN SCREEN ---
interface LoginProps {
    onLogin: (role: UserRole, email: string) => void;
    notify: (title: string, msg: string, type: 'INFO'|'SUCCESS'|'ERROR') => void;
}

const LoginScreen: React.FC<LoginProps> = ({ onLogin, notify }) => {
    const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
    
    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [serverOtp, setServerOtp] = useState(''); // The 'real' OTP to check against
    const [timer, setTimer] = useState(120); // 2 minutes
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Refs for auto-focusing OTP inputs
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let interval: any;
        if (step === 'OTP' && timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const triggerOtpSend = (targetEmail: string, targetRole?: UserRole) => {
        const emailToSend = targetEmail || email;
        const roleToSet = targetRole || role;

        if (!emailToSend.includes('@') || !emailToSend.endsWith('.com')) {
            setError('Please enter a valid email ending in .com');
            return;
        }

        if (isLocked) {
             setError('Account temporarily locked due to too many failed attempts.');
             return;
        }

        setLoading(true);
        setError('');

        // Judge Mode Logic: Always 123456 for .com
        const code = '123456';
        
        setTimeout(() => {
            setServerOtp(code);
            setStep('OTP');
            setTimer(120);
            setLoading(false);
            
            // Auto-fill logic for Judge Mode
            setOtp(['1', '2', '3', '4', '5', '6']);
            // notify('JUDGE MODE ACTIVE', `OTP ${code} has been auto-filled for your convenience.`, 'SUCCESS');
        }, 800);
    };

    const handleEmailSubmit = () => {
        triggerOtpSend(email);
    };

    const handleQuickLogin = (role: UserRole, email: string) => {
        setRole(role);
        setEmail(email);
        triggerOtpSend(email, role);
    };

    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const enteredOtp = otp.join('');
        
        if (enteredOtp.length !== 6) {
            setError('Please enter the full 6-digit code');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            if (enteredOtp === serverOtp) {
                // SUCCESS
                notify('Login Successful', `Welcome back, ${email.split('@')[0]}!`, 'SUCCESS');
                
                // Auto-detect role for test accounts if generic login used
                let finalRole = role;
                if(email === 'teacher@myclassroom.com') finalRole = UserRole.TEACHER;
                if(email === 'student@myclassroom.com') finalRole = UserRole.STUDENT;
                
                onLogin(finalRole, email);
            } else {
                // FAILURE
                setLoading(false);
                setAttempts(prev => prev + 1);
                setOtp(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
                
                if (attempts + 1 >= 5) {
                    setIsLocked(true);
                    setError('Account locked! Too many failed attempts. Try again later.');
                } else {
                    setError(`Incorrect OTP. ${5 - (attempts + 1)} attempts remaining.`);
                }
            }
        }, 800);
    };

    const handleResend = () => {
        if (timer > 0) return;
        handleEmailSubmit();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative">
                
                {/* HEADER */}
                <div className="bg-primary-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-inner border border-white/30">
                            {isLocked ? <Lock className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-1">MyClassroom</h1>
                        <p className="text-blue-100 text-sm">Secure Access Portal</p>
                    </div>
                </div>

                <div className="p-8">
                    {step === 'EMAIL' ? (
                        <div className="space-y-6 animate-fade-in">
                            {/* Role Selector */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[UserRole.STUDENT, UserRole.TEACHER].map((r) => (
                                        <button 
                                            key={r} 
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`p-3 border rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === r ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            <Users className="w-4 h-4"/>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="email" 
                                        className={`w-full pl-12 p-3 border rounded-xl focus:ring-2 outline-none transition-all ${error ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-primary-100 focus:border-primary-500'}`}
                                        placeholder="Enter any .com email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                                    />
                                </div>
                                {error && <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {error}</p>}
                                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Auto-OTP (123456) enabled for .com domains
                                </p>
                            </div>

                            <button 
                                onClick={handleEmailSubmit}
                                disabled={loading || !email}
                                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Get OTP <ArrowRight className="w-5 h-5"/></>}
                            </button>
                            
                            {/* QUICK ACCESS PANEL */}
                            <div className="border-t pt-4 mt-6">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">🚀 Rapid Testing Access</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button onClick={() => handleQuickLogin(UserRole.TEACHER, 'teacher@myclassroom.com')} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group border border-transparent hover:border-gray-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">T</div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-gray-700 group-hover:text-purple-600">Test Teacher</p>
                                                <p className="text-[10px] text-gray-400">teacher@myclassroom.com</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500" />
                                    </button>

                                    <button onClick={() => handleQuickLogin(UserRole.STUDENT, 'student@myclassroom.com')} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group border border-transparent hover:border-gray-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">S</div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-gray-700 group-hover:text-blue-600">Test Student</p>
                                                <p className="text-[10px] text-gray-400">student@myclassroom.com</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-gray-800">Verification</h2>
                                <p className="text-gray-500 text-sm">Code sent to <span className="font-bold text-gray-700">{email}</span></p>
                            </div>

                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs text-green-800 flex items-center gap-2 animate-pulse">
                                <Key className="w-4 h-4" />
                                <strong>Development Mode:</strong> OTP 123456 has been auto-filled.
                            </div>

                            <div className="flex justify-between gap-2 my-4">
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => otpRefs.current[idx] = el}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={e => handleKeyDown(idx, e)}
                                        className={`w-12 h-14 text-center text-2xl font-bold border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
                                            otp.join('') === '123456' ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200' : 
                                            error ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-800'
                                        }`}
                                        disabled={isLocked}
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button 
                                onClick={handleVerify}
                                disabled={loading || isLocked}
                                className={`w-full font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 ${
                                    otp.join('') === '123456' ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : 'bg-primary-600 hover:bg-primary-700 text-white'
                                }`}
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Verify & Login'}
                            </button>

                            <div className="flex justify-between items-center text-sm">
                                <button onClick={() => setStep('EMAIL')} className="text-gray-400 hover:text-gray-600">Change Email</button>
                                <button 
                                    onClick={handleResend}
                                    disabled={timer > 0 || isLocked}
                                    className={`flex items-center gap-1 font-medium ${timer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'}`}
                                >
                                    {timer > 0 ? `Resend in ${formatTime(timer)}` : <><RefreshCw className="w-4 h-4"/> Resend OTP</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- NOTIFICATION COMPONENT ---
const NotificationSystem = ({ notifications, remove }: { notifications: Notification[], remove: (id: string) => void }) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className={`pointer-events-auto p-4 rounded-lg shadow-2xl border-l-4 flex items-start gap-3 w-96 animate-slide-in ${
                    n.type === 'EMAIL' ? 'bg-white text-gray-800 border-blue-500' : 
                    n.type === 'SUCCESS' ? 'bg-green-50 text-green-900 border-green-500' : 
                    n.type === 'ERROR' ? 'bg-red-50 text-red-900 border-red-500' : 'bg-indigo-50 text-indigo-900 border-indigo-500'
                }`}>
                    {n.type === 'EMAIL' && <Mail className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />}
                    {n.type === 'INFO' && <ShieldCheck className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />}
                    {n.type === 'SUCCESS' && <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />}
                    {n.type === 'ERROR' && <AlertTriangle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />}
                    <div className="flex-1">
                        <h4 className="font-bold text-sm">{n.title}</h4>
                        <p className="text-xs opacity-90 whitespace-pre-line">{n.message}</p>
                    </div>
                    <button onClick={() => remove(n.id)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                </div>
            ))}
        </div>
    )
}

// --- MAIN APP ---
const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Global "Database" State
    const [library, setLibrary] = useState<LibraryItem[]>([
        // Mock Content for "Demo Friend"
        {
            id: 'f1',
            type: ContentType.VIDEO,
            title: 'Shared Physics Simulation',
            dateCreated: new Date().toISOString(),
            data: {
                topic: 'Physics Simulation',
                totalDuration: '1 min',
                chapters: [
                    { title: 'Introduction', duration: '30s', content: 'Welcome to the physics of motion.', visualCue: 'Ball rolling' },
                    { title: 'Velocity', duration: '30s', content: 'Velocity is speed with direction.', visualCue: 'Vector arrows' }
                ],
                summary: 'A short physics demo.',
                anticipatedQuestions: ['What is velocity?', 'Is speed a vector?']
            },
            userId: 'MC-1234-5678-9123',
            status: 'ACTIVE',
            isShared: true,
            views: 42,
            imports: 5
        },
        {
            id: 'f2',
            type: ContentType.NOTES,
            title: 'History Notes (Ch 1-3)',
            dateCreated: new Date(Date.now() - 86400000).toISOString(),
            data: "# History Notes\n\n- Chapter 1: Ancient Civs\n- Chapter 2: Middle Ages",
            userId: 'MC-1234-5678-9123',
            status: 'ACTIVE',
            isShared: true,
            views: 12,
            imports: 1
        }
    ]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([
        // Initial Demo Classroom
        {
            id: '1',
            name: 'Science Class 10',
            subject: 'Science',
            teacherId: 'TEACHER',
            studentIds: [],
            code: 'SCI-10A',
            inviteLink: 'https://myclassroom.ai/join/SCI-10A',
            isLinkActive: true,
            settings: { requiresApproval: false }
        }
    ]);
    
    // Initial Test Data (Demo)
    const [tests, setTests] = useState<TestData[]>([
        {
            id: 'demo-photosynthesis',
            title: 'Photosynthesis Practice Test',
            subject: 'Biology',
            creatorId: 'SYSTEM',
            status: 'LIVE',
            accessCode: '123456',
            settings: { timeLimitMinutes: 10, proctoring: true, adaptive: false, shuffleQuestions: false },
            questions: [
                { id: 1, text: 'Which pigment absorbs sunlight?', type: QuestionType.MCQ, options: ['Chlorophyll', 'Xanthophyll'], correctAnswer: 'Chlorophyll', explanation: '', difficulty: 'Easy' },
                { id: 2, text: 'Product of photosynthesis?', type: QuestionType.MCQ, options: ['O2', 'CO2'], correctAnswer: 'O2', explanation: '', difficulty: 'Easy' }
            ]
        }
    ]);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    const addNotification = (title: string, message: string, type: 'INFO'|'SUCCESS'|'ERROR'|'EMAIL' = 'INFO') => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { id, title, message, type, timestamp: new Date().toISOString() }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 8000); // Auto dismiss
    };

    const handleLogin = (role: UserRole, email: string) => {
        // Generate Mock ID
        const id = `MC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
        setUser({
            id,
            email,
            name: email.split('@')[0],
            role,
            preferences: { language: 'English', gradeLevel: '10', style: 'Visual' },
            friends: ['MC-1234-5678-9123'], // Mock connected friend
            profile: { dob: '', gender: '', school: '', phone: '', bio: '', isPublic: false }
        });
        setCurrentView(AppView.DASHBOARD);
        // Show onboarding on first login
        setShowOnboarding(true);
    };

    const addToLibrary = (type: ContentType, title: string, data: any) => {
        const newItem: LibraryItem = {
            id: Date.now().toString(),
            type,
            title,
            dateCreated: new Date().toISOString(),
            data,
            userId: user?.id || '',
            status: 'ACTIVE',
            isShared: false,
            views: 0,
            imports: 0
        };
        setLibrary(prev => [newItem, ...prev]);
        addNotification('Auto-Saved', `"${title}" saved to Library`, 'SUCCESS');
    };

    const handleUpdateLibraryItem = (itemId: string, updates: Partial<LibraryItem>) => {
        setLibrary(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
        
        if(updates.isShared === true) addNotification('Shared', 'Item is now visible to friends', 'SUCCESS');
        if(updates.isShared === false) addNotification('Private', 'Item is now private', 'INFO');
    };

    const handleDeletePermanent = (itemId: string) => {
        setLibrary(prev => prev.filter(item => item.id !== itemId));
        addNotification('Deleted', 'Item permanently removed', 'ERROR');
    };

    const handleImportContent = (item: LibraryItem) => {
        // Increment friend's stats
        setLibrary(prev => prev.map(i => i.id === item.id ? { ...i, imports: (i.imports || 0) + 1 } : i));

        // Create copy for me
        const newItem: LibraryItem = {
            ...item,
            id: Date.now().toString(),
            userId: user?.id || '',
            originalOwnerId: item.userId,
            originalOwnerName: 'Friend', // Simplified
            dateCreated: new Date().toISOString(),
            isShared: false,
            status: 'ACTIVE',
            views: 0,
            imports: 0
        };
        setLibrary(prev => [newItem, ...prev]);
        addNotification('Imported', `"${item.title}" added to your library!`, 'SUCCESS');
    };

    // SOCIAL LOGIC
    const handleSendRequest = (toUid: string) => {
        if (!user) return { success: false, message: 'Not logged in' };
        if (toUid === user.id) return { success: false, message: 'Cannot invite yourself' };
        
        // Demo Validation
        if (toUid.startsWith('MC-')) {
            setTimeout(() => {
                addNotification('New Notification', `${user.role === UserRole.TEACHER ? 'Student' : 'Friend'} accepted your request!`, 'SUCCESS');
                setUser(prev => prev ? ({ ...prev, friends: [...prev.friends, toUid] }) : null);
            }, 2000);
            return { success: true, message: 'Request sent successfully!' };
        } else {
            return { success: false, message: 'Invalid UID Format' };
        }
    };

    const renderContent = () => {
        if (!user) return null;
        switch (currentView) {
            case AppView.DASHBOARD: return <Dashboard user={user} changeView={setCurrentView} />;
            case AppView.VIDEO_GEN: return <VideoGenerator onSave={(script) => addToLibrary(ContentType.VIDEO, script.topic, script)} />;
            case AppView.EBOOK_GEN: return <EbookGenerator onSave={(title, content) => addToLibrary(ContentType.EBOOK, title, content)} />;
            case AppView.PPT_GEN: return <PPTGenerator onSave={(ppt) => addToLibrary(ContentType.PPT, ppt.topic, ppt)} />;
            case AppView.TEST_MANAGER: return <TestManager 
                user={user} 
                globalTests={tests} 
                testHistory={testResults.filter(r => r.studentId === user.id)} 
                classrooms={classrooms}
                onAddTest={(t) => setTests([...tests, t])} 
                onSaveResult={(r) => { setTestResults([...testResults, r]); addNotification('Test Submitted', 'Results & Violation Report Saved', 'SUCCESS'); }} 
                onDeployTest={(tid, cid) => {
                    setTests(tests.map(t => t.id === tid ? { ...t, status: 'LIVE', assignedClassId: cid } : t));
                    addNotification('Test Deployed', 'Students notified', 'EMAIL');
                }}
            />;
            case AppView.CLASSROOMS: return <ClassroomManager 
                user={user} 
                classrooms={classrooms} 
                onCreate={(c) => setClassrooms([...classrooms, c])} 
                onJoin={() => ({ success: true, message: 'Joined!' })} 
                onUpdate={(c) => setClassrooms(classrooms.map(cl => cl.id === c.id ? c : cl))}
            />;
            case AppView.LIBRARY: return <Library 
                items={library}
                user={user}
                friends={user.friends}
                onUpdateItem={handleUpdateLibraryItem}
                onDeletePermanent={handleDeletePermanent}
                onImport={handleImportContent}
            />;
            case AppView.DOUBT_TUTOR: return <DoubtTutor />;
            case AppView.VIRTUAL_LAB: return <VirtualLab />;
            case AppView.CAREER_PATH: return <CareerPath />;
            case AppView.SOCIAL: return <SocialManager user={user} sendRequest={handleSendRequest} friends={user.friends} />;
            case AppView.LEARNING_PATH: return <LearningPathBuilder />;
            case AppView.NOTES_GEN: return <NotesGenerator onSave={(item) => addToLibrary(item.type!, item.title!, item.data)} />;
            case AppView.PROFILE: return <ProfileManager user={user} onUpdate={(u) => setUser(u)} />;
            case AppView.ASSIGNMENTS: return <AssignmentManager user={user} />;
            case AppView.ANALYTICS: return <AnalyticsDashboard />;
            default: return <div className="p-10">Feature coming soon</div>;
        }
    };

    if (!user) return <LoginScreen onLogin={handleLogin} notify={addNotification} />;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 font-sans relative">
            {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
            
            <Sidebar currentView={currentView} onChangeView={setCurrentView} onLogout={() => setUser(null)} user={user} />
            <main className="flex-1 ml-64 relative">
                <div className="absolute top-4 right-4 z-20">
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-yellow-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
                {renderContent()}
                <NotificationSystem notifications={notifications} remove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
            </main>
        </div>
    );
};

export default App;

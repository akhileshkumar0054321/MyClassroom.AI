import React, { useState, useEffect } from 'react';
import { 
  AppView, User, UserRole, UserProfile, Notification, 
  TestData, TestResult, Classroom, Assignment, LibraryItem, ContentType,
  QuestionType, AssignmentSubmission
} from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VideoGenerator from './components/VideoGenerator';
import EbookGenerator from './components/EbookGenerator';
import NotesGenerator from './components/NotesGenerator';
import PPTGenerator from './components/PPTGenerator';
import TestManager from './components/TestManager';
import ExaminationCenter from './components/ExaminationCenter';
import DoubtTutor from './components/DoubtTutor';
import LearningPathBuilder from './components/LearningPathBuilder';
import ClassroomManager from './components/ClassroomManager';
import Library from './components/Library';
import AssignmentManager from './components/AssignmentManager';
import SocialManager from './components/SocialManager';
import ProfileManager from './components/ProfileManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import JudgeControls from './components/JudgeControls';
import OnboardingTour from './components/OnboardingTour';
import ExamPortalLogin from './components/ExamPortalLogin';
import InvigilatorLogin from './components/InvigilatorLogin';
import InvigilatorDashboard from './components/InvigilatorDashboard';
import { generateCareerPath } from './services/gemini';
import { 
    Bell, X, LogIn, UserCircle, GraduationCap, Briefcase, 
    Beaker, Loader2, Play, CheckCircle, Sparkles, ShieldAlert, FileText, ShieldCheck, Shield,
    Mail, ArrowRight, Lock, Key, Globe
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- MOCK DATA ---
const MOCK_PROFILE: UserProfile = {
  dob: '2005-08-15',
  gender: 'Male',
  school: 'Springfield High',
  phone: '+1 555-0123',
  bio: 'Aspiring Physicist',
  isPublic: true
};

const MOCK_STUDENT: User = {
  id: 'MC-1234-5678-9012',
  name: 'Alex Miller',
  email: 'alex.miller@student.com',
  role: UserRole.STUDENT,
  preferences: { language: 'English', gradeLevel: '10', style: 'Visual' },
  profile: MOCK_PROFILE,
  friends: []
};

const MOCK_TEACHER: User = {
  id: 'MC-TEACH-8888',
  name: 'Prof. Sarah Jenkins',
  email: 'sarah.j@school.com',
  role: UserRole.TEACHER,
  preferences: { language: 'English', gradeLevel: 'All', style: 'Formal' },
  profile: { ...MOCK_PROFILE, school: 'Springfield High Dept of Science' },
  friends: []
};

const INITIAL_CLASSROOMS: Classroom[] = [
    {
        id: 'c1',
        name: 'Science Class 10',
        subject: 'Physics',
        teacherId: 'MC-TEACH-8888',
        studentIds: ['MC-1234-5678-9012', 's2', 's3'],
        code: 'SCI-10A',
        inviteLink: 'https://myclassroom.ai/join/SCI-10A',
        isLinkActive: true
    }
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
    {
        id: 'a1',
        title: 'Kinematics Practice',
        description: 'Solve the attached problems regarding velocity and acceleration.',
        category: 'ASSIGNMENT',
        classroomId: 'c1',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'PUBLISHED',
        type: 'AI',
        questions: [
            { id: 1, text: 'Define Velocity.', type: QuestionType.SHORT, marks: 2, difficulty: 'Easy', explanation: 'Vector quantity rate of change of position.' },
            { id: 2, text: 'A car moves at 20m/s. How far in 10s?', type: QuestionType.NUMERICAL, marks: 3, difficulty: 'Medium', explanation: 'd = v*t = 20*10 = 200m', correctAnswer: '200m', modelAnswer: '200m' }
        ],
        submissions: [],
        subject: 'Physics',
        totalMarks: 5
    }
];

const INITIAL_TESTS: TestData[] = [
    {
        id: 'demo-photosynthesis',
        title: 'Photosynthesis Pop Quiz',
        subject: 'Biology',
        creatorId: 'MC-TEACH-8888',
        assignedClassIds: ['c1'],
        status: 'LIVE',
        accessCode: 'BIO101',
        resultsPublished: false,
        questions: [
             { id: 1, text: 'What pigment is responsible for green color in plants?', type: QuestionType.MCQ, options: ['Chlorophyll', 'Xanthophyll', 'Carotene', 'Anthocyanin'], correctAnswer: 'Chlorophyll', difficulty: 'Easy', explanation: 'Chlorophyll absorbs light.' },
             { id: 2, text: 'Where does the light-dependent reaction take place?', type: QuestionType.MCQ, options: ['Stroma', 'Thylakoid', 'Mitochondria', 'Nucleus'], correctAnswer: 'Thylakoid', difficulty: 'Medium', explanation: 'Thylakoid membranes contain the photosystems.' }
        ],
        settings: { 
            timeLimitMinutes: 10, 
            proctoring: true, 
            requireWebcam: true, 
            preventTabSwitch: true,
            allowCalculator: false,
            allowInternet: false,
            adaptive: false, 
            shuffleQuestions: true 
        }
    }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Data Stores
  const [classrooms, setClassrooms] = useState<Classroom[]>(INITIAL_CLASSROOMS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [tests, setTests] = useState<TestData[]>(INITIAL_TESTS);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Virtual Lab & Career Path State
  const [careerResult, setCareerResult] = useState('');
  const [isGeneratingCareer, setIsGeneratingCareer] = useState(false);

  // Login State
  const [loginStep, setLoginStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>(UserRole.STUDENT);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = (role: UserRole) => {
      const u = role === UserRole.TEACHER ? MOCK_TEACHER : MOCK_STUDENT;
      setUser(u);
      setView(AppView.DASHBOARD);
      if (!localStorage.getItem('onboarding_done')) {
          setOnboardingComplete(false);
      } else {
          setOnboardingComplete(true);
      }
  };

  const handleGuestExamLogin = () => {
    setView(AppView.EXAM_LOGIN);
  };

  const handleExamPortalAuth = (examId: string) => {
    console.log("App: handleExamPortalAuth called with", examId);
    const guestUser: User = {
        id: `GUEST-EXAM-${Math.floor(Math.random()*10000)}`,
        name: 'Guest User',
        email: 'guest@myclassroom.ai',
        role: UserRole.ADMIN,
        preferences: { language: 'English', gradeLevel: '10', style: 'Visual' },
        profile: { ...MOCK_PROFILE, school: 'Examination Portal' },
        friends: []
    };
    console.log("App: Setting user", guestUser);
    setUser(guestUser);
    console.log("App: Setting selectedExamId", examId);
    setSelectedExamId(examId);
    console.log("App: Setting view to EXAMINATION");
    setView(AppView.EXAMINATION);
    setOnboardingComplete(true);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(!loginEmail.toLowerCase().endsWith('.com')) {
        alert("Please enter a valid .com email address.");
        return;
    }
    setIsLoggingIn(true);
    // Simulate sending OTP to Gmail
    setTimeout(() => {
        setIsLoggingIn(false);
        setLoginStep('OTP');
        addNotification('OTP Sent', `Testing code '123456' has been sent to ${loginEmail}`, 'SUCCESS');
    }, 1200);
  };

  const handleGoogleLogin = () => {
      setIsGoogleLoading(true);
      // Simulate Google Identity Service window
      setTimeout(() => {
          setIsGoogleLoading(false);
          setLoginEmail('alex.miller@gmail.com');
          setLoginStep('OTP');
          addNotification('Google Account Linked', "Code '123456' sent to your Gmail.", 'SUCCESS');
      }, 1500);
  };

  const handleVerifyLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow any 6-digit code for demo purposes, but keep '123456' as the suggested one
    if (loginOtp.length !== 6) {
        alert("Please enter a 6-digit verification code.");
        return;
    }
    setIsLoggingIn(true);
    setTimeout(() => {
        setIsLoggingIn(false);
        const baseUser = loginRole === UserRole.TEACHER ? MOCK_TEACHER : MOCK_STUDENT;
        const mockUser: User = {
            ...baseUser,
            name: loginEmail.split('@')[0],
            email: loginEmail,
            role: loginRole,
        };
        setUser(mockUser);
        setView(AppView.DASHBOARD);
        if (!localStorage.getItem('onboarding_done')) {
            setOnboardingComplete(false);
        } else {
            setOnboardingComplete(true);
        }
    }, 1000);
  };

  const handleLogout = () => {
      setUser(null);
      setView(AppView.LOGIN);
      setLoginStep('DETAILS');
      setLoginEmail('');
      setLoginOtp('');
  };

  const addNotification = (title: string, message: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'EMAIL') => {
      const newNotif: Notification = {
          id: Date.now().toString(),
          title,
          message,
          type,
          timestamp: new Date().toLocaleTimeString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 5000);
  };

  const handleCompleteOnboarding = () => {
      setOnboardingComplete(true);
      localStorage.setItem('onboarding_done', 'true');
  };

  const resetDemo = () => {
      localStorage.removeItem('onboarding_done');
      setTestResults([]);
      setAssignments(INITIAL_ASSIGNMENTS);
      window.location.reload();
  };

  const renderVirtualLab = () => (
      <div className="p-6 max-w-4xl mx-auto text-center h-[80vh] flex flex-col items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
              <Beaker className="w-24 h-24 text-purple-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold dark:text-white mb-4">AI Virtual Lab (Preview)</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Perform simulated experiments in Physics and Chemistry safely. 
                  Currently available: "Pendulum Swing" & "Acid-Base Titration".
              </p>
              <button className="bg-purple-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-purple-700 hover:scale-105 transition-all">
                  Launch Simulation
              </button>
          </div>
      </div>
  );

  const renderCareerPath = () => (
      <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Briefcase className="w-8 h-8"/></div>
              <h2 className="text-3xl font-bold dark:text-white">AI Career Counselor</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold mb-4 dark:text-white">Analyze My Interests</h3>
                  <textarea 
                    id="career-input"
                    className="w-full p-3 border rounded-lg h-32 mb-4 dark:bg-gray-900 dark:text-white"
                    placeholder="e.g. I love coding, solving math puzzles, and building robots."
                  />
                  <button 
                    onClick={async () => {
                        setIsGeneratingCareer(true);
                        const input = (document.getElementById('career-input') as HTMLTextAreaElement).value;
                        const res = await generateCareerPath(input);
                        setCareerResult(res);
                        setIsGeneratingCareer(false);
                    }}
                    disabled={isGeneratingCareer}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"
                  >
                      {isGeneratingCareer ? <Loader2 className="animate-spin"/> : 'Generate Career Path'}
                  </button>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[500px] prose dark:prose-invert">
                  {careerResult ? <ReactMarkdown>{careerResult}</ReactMarkdown> : <div className="text-gray-400 text-center mt-10">Results will appear here...</div>}
              </div>
          </div>
      </div>
  );

  if (!user || view === AppView.LOGIN || view === AppView.EXAM_LOGIN || view === AppView.INVIGILATOR_LOGIN) {
      if (view === AppView.EXAM_LOGIN) {
          return <ExamPortalLogin 
            onLogin={handleExamPortalAuth} 
            onBack={() => setView(AppView.LOGIN)} 
            addNotification={addNotification}
          />;
      }
      if (view === AppView.INVIGILATOR_LOGIN) {
          return <InvigilatorLogin 
            onLogin={(u) => { setUser(u); setView(AppView.INVIGILATOR_DASHBOARD); }} 
            onBack={() => setView(AppView.LOGIN)} 
          />;
      }
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-5xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[650px] animate-fade-in border border-gray-100 dark:border-gray-700">
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-6">
                           <Sparkles className="w-6 h-6 text-yellow-300" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">MyClassroom AI</h1>
                        <p className="text-blue-100 text-lg leading-relaxed">
                            The next generation of personalized learning. Powered by OpenAI.
                        </p>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="bg-white/20 p-2 rounded-lg"><Play className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="font-bold">AI Video Lessons</h3>
                                <p className="text-xs text-blue-200">Instant educational content generation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="bg-white/20 p-2 rounded-lg"><ShieldCheck className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="font-bold">Enterprise Proctoring</h3>
                                <p className="text-xs text-blue-200">Secure AI-monitored testing environment</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="bg-white/20 p-2 rounded-lg"><FileText className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="font-bold">Smart Revision</h3>
                                <p className="text-xs text-blue-200">Auto-generated smart notes & study paths</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-12 flex flex-col justify-center bg-white dark:bg-gray-800">
                    {loginStep === 'DETAILS' ? (
                        <>
                            <div className="mb-6 flex justify-center">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
                                    <Sparkles className="w-10 h-10 text-blue-600 animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight text-center uppercase">Access Hub</h2>
                            <p className="text-gray-500 mb-8 text-center">Identity verification required for exam security.</p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button 
                                    onClick={() => setLoginRole(UserRole.STUDENT)}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${loginRole === UserRole.STUDENT ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-4 ring-blue-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                                >
                                    <UserCircle className="w-8 h-8" />
                                    <span className="font-bold text-sm">Student</span>
                                </button>

                                <button 
                                    onClick={() => setLoginRole(UserRole.TEACHER)}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${loginRole === UserRole.TEACHER ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-4 ring-blue-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                                >
                                    <GraduationCap className="w-8 h-8" />
                                    <span className="font-bold text-sm">Teacher</span>
                                </button>
                                
                                <button 
                                    onClick={handleGuestExamLogin}
                                    className="p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2 transition-all hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 group col-span-2"
                                >
                                    <ShieldCheck className="w-8 h-8 text-gray-400 group-hover:text-red-500" />
                                    <span className="font-bold text-sm">Exam Portal</span>
                                </button>
                            </div>

                            <button 
                                onClick={handleGoogleLogin}
                                disabled={isGoogleLoading}
                                className="w-full py-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all mb-6 shadow-sm disabled:opacity-50"
                            >
                                {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5 text-blue-600" />}
                                Login with Google
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="px-2 bg-white dark:bg-gray-800 text-gray-400">or use school email</span></div>
                            </div>

                            <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors w-5 h-5" />
                                    <input 
                                        type="email" 
                                        required
                                        value={loginEmail}
                                        onChange={e => setLoginEmail(e.target.value)}
                                        placeholder="Email Address (.com required)"
                                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoggingIn}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95 text-lg uppercase tracking-wider"
                                >
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Verification"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="animate-fade-in text-center">
                            <button onClick={() => setLoginStep('DETAILS')} className="text-gray-400 hover:text-blue-600 font-bold text-sm mb-6 flex items-center gap-1 transition-colors mx-auto">
                                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Account Selection
                            </button>
                            
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Key className="w-10 h-10 text-blue-600" />
                            </div>
                            
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Verify Identity</h2>
                            <p className="text-gray-500 mb-8 leading-relaxed">Enter the 6-digit code sent to <br/><span className="font-bold text-blue-600">{loginEmail}</span>.</p>

                            <form onSubmit={handleVerifyLoginOtp} className="space-y-6">
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-600 transition-colors w-5 h-5" />
                                    <input 
                                        value={loginOtp}
                                        onChange={e => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        className="w-full pl-12 pr-4 py-5 rounded-2xl border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-blue-600 transition-all outline-none font-black text-3xl tracking-[0.4em] text-center"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoggingIn || loginOtp.length < 6}
                                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all active:scale-95 text-xl"
                                >
                                    {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle className="w-6 h-6"/> Confirm Identity</>}
                                </button>
                                <div className="pt-4">
                                    <p className="text-sm text-gray-400">
                                        Didn't receive code? <button type="button" className="text-blue-600 font-bold hover:underline" onClick={() => addNotification('OTP Resent', 'Code 123456 has been resent.', 'INFO')}>Resend Code</button>
                                    </p>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-700"></div></div>
                        <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] font-bold"><span className="px-3 bg-white dark:bg-gray-800 text-gray-300">Quick Access</span></div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <button 
                            onClick={() => handleLogin(UserRole.TEACHER)} 
                            className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-600 transition-all hover:border-blue-200"
                        >
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <GraduationCap className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Teacher Portal</span>
                        </button>
                        <button 
                            onClick={() => setView(AppView.INVIGILATOR_LOGIN)}
                            className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-600 transition-all hover:border-blue-200"
                        >
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Invigilator</span>
                        </button>
                        <button 
                            onClick={() => handleLogin(UserRole.STUDENT)} 
                            className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-600 transition-all hover:border-blue-200"
                        >
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                <UserCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Student Portal</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  const isExaminationView = view === AppView.EXAMINATION || view === AppView.INVIGILATOR_DASHBOARD;

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {!isExaminationView && (
          <Sidebar 
            currentView={view} 
            onChangeView={setView} 
            onLogout={handleLogout} 
            user={user}
          />
      )}
      
      <main className={`flex-1 relative transition-all duration-300 ${isExaminationView ? 'ml-0' : 'ml-64'}`}>
         <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
             {notifications.map(n => (
                 <div key={n.id} className={`p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-3 animate-slide-in min-w-[320px] border border-white/20 backdrop-blur-md ${
                     n.type === 'SUCCESS' ? 'bg-green-600 text-white' : 
                     n.type === 'ERROR' ? 'bg-red-600 text-white' : 
                     'bg-blue-600 text-white'
                 }`}>
                     <div className="bg-white/20 p-2 rounded-lg">
                        <Bell className="w-5 h-5" />
                     </div>
                     <div className="flex-1">
                         <p className="font-bold text-sm tracking-tight">{n.title}</p>
                         <p className="text-xs opacity-90">{n.message}</p>
                     </div>
                     <button onClick={() => setNotifications(prev => prev.filter(not => not.id !== n.id))} className="text-white/50 hover:text-white">
                        <X className="w-4 h-4" />
                     </button>
                 </div>
             ))}
         </div>

         {!onboardingComplete && !isExaminationView && <OnboardingTour onComplete={handleCompleteOnboarding} />}

         {!isExaminationView && (
             <JudgeControls 
                onLogout={handleLogout} 
                onReset={resetDemo} 
                userRole={user.role} 
                onLoadScenario={(s) => { 
                    if (s === 'TEACHER_DEMO') { handleLogout(); setTimeout(() => handleLogin(UserRole.TEACHER), 100); }
                    else { handleLogout(); setTimeout(() => handleLogin(UserRole.STUDENT), 100); setView(AppView.TEST_MANAGER); }
                }}
             />
         )}

         {view === AppView.DASHBOARD && <Dashboard user={user} changeView={setView} />}
         {view === AppView.VIDEO_GEN && <VideoGenerator onSave={(script) => { setLibrary(prev => [...prev, { id: Date.now().toString(), type: ContentType.VIDEO, title: script.topic, data: script, dateCreated: new Date().toISOString(), userId: user.id, status: 'ACTIVE', isShared: false, views: 0, imports: 0 }]); addNotification('Video Saved', 'Saved to My Library', 'SUCCESS'); }} />}
         {view === AppView.EBOOK_GEN && <EbookGenerator onSave={(title, content) => { setLibrary(prev => [...prev, { id: Date.now().toString(), type: ContentType.EBOOK, title, data: content, dateCreated: new Date().toISOString(), userId: user.id, status: 'ACTIVE', isShared: false, views: 0, imports: 0 }]); addNotification('Ebook Saved', 'Saved to My Library', 'SUCCESS'); }} />}
         {view === AppView.NOTES_GEN && <NotesGenerator onSave={(item) => { setLibrary(prev => [...prev, { ...item, id: Date.now().toString(), userId: user.id, status: 'ACTIVE', isShared: false, views: 0, imports: 0 } as LibraryItem]); }} />}
         {view === AppView.PPT_GEN && <PPTGenerator onSave={(ppt) => { setLibrary(prev => [...prev, { id: Date.now().toString(), type: ContentType.PPT, title: ppt.topic, data: ppt, dateCreated: new Date().toISOString(), userId: user.id, status: 'ACTIVE', isShared: false, views: 0, imports: 0 }]); addNotification('Presentation Saved', 'Saved to My Library', 'SUCCESS'); }} />}
         
         {view === AppView.TEST_MANAGER && <TestManager 
                user={user} 
                globalTests={tests} 
                testHistory={testResults.filter(r => r.studentId === user.id)} 
                classrooms={classrooms}
                onAddTest={(t) => setTests([...tests, t])} 
                onSaveResult={(r) => { setTestResults([...testResults, r]); addNotification('Test Submitted', 'Results & Violation Report Saved', 'SUCCESS'); }} 
                onDeployTest={(tid, classIds) => {
                    setTests(tests.map(t => t.id === tid ? { ...t, status: 'LIVE', assignedClassIds: classIds } : t));
                    addNotification('Test Deployed', `Students in ${classIds.length} classes notified`, 'EMAIL');
                }}
                onPublishResults={(tid) => {
                    setTests(tests.map(t => t.id === tid ? { ...t, resultsPublished: true } : t));
                    addNotification('Results Published', 'Students can now view their scores', 'SUCCESS');
                }}
                onExit={() => setView(AppView.DASHBOARD)}
         />}
         {view === AppView.EXAMINATION && <ExaminationCenter 
            user={user}
            globalTests={tests}
            onAddTest={(t) => setTests([...tests, t])}
            onSaveResult={(r) => { setTestResults([...testResults, r]); addNotification('Public Exam Submitted', 'Result Saved', 'SUCCESS'); }}
            onLogout={handleLogout}
            preSelectedExam={selectedExamId || undefined}
          />}
         {view === AppView.DOUBT_TUTOR && <DoubtTutor />}
         {view === AppView.LEARNING_PATH && <LearningPathBuilder />}
         {view === AppView.CLASSROOMS && <ClassroomManager 
            user={user} 
            classrooms={classrooms} 
            assignments={assignments} 
            tests={tests} 
            testResults={testResults} 
            onCreate={(c) => setClassrooms([...classrooms, c])} 
            onJoin={(code) => { 
                const c = classrooms.find(cl => cl.code === code);
                if (!c) return { success: false, message: 'Invalid Class Code' };
                if (c.studentIds.includes(user.id)) return { success: false, message: 'Already Joined' };
                const updated = { ...c, studentIds: [...c.studentIds, user.id] };
                setClassrooms(classrooms.map(cl => cl.id === c.id ? updated : cl));
                return { success: true, message: 'Joined Successfully' };
            }} 
            onUpdate={(updated) => setClassrooms(classrooms.map(c => c.id === updated.id ? updated : c))} 
         />}
         {view === AppView.LIBRARY && <Library 
            items={library} 
            user={user} 
            friends={friends} 
            onUpdateItem={(id, updates) => setLibrary(library.map(i => i.id === id ? { ...i, ...updates } : i))} 
            onDeletePermanent={(id) => setLibrary(library.filter(i => i.id !== id))} 
            onImport={(item) => {
                const newItem = { ...item, id: Date.now().toString(), userId: user.id, isShared: false, imports: 0, originalOwnerId: item.userId, originalOwnerName: 'Friend' };
                setLibrary([...library, newItem]);
                addNotification('Content Imported', 'Saved to your library', 'SUCCESS');
            }} 
         />}
         {view === AppView.ASSIGNMENTS && <AssignmentManager user={user} classrooms={classrooms} assignments={assignments} setAssignments={setAssignments} />}
         {view === AppView.SOCIAL && <SocialManager 
            user={user} 
            friends={friends} 
            sendRequest={(uid) => {
                if (uid === user.id) return { success: false, message: "Cannot invite yourself" };
                if (friends.includes(uid)) return { success: false, message: "Already connected" };
                setFriends([...friends, uid]);
                return { success: true, message: "Friend added to network" };
            }} 
         />}
         {view === AppView.PROFILE && <ProfileManager user={user} onUpdate={(u) => { setUser(u); addNotification('Profile Updated', 'Changes saved', 'SUCCESS'); }} />}
         {view === AppView.ANALYTICS && <AnalyticsDashboard />}
         {view === AppView.INVIGILATOR_DASHBOARD && <InvigilatorDashboard user={user} onLogout={handleLogout} />}
         {view === AppView.VIRTUAL_LAB && renderVirtualLab()}
         {view === AppView.CAREER_PATH && renderCareerPath()}
      </main>
    </div>
  );
};

export default App;
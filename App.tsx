
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
import { generateCareerPath } from './services/gemini';
import { 
    Bell, X, LogIn, UserCircle, GraduationCap, Briefcase, 
    Beaker, Loader2, Play, CheckCircle, Sparkles, ShieldAlert, FileText
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
        settings: { timeLimitMinutes: 10, proctoring: true, adaptive: false, shuffleQuestions: true }
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

  // Virtual Lab & Career Path State
  const [careerResult, setCareerResult] = useState('');
  const [isGeneratingCareer, setIsGeneratingCareer] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>(UserRole.STUDENT);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = (role: UserRole) => {
      const u = role === UserRole.TEACHER ? MOCK_TEACHER : MOCK_STUDENT;
      setUser(u);
      setView(AppView.DASHBOARD);
      // Determine if onboarding is needed (mock logic)
      if (!localStorage.getItem('onboarding_done')) {
          setOnboardingComplete(false);
      } else {
          setOnboardingComplete(true);
      }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(!loginEmail.toLowerCase().endsWith('.com')) {
        alert("Please enter a valid .com email (e.g. user@gmail.com)");
        return;
    }
    setIsLoggingIn(true);
    setTimeout(() => {
        setIsLoggingIn(false);
        // Create a mock user based on email/role
        const mockUser: User = {
            id: `MC-${Math.floor(Math.random()*10000)}`,
            name: loginEmail.split('@')[0],
            email: loginEmail,
            role: loginRole,
            preferences: { language: 'English', gradeLevel: '10', style: 'Visual' },
            profile: { ...MOCK_PROFILE, school: 'MyClassroom High' },
            friends: []
        };
        setUser(mockUser);
        setView(AppView.DASHBOARD);
        if (!localStorage.getItem('onboarding_done')) {
            setOnboardingComplete(false);
        } else {
            setOnboardingComplete(true);
        }
    }, 1500);
  };

  const handleLogout = () => {
      setUser(null);
      setView(AppView.LOGIN);
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

  // --- RENDERERS FOR SPECIALIZED VIEWS (Virtual Lab / Career) ---
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
              <div className="p-3 bg-indigo-100 rounded-full text-indigo-600"><Briefcase className="w-8 h-8"/></div>
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
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"
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

  if (!user || view === AppView.LOGIN) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-5xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[600px] animate-fade-in">
                {/* Left Side - Branding */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-6">
                           <Sparkles className="w-6 h-6 text-yellow-300" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">MyClassroom AI</h1>
                        <p className="text-indigo-100 text-lg leading-relaxed">
                            The next generation of personalized learning. Powered by Gemini 2.5.
                        </p>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="bg-white/20 p-2 rounded-lg"><Play className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="font-bold">AI Video Lessons</h3>
                                <p className="text-xs text-indigo-200">Instant educational content generation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="bg-white/20 p-2 rounded-lg"><ShieldAlert className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="font-bold">Proctored Exams</h3>
                                <p className="text-xs text-indigo-200">Secure AI-monitored testing environment</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="bg-white/20 p-2 rounded-lg"><FileText className="w-6 h-6 text-white" /></div>
                            <div>
                                <h3 className="font-bold">Smart Notes</h3>
                                <p className="text-xs text-indigo-200">Auto-generated revision materials</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="p-12 flex flex-col justify-center bg-white dark:bg-gray-800">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Get Started</h2>
                    <p className="text-gray-500 mb-8">Select your role to access the dashboard.</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => setLoginRole(UserRole.STUDENT)}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${loginRole === UserRole.STUDENT ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
                        >
                            <UserCircle className="w-8 h-8" />
                            <span className="font-bold dark:text-white">Student</span>
                        </button>
                        <button 
                            onClick={() => setLoginRole(UserRole.TEACHER)}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${loginRole === UserRole.TEACHER ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
                        >
                            <GraduationCap className="w-8 h-8" />
                            <span className="font-bold dark:text-white">Teacher</span>
                        </button>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                placeholder="Enter any .com email"
                                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" /> Auto OTP (123456) created for .com domains
                            </p>
                        </div>
                        <button 
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                        >
                            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get OTP & Access Dashboard"}
                        </button>
                    </form>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR continue with demo</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleLogin(UserRole.TEACHER)} className="py-3 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold text-sm transition-colors">
                            Teacher Demo
                        </button>
                        <button onClick={() => handleLogin(UserRole.STUDENT)} className="py-3 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold text-sm transition-colors">
                            Student Demo
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      <Sidebar 
        currentView={view} 
        onChangeView={setView} 
        onLogout={handleLogout} 
        user={user}
      />
      
      <main className="flex-1 ml-64 relative">
         {/* NOTIFICATION TOASTS */}
         <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
             {notifications.map(n => (
                 <div key={n.id} className={`p-4 rounded-lg shadow-xl flex items-center gap-3 animate-slide-in min-w-[300px] ${
                     n.type === 'SUCCESS' ? 'bg-green-600 text-white' : 
                     n.type === 'ERROR' ? 'bg-red-600 text-white' : 
                     'bg-blue-600 text-white'
                 }`}>
                     <Bell className="w-5 h-5" />
                     <div>
                         <p className="font-bold text-sm">{n.title}</p>
                         <p className="text-xs opacity-90">{n.message}</p>
                     </div>
                 </div>
             ))}
         </div>

         {!onboardingComplete && <OnboardingTour onComplete={handleCompleteOnboarding} />}

         <JudgeControls 
            onLogout={handleLogout} 
            onReset={resetDemo} 
            userRole={user.role} 
            onLoadScenario={(s) => { 
                if (s === 'TEACHER_DEMO') { handleLogout(); setTimeout(() => handleLogin(UserRole.TEACHER), 100); }
                else { handleLogout(); setTimeout(() => handleLogin(UserRole.STUDENT), 100); setView(AppView.TEST_MANAGER); }
            }}
         />

         {/* VIEW ROUTER */}
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
         {view === AppView.VIRTUAL_LAB && renderVirtualLab()}
         {view === AppView.CAREER_PATH && renderCareerPath()}
      </main>
    </div>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { AppView, User, UserRole, ActivityLog } from '../types';
import { 
  Video, BookOpen, FileText, PenTool, Map, Users, UserPlus, 
  User as UserIcon, Bell, Settings, Plus, TrendingUp, Clock, 
  CheckSquare, PlayCircle, Activity, Quote
} from 'lucide-react';

interface DashboardProps {
  user: User;
  changeView: (view: AppView) => void;
  stats?: {
      liveTests: number;
      activeClasses: number;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ user, changeView, stats }) => {
  
  // STUDENT DASHBOARD CONFIG
  const studentStats = [
      { label: 'Study Hours', value: '14.2h', icon: Clock, color: 'text-blue-600 bg-blue-50' },
      { label: 'Avg Score', value: '88%', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
      { label: 'Assignments', value: '3 Pending', icon: FileText, color: 'text-orange-600 bg-orange-50' },
  ];

  const studentButtons = [
    { label: 'LIVE TEST', view: AppView.TEST_MANAGER, icon: PlayCircle, color: 'bg-red-600', sub: 'Join via Code' },
    { label: 'MY ASSIGNMENTS', view: AppView.ASSIGNMENTS, icon: FileText, color: 'bg-orange-600', sub: 'View Pending' },
    { label: 'MY CLASSROOMS', view: AppView.CLASSROOMS, icon: Users, color: 'bg-blue-600', sub: 'View Classes' },
    { label: 'VIDEO TEACHER', view: AppView.VIDEO_GEN, icon: Video, color: 'bg-blue-600', sub: 'AI Generated' },
    { label: 'SMART NOTES', view: AppView.NOTES_GEN, icon: FileText, color: 'bg-green-600', sub: 'Revision' },
    { label: 'MY PROFILE', view: AppView.PROFILE, icon: UserIcon, color: 'bg-gray-600', sub: 'Settings' },
  ];

  // TEACHER DASHBOARD CONFIG
  const teacherStats = [
      { label: 'Active Classes', value: stats ? stats.activeClasses.toString() : '4', icon: Users, color: 'text-purple-600 bg-purple-50' },
      { label: 'Live Tests', value: stats ? `${stats.liveTests} Active` : '1 Active', icon: PlayCircle, color: 'text-red-600 bg-red-50' },
      { label: 'Pending Reviews', value: '12', icon: CheckSquare, color: 'text-orange-600 bg-orange-50' },
  ];

  const teacherButtons = [
    { label: 'CREATE CLASSROOM', view: AppView.CLASSROOMS, icon: Plus, color: 'bg-blue-600', sub: 'New Batch' },
    { label: 'CREATE TEST', view: AppView.TEST_MANAGER, icon: PenTool, color: 'bg-purple-600', sub: 'AI or Manual' },
    { label: 'INVITE STUDENTS', view: AppView.SOCIAL, icon: UserPlus, color: 'bg-green-600', sub: 'Send Invites' },
    { label: 'ASSIGNMENTS', view: AppView.ASSIGNMENTS, icon: FileText, color: 'bg-teal-600', sub: 'Manage Work' },
    { label: 'ANALYTICS', view: AppView.ANALYTICS, icon: TrendingUp, color: 'bg-pink-600', sub: 'Results Sheet' }, 
    { label: 'MY PROFILE', view: AppView.PROFILE, icon: UserIcon, color: 'bg-gray-600', sub: 'Settings' },
  ];

  // ACTIVITY FEED LOGIC
  const [activities, setActivities] = useState<ActivityLog[]>([
      { id: '1', user: 'Alex M.', action: 'joined', target: 'Science Class 10', time: '2 min ago', type: 'JOIN' },
      { id: '2', user: 'Sarah K.', action: 'submitted', target: 'Biology Quiz', time: '15 min ago', type: 'SUBMIT' },
      { id: '3', user: 'System', action: 'flagged', target: 'John D. (Proctoring)', time: '1 hr ago', type: 'ALERT' },
  ]);

  // DAILY QUOTE LOGIC
  const studyQuotes = [
      { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
      { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
      { text: "Study hard, for the well is deep, and our brains are shallow.", author: "Richard Baxter" },
      { text: "There is no substitute for hard work.", author: "Thomas Edison" },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" }
  ];

  // Calculate day index based on epoch time (changes every 24 hours)
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); 
  const todaysQuote = studyQuotes[dayIndex % studyQuotes.length];

  // Simulate live feed
  useEffect(() => {
    if (user.role === UserRole.TEACHER) {
        const timer = setInterval(() => {
            const names = ['Mike R.', 'Emma W.', 'Chris P.', 'Zoe L.'];
            const actions = [
                { action: 'joined', target: 'Math Class', type: 'JOIN' },
                { action: 'submitted', target: 'History Test', type: 'SUBMIT' },
                { action: 'created', target: 'New Flashcards', type: 'CREATE' }
            ];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            
            const newLog: ActivityLog = {
                id: Date.now().toString(),
                user: randomName,
                action: randomAction.action,
                target: randomAction.target,
                time: 'Just now',
                type: randomAction.type as any
            };
            
            setActivities(prev => [newLog, ...prev].slice(0, 5));
        }, 8000); // New activity every 8 seconds
        return () => clearInterval(timer);
    }
  }, [user.role]);

  const buttons = user.role === UserRole.TEACHER ? teacherButtons : studentButtons;
  const statsList = user.role === UserRole.TEACHER ? teacherStats : studentStats;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex justify-between items-end border-b pb-6 dark:border-gray-700">
        <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${user.role === UserRole.TEACHER ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                <UserIcon className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold dark:text-white">
                    {user.role === UserRole.TEACHER ? 'Teacher Dashboard' : 'Student Dashboard'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Welcome back, {user.name}
                </p>
            </div>
        </div>
        <div className="text-right hidden md:block">
             <span className="block text-xs text-gray-400 uppercase tracking-wider mb-1">USER ID</span>
             <span className="font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm font-bold">{user.id}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Stats Column */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            {statsList.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-transform hover:-translate-y-1 h-32">
                        <div className={`p-4 rounded-full ${stat.color}`}>
                            <Icon className="w-6 h-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
                        </div>
                    </div>
                )
            })}
          </div>

          {/* Live Activity Feed (Teacher Only) */}
          {user.role === UserRole.TEACHER && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-500 animate-pulse" /> Live Activity
                  </h3>
                  <div className="space-y-4">
                      {activities.map(log => (
                          <div key={log.id} className="flex items-start gap-3 text-sm animate-fade-in">
                              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                  log.type === 'ALERT' ? 'bg-red-500' : 
                                  log.type === 'SUBMIT' ? 'bg-green-500' : 'bg-blue-500'
                              }`}></div>
                              <div>
                                  <p className="dark:text-gray-200">
                                      <span className="font-bold">{log.user}</span> {log.action} <span className="font-medium text-gray-500">{log.target}</span>
                                  </p>
                                  <p className="text-xs text-gray-400">{log.time}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
           
           {/* Daily Quote (Student Only) */}
           {user.role === UserRole.STUDENT && (
               <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-6 text-white flex flex-col justify-center h-full relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Quote className="w-24 h-24" />
                   </div>
                   <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2 opacity-80">
                       <Quote className="w-4 h-4" /> Today's Motivation
                   </h3>
                   <p className="text-xl font-medium italic leading-relaxed mb-4">
                       "{todaysQuote.text}"
                   </p>
                   <div className="mt-auto border-t border-white/20 pt-3 flex justify-between items-center">
                       <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">Daily Inspiration</span>
                       <span className="font-bold text-sm text-blue-100">- {todaysQuote.author}</span>
                   </div>
               </div>
           )}
      </div>
      
      {/* Main Grid */}
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {buttons.map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.label}
              onClick={() => changeView(btn.view)}
              className={`${btn.color} hover:opacity-90 text-white rounded-xl p-6 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center gap-2 h-40 group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Icon className="w-24 h-24" />
              </div>
              <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors z-10">
                <Icon className="w-8 h-8" />
              </div>
              <span className="font-bold text-lg text-center z-10">{btn.label}</span>
              <span className="text-xs text-white/80 font-medium bg-black/20 px-2 py-0.5 rounded z-10">{btn.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { AppView, User, UserRole } from '../types';
import { 
  LayoutDashboard, Video, BookOpen, FileText, PenTool, 
  HelpCircle, Map, Users, LogOut, Library, 
  Presentation, Beaker, Briefcase, UserPlus, TrendingUp
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, user }) => {
  const commonItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.CLASSROOMS, label: 'My Classrooms', icon: Users },
    { id: AppView.LIBRARY, label: 'My Library', icon: Library },
    { id: AppView.SOCIAL, label: user.role === UserRole.TEACHER ? 'Invite Students' : 'Connections', icon: UserPlus },
  ];

  const teacherItems = [
      { id: AppView.ASSIGNMENTS, label: 'Assignments', icon: FileText },
      { id: AppView.ANALYTICS, label: 'Analytics', icon: TrendingUp },
  ];

  const studentItems = [
      { id: AppView.ASSIGNMENTS, label: 'My Assignments', icon: FileText },
  ];

  const toolItems = [
    { id: AppView.VIDEO_GEN, label: 'Video Teacher', icon: Video },
    { id: AppView.EBOOK_GEN, label: 'Ebook Creator', icon: BookOpen },
    { id: AppView.NOTES_GEN, label: 'Smart Notes', icon: FileText },
    { id: AppView.PPT_GEN, label: 'PPT Maker', icon: Presentation },
    { id: AppView.TEST_MANAGER, label: user.role === UserRole.TEACHER ? 'Test Manager' : 'Test Arena', icon: PenTool },
  ];

  const advancedItems = [
    { id: AppView.DOUBT_TUTOR, label: 'Doubt Forum', icon: HelpCircle },
    { id: AppView.VIRTUAL_LAB, label: 'Virtual Lab', icon: Beaker },
    { id: AppView.LEARNING_PATH, label: 'Learning Path', icon: Map },
    { id: AppView.CAREER_PATH, label: 'Career Guide', icon: Briefcase },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 h-screen border-r border-gray-200 dark:border-gray-700 flex flex-col fixed left-0 top-0 transition-colors duration-200 z-50">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          MyClassroom
        </h1>
        <div className="mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold inline-block text-gray-600 dark:text-gray-300">
          {user.role} MODE
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Core</p>
          {commonItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg transition-colors ${
                  currentView === item.id 
                    ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
          {(user.role === UserRole.TEACHER ? teacherItems : studentItems).map((item) => {
              const Icon = item.icon;
              return (
                <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg transition-colors ${
                    currentView === item.id 
                        ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <Icon className="w-5 h-5" />
                    {item.label}
                </button>
              );
          })}
        </div>

        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Create & Learn</p>
          {toolItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg transition-colors ${
                  currentView === item.id 
                    ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div>
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Advanced</p>
          {advancedItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg transition-colors ${
                  currentView === item.id 
                    ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 flex items-center justify-center font-bold">
                {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.id}</p>
            </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
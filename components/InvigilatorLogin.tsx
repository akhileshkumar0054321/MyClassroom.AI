import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, Loader2, ArrowRight, Mail, Hash, MapPin, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { UserRole, User, UserProfile } from '../types';
import { SHARED_EXAM_LIST } from '../constants';

interface InvigilatorLoginProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

const MOCK_PROFILE: UserProfile = {
  dob: '1985-05-20',
  gender: 'Male',
  school: 'National Testing Agency',
  phone: '+91 98765-43210',
  bio: 'Senior Invigilator - Grade A',
  isPublic: false
};

const InvigilatorLogin: React.FC<InvigilatorLoginProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [invigilatorId, setInvigilatorId] = useState('');
  const [examId, setExamId] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorised, setIsAuthorised] = useState(false);
  const [authDetails, setAuthDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Relax constraints for demo
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    
    // Simulate database authorization
    setTimeout(() => {
      // Find exam or use a default one for the demo
      const exam = SHARED_EXAM_LIST.find(e => e.title.toUpperCase().includes(selectedExam.toUpperCase())) || { title: selectedExam };
      
      if (exam) {
        setAuthDetails({
          name: 'Akhilesh Kumar',
          pincode: '110001',
          area: 'New Delhi - Central Zone',
          exam: selectedExam,
          id: invigilatorId || `INV-${Math.floor(Math.random()*10000)}`
        });
        setIsAuthorised(true);
      } else {
        setError('Authorization Failed: Please select a valid exam category.');
      }
      setIsLoading(false);
    }, 2000);
  };

  const handleContinueToDashboard = () => {
    const user: User = {
      id: invigilatorId,
      name: authDetails.name,
      email: email,
      role: UserRole.INVIGILATOR,
      preferences: { language: 'English', gradeLevel: 'All', style: 'Formal' },
      profile: MOCK_PROFILE,
      friends: [],
      exam: authDetails.exam
    };
    onLogin(user);
  };

  if (isAuthorised) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-10 border border-slate-200 animate-scale-in">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-green-600 tracking-tight uppercase">SUCCESSFULLY AUTHORISED BY DATABASE</h2>
            <p className="text-slate-500 mt-2 font-bold">Session credentials verified. Welcome back, {authDetails.name}.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Invigilator Name</label>
              <p className="text-xl font-black text-slate-900">{authDetails.name}</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assigned Area</label>
              <p className="text-xl font-black text-slate-900">{authDetails.area}</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pincode</label>
              <p className="text-xl font-black text-slate-900">{authDetails.pincode}</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Exam Duty</label>
              <p className="text-xl font-black text-blue-600">{authDetails.exam}</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 mb-10 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-black text-blue-900 uppercase">General Instructions</h3>
            </div>
            <ul className="space-y-3 text-blue-800 font-medium">
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                Ensure all candidates have valid identity proof before entering the arena.
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                Monitor the real-time dashboard for any AI-flagged violations.
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                Maintain absolute silence and report any technical glitches immediately.
              </li>
            </ul>
          </div>

          <button 
            onClick={handleContinueToDashboard}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 text-xl uppercase tracking-wider"
          >
            Enter Monitoring Dashboard <ArrowRight className="w-6 h-6"/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-10 border border-slate-200">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Welcome Invigilator</h2>
          <p className="text-slate-500 mt-2">Secure access for authorized moderators only.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-shake">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Log in Email ID</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@domain.in"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-600 outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Invigilator ID</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                required
                value={invigilatorId}
                onChange={e => setInvigilatorId(e.target.value.toUpperCase())}
                placeholder="INV-XXXX-XXXX"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-600 outline-none transition-all font-bold tracking-widest"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Exam ID</label>
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                required
                value={examId}
                onChange={e => setExamId(e.target.value.toUpperCase())}
                placeholder="EXAM-2026"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-600 outline-none transition-all font-bold tracking-widest"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Exam</label>
            <select 
              required
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-600 outline-none transition-all font-bold text-slate-700"
            >
              <option value="">Choose Exam...</option>
              <option value="NEET">NEET</option>
              <option value="JEE">JEE</option>
              <option value="SSC">SSC</option>
              <option value="CUET">CUET</option>
              <option value="NISM">NISM (Capital Markets)</option>
              <option value="NCFM">NCFM (Derivatives)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70 text-lg uppercase tracking-wider"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5"/></>}
          </button>
        </form>

        <button 
          onClick={onBack}
          className="w-full mt-6 text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          Back to Main Hub
        </button>
      </div>
    </div>
  );
};

export default InvigilatorLogin;

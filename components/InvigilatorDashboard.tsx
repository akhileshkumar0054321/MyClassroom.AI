import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ShieldCheck, Users, Activity, AlertTriangle, 
  Search, Grid, List, LogOut, Camera, 
  ShieldAlert, UserX, RefreshCw, Filter, 
  CheckCircle, XCircle, Clock, Monitor,
  ChevronRight, ArrowRight, Play, Loader2
} from 'lucide-react';
import { StudentSession, User, InvigilatorAction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SHARED_EXAM_LIST } from '../constants';

interface InvigilatorDashboardProps {
  user: User;
  onLogout: () => void;
}

const InvigilatorDashboard: React.FC<InvigilatorDashboardProps> = ({ user, onLogout }) => {
  const [phase, setPhase] = useState<'SELECT_EXAM' | 'DASHBOARD'>(user.exam ? 'DASHBOARD' : 'SELECT_EXAM');
  const [selectedExam, setSelectedExam] = useState<string | null>(user.exam || null);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [frames, setFrames] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'KICKED' | 'DISCONNECTED'>('ALL');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  const exams = SHARED_EXAM_LIST;

  useEffect(() => {
    if (phase === 'DASHBOARD') {
      setIsConnecting(true);
      const socket = io(window.location.origin);
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnecting(false);
        socket.emit('join_as_invigilator', { invigilatorId: user.id });
      });

      socket.on('initial_state', (initialSessions: StudentSession[]) => {
        setSessions(initialSessions);
      });

      socket.on('student_joined', (session: StudentSession) => {
        setSessions(prev => {
          const exists = prev.find(s => s.studentId === session.studentId);
          if (exists) return prev.map(s => s.studentId === session.studentId ? session : s);
          return [...prev, session];
        });
      });

      socket.on('session_updated', (session: StudentSession) => {
        setSessions(prev => prev.map(s => s.studentId === session.studentId ? session : s));
      });

      socket.on('student_frame', (data: { studentId: string, frame: string }) => {
        setFrames(prev => ({ ...prev, [data.studentId]: data.frame }));
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [phase, user.id]);

  const handleKick = async (studentId: string) => {
    if (!window.confirm("Are you sure you want to kick this student? This action is permanent and will be logged.")) return;

    try {
      const response = await fetch('/api/invigilator/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          invigilatorId: user.id,
          reason: "Manual kick by invigilator for suspicious activity."
        })
      });
      
      if (!response.ok) throw new Error("Failed to kick student");
      
      // Local update will happen via socket event 'session_updated'
    } catch (error) {
      alert("Error kicking student: " + error);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  const activeCount = sessions.filter(s => s.status === 'ACTIVE').length;
  const violationCount = sessions.filter(s => s.slashCount >= 3).length;

  if (phase === 'SELECT_EXAM') {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="flex items-center gap-4 mb-12 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">Select Session</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map(exam => (
              <motion.button
                key={exam.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedExam(exam.title); setPhase('DASHBOARD'); }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-left hover:border-blue-500 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Monitor className="w-24 h-24 text-blue-600" />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2 block">{exam.id}</span>
                  <h3 className="text-2xl font-black text-white mb-4 leading-tight">{exam.title}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-[10px] font-black border border-emerald-800/50">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      {exam.activeCount} ACTIVE CANDIDATES
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      {/* DASHBOARD HEADER */}
      <header className="sticky top-0 z-[100] w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              INVIGILATOR HUB
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monitoring Session</span>
            <span className="text-sm font-bold text-white">{selectedExam}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Feeds</span>
              <span className="text-lg font-black text-emerald-400 tabular-nums">{activeCount}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Critical Alerts</span>
              <span className="text-lg font-black text-red-500 tabular-nums">{violationCount}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 border border-red-800 rounded-xl font-bold text-sm hover:bg-red-900/40 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </div>
      </header>

      {/* CONTROLS BAR */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search candidate ID or name..."
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
          {(['ALL', 'ACTIVE', 'KICKED', 'DISCONNECTED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <main className="flex-1 p-8 overflow-y-auto">
        {isConnecting ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="font-black uppercase tracking-[0.2em]">Establishing Secure Uplink...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
            <Users className="w-24 h-24" />
            <p className="text-xl font-black uppercase tracking-widest">No candidates matching criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredSessions.map(session => (
                <motion.div
                  key={session.studentId}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`bg-slate-900 rounded-3xl overflow-hidden border-2 transition-all relative group ${
                    session.status === 'KICKED' ? 'border-red-900/50 opacity-60' :
                    session.slashCount >= 3 ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.2)]' :
                    session.status === 'DISCONNECTED' ? 'border-slate-800 opacity-50' :
                    'border-slate-800 hover:border-blue-500/50'
                  }`}
                >
                  {/* VIDEO FEED */}
                  <div className="aspect-video bg-black relative overflow-hidden">
                    {frames[session.studentId] ? (
                      <img 
                        src={frames[session.studentId]} 
                        alt="Feed" 
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-700">
                        <Camera className="w-10 h-10" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Signal</span>
                      </div>
                    )}

                    {/* OVERLAYS */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                      <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                      <span className="text-[8px] font-black text-white uppercase tracking-wider">{session.status}</span>
                    </div>

                    {session.slashCount > 0 && (
                      <div className="absolute top-3 right-3 bg-red-600 px-2 py-1 rounded-full text-[8px] font-black text-white shadow-lg animate-bounce">
                        {session.slashCount} SLASHES
                      </div>
                    )}

                    {session.status === 'KICKED' && (
                      <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center p-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <XCircle className="w-12 h-12 text-red-500" />
                          <span className="text-lg font-black text-white uppercase tracking-tighter">CANDIDATE REMOVED</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* INFO BAR */}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-white truncate leading-tight">{session.studentName}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{session.studentId}</p>
                      </div>
                      {session.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handleKick(session.studentId)}
                          className="p-2 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all group/kick"
                          title="Kick Candidate"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Integrity Risk</span>
                        <span className={session.slashCount >= 3 ? 'text-red-500' : 'text-slate-400'}>
                          {session.slashCount}/5 Flags
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div 
                            key={i} 
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                              i <= session.slashCount ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-slate-800'
                            }`}
                          ></div>
                        ))}
                      </div>
                      {session.lastViolation && (
                        <p className="text-[9px] font-bold text-red-400 bg-red-950/30 p-2 rounded-lg border border-red-900/30 line-clamp-2">
                          <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" />
                          {session.lastViolation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* HOVER ACTIONS */}
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 pointer-events-none transition-colors"></div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FOOTER STATUS */}
      <footer className="bg-slate-900 border-t border-slate-800 px-8 py-3 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            SYSTEM OPERATIONAL
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            REAL-TIME SYNC ACTIVE
          </div>
        </div>
        <div>
          LOGGED IN AS: {user.name} ({user.id})
        </div>
      </footer>
    </div>
  );
};

export default InvigilatorDashboard;

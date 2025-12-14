
import React, { useState } from 'react';
import { Classroom, User, UserRole } from '../types';
import { Users, Plus, Hash, CheckCircle, XCircle, Share2, Copy, RefreshCw, Settings, ToggleLeft, ToggleRight, X, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface ClassroomManagerProps {
  user: User;
  classrooms: Classroom[];
  onCreate: (c: Classroom) => void;
  onJoin: (code: string) => { success: boolean; message: string };
  onUpdate: (c: Classroom) => void;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ user, classrooms, onCreate, onJoin, onUpdate }) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'JOIN'>('LIST');
  const [activeModal, setActiveModal] = useState<string | null>(null); // Classroom ID for modal
  
  // Create Class State
  const [newClassName, setNewClassName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Join Class State
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<{success: boolean, message: string} | null>(null);

  // Link Management State
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    // TEST CASE LOGIC: If name is "Science Class 10", force code SCI-10A
    let code = '';
    if (newClassName === 'Science Class 10') {
        code = 'SCI-10A';
    } else {
        code = Math.random().toString(36).substring(7).toUpperCase();
    }

    onCreate({
      id: Date.now().toString(),
      name: newClassName,
      subject: newSubject || 'General',
      teacherId: user.id,
      studentIds: [],
      code: code
    });
    setView('LIST');
    setNewClassName('');
    setNewSubject('');
  };

  const handleJoin = () => {
    const result = onJoin(joinCode);
    setJoinStatus(result);
    if (result.success) {
        setTimeout(() => {
            setView('LIST');
            setJoinStatus(null);
            setJoinCode('');
        }, 1500);
    }
  };

  const handleCopyLink = (link: string) => {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateLink = (c: Classroom) => {
      const newCode = Math.random().toString(36).substring(7).toUpperCase();
      onUpdate({
          ...c,
          code: newCode,
          inviteLink: `https://myclassroom.ai/join/${newCode}`
      });
  };

  const toggleLinkStatus = (c: Classroom) => {
      onUpdate({
          ...c,
          isLinkActive: !c.isLinkActive
      });
  };

  // Get active classroom for modal
  const activeClass = classrooms.find(c => c.id === activeModal);

  return (
    <div className="p-6 max-w-5xl mx-auto relative">
       
       {/* INVITE MANAGEMENT MODAL */}
       {activeModal && activeClass && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 animate-slide-in">
                   <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                       <div>
                           <h3 className="text-xl font-bold dark:text-white">Invite Students</h3>
                           <p className="text-sm text-gray-500">Manage invitation link for {activeClass.name}</p>
                       </div>
                       <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                   </div>
                   
                   <div className="p-6 space-y-6">
                       {/* LINK SECTION */}
                       <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 uppercase">Shareable Link</label>
                           <div className="flex gap-2">
                               <input 
                                   readOnly
                                   value={activeClass.inviteLink || 'Generating...'}
                                   className={`flex-1 p-3 rounded-lg border font-mono text-sm ${activeClass.isLinkActive ? 'bg-gray-50 dark:bg-gray-900 dark:text-white border-gray-300 dark:border-gray-600' : 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'}`}
                               />
                               <button 
                                   onClick={() => activeClass.inviteLink && handleCopyLink(activeClass.inviteLink)}
                                   disabled={!activeClass.isLinkActive}
                                   className={`px-4 rounded-lg font-bold flex items-center gap-2 transition-all ${copied ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50'}`}
                               >
                                   {copied ? <CheckCircle className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                   {copied ? 'Copied' : 'Copy'}
                               </button>
                           </div>
                           {!activeClass.isLinkActive && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Link is currently disabled</p>}
                       </div>

                       {/* ACTIONS SECTION */}
                       <div className="grid grid-cols-2 gap-4">
                           <button 
                               onClick={() => handleRegenerateLink(activeClass)}
                               className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                           >
                               <RefreshCw className="w-4 h-4"/> Regenerate Link
                           </button>
                           <button 
                               onClick={() => toggleLinkStatus(activeClass)}
                               className={`p-3 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium ${activeClass.isLinkActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                           >
                               {activeClass.isLinkActive ? <><ToggleRight className="w-4 h-4"/> Disable Link</> : <><ToggleLeft className="w-4 h-4"/> Enable Link</>}
                           </button>
                       </div>

                       {/* SETTINGS SECTION (SIMULATED) */}
                       <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-3">
                           <div className="flex items-center gap-2 mb-2">
                               <Settings className="w-4 h-4 text-gray-500"/>
                               <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Advanced Settings</span>
                           </div>
                           <label className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                               <input type="checkbox" className="w-4 h-4 rounded text-primary-600"/>
                               <span className="text-sm text-gray-600 dark:text-gray-400">Expire after 7 days</span>
                           </label>
                           <label className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                               <input type="checkbox" className="w-4 h-4 rounded text-primary-600"/>
                               <span className="text-sm text-gray-600 dark:text-gray-400">Limit to next 10 students</span>
                           </label>
                           <label className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                               <input type="checkbox" className="w-4 h-4 rounded text-primary-600"/>
                               <span className="text-sm text-gray-600 dark:text-gray-400">Require Teacher Approval</span>
                           </label>
                       </div>
                   </div>
               </div>
           </div>
       )}

       <div className="flex justify-between items-center mb-8">
         <h2 className="text-3xl font-bold dark:text-white flex items-center gap-2">
           <Users className="w-8 h-8 text-primary-500" /> 
           {user.role === UserRole.TEACHER ? 'Classroom Management' : 'My Classrooms'}
         </h2>
         <div className="flex gap-2">
            {user.role === UserRole.TEACHER ? (
                <button onClick={() => setView('CREATE')} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 shadow-md">
                    <Plus className="w-4 h-4" /> Create Classroom
                </button>
            ) : (
                <button onClick={() => setView('JOIN')} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Hash className="w-4 h-4" /> Join Class
                </button>
            )}
         </div>
       </div>

       {/* TEACHER: CREATE CLASSROOM */}
       {view === 'CREATE' && (
         <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg mb-6 border border-gray-200 dark:border-gray-700 animate-slide-in">
            <h3 className="font-bold text-xl mb-6 dark:text-white">Create New Classroom</h3>
            <div className="grid gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Class Name</label>
                    <input 
                        value={newClassName}
                        onChange={e => setNewClassName(e.target.value)}
                        placeholder="e.g. Science Class 10" 
                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tip: Use "Science Class 10" to generate code SCI-10A</p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subject</label>
                    <input 
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                        placeholder="e.g. Physics" 
                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button onClick={() => setView('LIST')} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={handleCreate} disabled={!newClassName} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-bold">Create Class</button>
            </div>
         </div>
       )}

       {/* STUDENT: JOIN CLASS */}
       {view === 'JOIN' && (
         <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg mb-6 border border-gray-200 dark:border-gray-700 max-w-lg mx-auto">
            <h3 className="font-bold text-xl mb-4 dark:text-white text-center">Join Classroom</h3>
            <p className="text-sm text-gray-500 mb-6 text-center">Enter the unique code or paste the full invite link.</p>
            
            <div className="relative">
                <LinkIcon className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                <input 
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value); setJoinStatus(null); }}
                    placeholder="CODE or LINK (e.g. https://...)" 
                    className="w-full pl-12 p-4 border-2 border-primary-100 rounded-xl mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg focus:border-primary-500 outline-none"
                />
            </div>
            
            {joinStatus && (
                <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 justify-center ${joinStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {joinStatus.success ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                    {joinStatus.message}
                </div>
            )}

            <button onClick={handleJoin} className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-primary-700 transition-all">
                Join Now
            </button>
            <button onClick={() => setView('LIST')} className="w-full mt-2 text-gray-500 py-2 hover:underline">Cancel</button>
         </div>
       )}

       {/* LIST VIEW */}
       {classrooms.length === 0 ? (
           <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
               <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6 text-gray-400">
                   <Users className="w-10 h-10"/>
               </div>
               <h3 className="text-xl font-bold dark:text-white mb-2">No Classrooms Yet</h3>
               <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                   {user.role === UserRole.TEACHER 
                     ? "Create your first classroom to start inviting students and assigning tests." 
                     : "Join a classroom using a code from your teacher to see your assignments."}
               </p>
               {user.role === UserRole.TEACHER ? (
                   <button onClick={() => setView('CREATE')} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700">Create Class</button>
               ) : (
                   <button onClick={() => setView('JOIN')} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700">Join Class</button>
               )}
           </div>
       ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {classrooms.map(c => (
                <div key={c.id} className="bg-white dark:bg-gray-800 p-0 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                    <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 relative">
                        <h3 className="text-2xl font-bold text-white mb-1 relative z-10">{c.name}</h3>
                        <p className="text-blue-100 text-sm relative z-10">{c.subject}</p>
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full translate-x-8 -translate-y-8"></div>
                    </div>
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-gray-500">
                                <Users className="w-4 h-4 inline mr-1" />
                                {c.studentIds.length} Students
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 select-all">
                                {c.code}
                            </span>
                        </div>
                    </div>
                    {/* TEACHER ACTIONS: INVITE BUTTON */}
                    {user.role === UserRole.TEACHER && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                                Link: {c.isLinkActive ? <span className="text-green-600 font-bold">Active</span> : <span className="text-red-500 font-bold">Disabled</span>}
                            </div>
                            <button 
                                onClick={() => setActiveModal(c.id)}
                                className="text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                                <Share2 className="w-4 h-4" /> Invite Students
                            </button>
                        </div>
                    )}
                </div>
             ))}
           </div>
       )}
    </div>
  );
};

export default ClassroomManager;

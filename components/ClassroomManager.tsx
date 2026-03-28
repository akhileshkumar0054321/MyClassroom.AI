
import React, { useState } from 'react';
import { Classroom, User, UserRole, Assignment, TestData, TestResult } from '../types';
import { 
    Users, Plus, Hash, CheckCircle, XCircle, Share2, Copy, RefreshCw, 
    Settings, ToggleLeft, ToggleRight, X, Link as LinkIcon, AlertCircle,
    LayoutDashboard, BookOpen, Trash2, UserMinus, Shield, MoreVertical, LogOut,
    FileText, PenTool, PlayCircle, Eye
} from 'lucide-react';

interface ClassroomManagerProps {
  user: User;
  classrooms: Classroom[];
  assignments?: Assignment[];
  tests?: TestData[];
  testResults?: TestResult[];
  onCreate: (c: Classroom) => void;
  onJoin: (code: string) => { success: boolean; message: string };
  onUpdate: (c: Classroom) => void;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    user, classrooms, assignments = [], tests = [], testResults = [], onCreate, onJoin, onUpdate 
}) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'JOIN' | 'DASHBOARD'>('LIST');
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'INVITE' | null>(null);
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'ASSIGNMENTS' | 'TESTS' | 'ANALYTICS'>('STUDENTS');
  const [viewingSubmissions, setViewingSubmissions] = useState<{id: string, type: 'ASSIGNMENT' | 'TEST', title: string} | null>(null);
  
  // Create Class State
  const [newClassName, setNewClassName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Join Class State
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<{success: boolean, message: string} | null>(null);

  // Link Management State
  const [copied, setCopied] = useState(false);

  // --- HELPERS ---
  const activeClass = classrooms.find(c => c.id === activeClassId);

  const getMockStudent = (id: string) => ({
      id,
      name: `Student ${id.substring(id.length-4)}`,
      email: `student.${id.substring(id.length-4)}@school.com`,
      joinedAt: new Date().toLocaleDateString()
  });

  // --- HANDLERS ---

  const handleCreate = () => {
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
      studentIds: [], // Start empty
      code: code,
      inviteLink: `https://myclassroom.ai/join/${code}`,
      isLinkActive: true
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

  const handleKickStudent = (studentId: string) => {
      if (!activeClass) return;
      if (confirm('Are you sure you want to remove this student? They will lose access to all class materials.')) {
          const updatedIds = activeClass.studentIds.filter(id => id !== studentId);
          onUpdate({
              ...activeClass,
              studentIds: updatedIds
          });
      }
  };

  const openClassroom = (id: string) => {
      setActiveClassId(id);
      setView('DASHBOARD');
      setActiveTab('STUDENTS');
  };

  const renderSubmissionModal = () => {
    if (!viewingSubmissions || !activeClass) return null;

    let submissionsList: {studentName: string, date: string, score: string, status: string}[] = [];

    if (viewingSubmissions.type === 'ASSIGNMENT') {
        const assignment = assignments.find(a => a.id === viewingSubmissions.id);
        if (assignment) {
            submissionsList = assignment.submissions.map(sub => ({
                studentName: sub.studentName,
                date: new Date(sub.submittedAt).toLocaleDateString(),
                score: `${sub.score || 0}/${assignment.totalMarks}`,
                status: sub.status
            }));
        }
    } else {
        const test = tests.find(t => t.id === viewingSubmissions.id);
        if (test) {
             const classResults = testResults.filter(r => r.testId === test.id);
             submissionsList = classResults.map(r => {
                 // Mock name resolution or use ID if not available
                 const studentName = `Student ${r.studentId.substring(r.studentId.length-4)}`; 
                 return {
                    studentName: studentName,
                    date: new Date(r.dateTaken).toLocaleDateString(),
                    score: `${r.score}/${r.maxScore}`,
                    status: r.status
                 }
             });
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold dark:text-white">Submissions: {viewingSubmissions.title}</h3>
                        <p className="text-sm text-gray-500">{submissionsList.length} total submissions</p>
                    </div>
                    <button onClick={() => setViewingSubmissions(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-0 overflow-y-auto max-h-[60vh]">
                    {submissionsList.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No submissions yet.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Student</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Score</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {submissionsList.map((sub, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-4 font-bold dark:text-white">{sub.studentName}</td>
                                        <td className="p-4 text-sm text-gray-500">{sub.date}</td>
                                        <td className="p-4 font-mono font-bold text-blue-600">{sub.score}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">{sub.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
  };

  // --- RENDERERS ---

  const renderDashboard = () => {
      if (!activeClass) return null;
      const isTeacher = user.role === UserRole.TEACHER;
      // Generate mock student objects for the list
      const studentList = activeClass.studentIds.map(id => getMockStudent(id));
      
      // Filter resources
      const classAssignments = assignments.filter(a => a.classroomId === activeClass.id);
      const classTests = tests.filter(t => t.assignedClassIds?.includes(activeClass.id));

      return (
          <div className="animate-fade-in">
              {/* DASHBOARD HEADER */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                  <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700 p-6 relative">
                      <button onClick={() => setView('LIST')} className="absolute top-4 left-4 text-white/80 hover:text-white flex items-center gap-1 font-bold text-sm bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                          ← All Classes
                      </button>
                      <div className="absolute bottom-6 left-6 text-white">
                          <h1 className="text-3xl font-bold">{activeClass.name}</h1>
                          <p className="text-blue-100 opacity-90">{activeClass.subject} • {activeClass.studentIds.length} Students</p>
                      </div>
                      <div className="absolute bottom-6 right-6">
                          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white">
                              <Hash className="w-4 h-4 text-blue-200"/>
                              <span className="font-mono font-bold tracking-wider">{activeClass.code}</span>
                              {isTeacher && <button onClick={() => handleCopyLink(activeClass.code)}><Copy className="w-4 h-4 hover:text-blue-200"/></button>}
                          </div>
                      </div>
                  </div>
                  
                  {/* TABS */}
                  <div className="px-6 flex items-center gap-6 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                      <button 
                        onClick={() => setActiveTab('STUDENTS')}
                        className={`py-4 border-b-2 font-bold text-sm flex items-center gap-2 ${activeTab === 'STUDENTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                      >
                          <Users className="w-4 h-4"/> Students
                      </button>
                      <button 
                        onClick={() => setActiveTab('ASSIGNMENTS')}
                        className={`py-4 border-b-2 font-bold text-sm flex items-center gap-2 ${activeTab === 'ASSIGNMENTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                      >
                          <BookOpen className="w-4 h-4"/> Assignments
                      </button>
                      <button 
                        onClick={() => setActiveTab('TESTS')}
                        className={`py-4 border-b-2 font-bold text-sm flex items-center gap-2 ${activeTab === 'TESTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                      >
                          <PenTool className="w-4 h-4"/> Tests
                      </button>
                      {isTeacher && (
                          <button 
                            onClick={() => setActiveTab('ANALYTICS')}
                            className={`py-4 border-b-2 font-bold text-sm flex items-center gap-2 ${activeTab === 'ANALYTICS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                          >
                              <Settings className="w-4 h-4"/> Analytics
                          </button>
                      )}
                  </div>
              </div>

              {/* DASHBOARD CONTENT */}
              <div className="space-y-6">
                  {/* MAIN CONTENT AREA */}
                  <div className="w-full space-y-6">
                      
                      {/* STUDENTS TAB */}
                      {activeTab === 'STUDENTS' && (
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                      <Users className="w-5 h-5 text-gray-500"/> Class Roster
                                  </h3>
                                  {isTeacher && (
                                      <button onClick={() => setActiveModal('INVITE')} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1">
                                          <Plus className="w-3 h-3"/> Invite
                                      </button>
                                  )}
                              </div>
                              
                              {studentList.length === 0 ? (
                                  <div className="p-12 text-center text-gray-400">
                                      <Users className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                      <p>No students have joined yet.</p>
                                      {isTeacher && <p className="text-sm mt-1">Share the invite code to get started.</p>}
                                  </div>
                              ) : (
                                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {studentList.map((student) => (
                                          <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                      {student.name.charAt(0)}
                                                  </div>
                                                  <div>
                                                      <p className="font-bold text-gray-800 dark:text-white text-sm">{student.name}</p>
                                                      <p className="text-xs text-gray-500">{student.email}</p>
                                                  </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-3">
                                                  <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium hidden sm:inline-block">
                                                      Active
                                                  </span>
                                                  {isTeacher && (
                                                      <button 
                                                          onClick={() => handleKickStudent(student.id)}
                                                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                                                          title="Remove Student"
                                                      >
                                                          <UserMinus className="w-4 h-4"/>
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}

                      {/* ASSIGNMENTS TAB */}
                      {activeTab === 'ASSIGNMENTS' && (
                          <div className="space-y-4">
                              {classAssignments.length === 0 ? (
                                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                                      <p className="text-gray-500">No assignments deployed yet.</p>
                                  </div>
                              ) : (
                                  classAssignments.map(assign => (
                                      <div key={assign.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                          <div>
                                              <h4 className="font-bold text-lg dark:text-white">{assign.title}</h4>
                                              <p className="text-sm text-gray-500 mt-1">Due: {new Date(assign.dueDate).toLocaleDateString()}</p>
                                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold mt-2 inline-block">{assign.status}</span>
                                          </div>
                                          <div>
                                              {isTeacher ? (
                                                  <button 
                                                    onClick={() => setViewingSubmissions({id: assign.id, type: 'ASSIGNMENT', title: assign.title})}
                                                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                                                  >
                                                      View Submissions
                                                  </button>
                                              ) : (
                                                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md">
                                                      Attempt
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}

                      {/* TESTS TAB */}
                      {activeTab === 'TESTS' && (
                          <div className="space-y-4">
                              {classTests.length === 0 ? (
                                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                      <PenTool className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                                      <p className="text-gray-500">No tests deployed yet.</p>
                                  </div>
                              ) : (
                                  classTests.map(test => (
                                      <div key={test.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                          <div>
                                              <h4 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                                  {test.title}
                                                  {test.status === 'LIVE' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse">● LIVE</span>}
                                              </h4>
                                              <p className="text-sm text-gray-500 mt-1">{test.questions.length} Questions • {test.settings.timeLimitMinutes} Mins</p>
                                          </div>
                                          <div>
                                              {isTeacher ? (
                                                  <button 
                                                    onClick={() => setViewingSubmissions({id: test.id, type: 'TEST', title: test.title})}
                                                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                                                  >
                                                      <Eye className="w-4 h-4"/> View Results
                                                  </button>
                                              ) : (
                                                  <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-md flex items-center gap-2">
                                                      <PlayCircle className="w-4 h-4"/> Start Test
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto relative min-h-screen">
       
       {/* INVITE MANAGEMENT MODAL */}
       {activeModal === 'INVITE' && activeClass && (
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
                   </div>
               </div>
           </div>
       )}

       {/* VIEW SUBMISSIONS MODAL */}
       {renderSubmissionModal()}

       {view === 'DASHBOARD' ? renderDashboard() : (
           <>
               <div className="flex justify-between items-center mb-8">
                 <h2 className="text-3xl font-bold dark:text-white flex items-center gap-2">
                   <LayoutDashboard className="w-8 h-8 text-primary-500" /> 
                   {user.role === UserRole.TEACHER ? 'Classroom Management' : 'My Classrooms'}
                 </h2>
                 <div className="flex gap-2">
                    {user.role === UserRole.TEACHER ? (
                        <button onClick={() => setView('CREATE')} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 shadow-md transition-transform hover:scale-105">
                            <Plus className="w-4 h-4" /> Create Classroom
                        </button>
                    ) : (
                        <button onClick={() => setView('JOIN')} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-transform hover:scale-105">
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
               {classrooms.length === 0 && view === 'LIST' ? (
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
               ) : view === 'LIST' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {classrooms.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => openClassroom(c.id)}
                            className="bg-white dark:bg-gray-800 p-0 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden group hover:shadow-xl transition-all flex flex-col text-left relative"
                        >
                            <div className="h-28 bg-gradient-to-r from-blue-500 to-blue-600 p-6 relative">
                                <h3 className="text-2xl font-bold text-white mb-1 relative z-10 truncate">{c.name}</h3>
                                <p className="text-blue-100 text-sm relative z-10">{c.subject}</p>
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500"></div>
                            </div>
                            <div className="p-6 flex-1 w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {c.studentIds.length} Students
                                    </div>
                                    <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                        {c.code}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-50 dark:border-gray-700">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span>
                                    <span>Click to manage</span>
                                </div>
                            </div>
                            {/* OVERLAY ACTIONS (Teacher) */}
                            {user.role === UserRole.TEACHER && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div onClick={(e) => { e.stopPropagation(); setActiveClassId(c.id); setActiveModal('INVITE'); }} className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/40 text-white cursor-pointer" title="Invite Link">
                                        <Share2 className="w-4 h-4"/>
                                    </div>
                                </div>
                            )}
                        </button>
                     ))}
                   </div>
               )}
           </>
       )}
    </div>
  );
};

export default ClassroomManager;

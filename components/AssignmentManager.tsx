
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Assignment, Question, QuestionType, AssignmentSubmission, Classroom } from '../types';
import { 
    FileText, Plus, Bot, Loader2, CheckCircle, Clock, 
    Settings, List, AlignLeft, AlignJustify, Mic, CheckSquare, 
    Trash2, Save, Play, Pause, ChevronRight, User as UserIcon,
    Download, RefreshCw, Sparkles, Send, MicOff, BarChart, Printer,
    Copy, Edit, Eye, MessageCircle, AlertCircle, FileDigit, Bell
} from 'lucide-react';
import { generateAssignmentFromPrompt, evaluateSubmission, generateClassReport } from '../services/gemini';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from "jspdf";

interface AssignmentManagerProps {
  user: User;
  classrooms?: Classroom[]; // Added for deployment selection
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ user, classrooms = [], assignments, setAssignments }) => {
  // VIEW STATES
  // Teacher: LIST -> CREATE -> REVIEW (Dashboard) -> GRADING (Individual)
  // Student: LIST -> TAKE -> RESULT
  const [view, setView] = useState<string>(user.role === UserRole.TEACHER ? 'TEACHER_LIST' : 'STUDENT_LIST');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFTS'>('ALL'); // For Teacher List
  
  // --- STATE: ASSIGNMENT CREATION (TEACHER) ---
  const [meta, setMeta] = useState({
      title: "New Assignment",
      subject: "Physics",
      topicPrompt: "",
      description: "Complete chapter 1 exercises.",
      grades: [10],
      type: QuestionType.MCQ,
      category: 'ASSIGNMENT' as 'ASSIGNMENT' | 'TEST',
      totalMarks: 20,
      durationMinutes: 30,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      classroomId: '' // For deployment
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAgent, setActiveAgent] = useState<'GENERATOR' | 'CHECKER' | 'REPORTER'>('GENERATOR');

  // --- STATE: ASSIGNMENT TAKING (STUDENT) ---
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // Text answers or Audio URLs
  const [audioBlobs, setAudioBlobs] = useState<Record<number, string>>({}); // Base64 for submission
  const [isRecording, setIsRecording] = useState<number | null>(null); // Question ID being recorded
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [timeLeft, setTimeLeft] = useState(0);

  // --- STATE: REVIEW & GRADING (TEACHER) ---
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradingChanges, setGradingChanges] = useState<Record<number, number>>({}); // Manual score overrides
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [report, setReport] = useState('');

  // --- STATE: STUDENT RESULT VIEW ---
  const [studentQuery, setStudentQuery] = useState('');

  // --- NOTIFICATION SIMULATION ---
  const showNotification = (msg: string) => {
      const el = document.createElement('div');
      el.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce flex items-center gap-2';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> ${msg}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
  };

  // --- PDF GENERATOR AGENT ---
  const generatePDF = (assignment: Assignment, includeAnswers: boolean = false) => {
      const doc = new jsPDF();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(22);
      doc.setTextColor(0, 51, 102);
      doc.text(assignment.title, margin, y);
      y += 10;

      // Meta Info
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Subject: ${assignment.subject || 'General'}`, margin, y);
      doc.text(`Type: ${assignment.category} | Marks: ${assignment.totalMarks}`, margin + 80, y);
      y += 8;
      doc.text(`Due Date: ${new Date(assignment.dueDate).toLocaleDateString()}`, margin, y);
      y += 15;

      // Description
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "italic");
      const splitDesc = doc.splitTextToSize(assignment.description, 170);
      doc.text(splitDesc, margin, y);
      y += (splitDesc.length * 7) + 10;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, 190, y);
      y += 15;

      // Questions
      doc.setFont("helvetica", "normal");
      assignment.questions.forEach((q, i) => {
          if (y > 270) {
              doc.addPage();
              y = 20;
          }

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const qTitle = `Q${i + 1}. ${q.text} [${q.marks} marks]`;
          const splitTitle = doc.splitTextToSize(qTitle, 170);
          doc.text(splitTitle, margin, y);
          y += (splitTitle.length * 6) + 5;

          if (q.type === QuestionType.MCQ && q.options) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
              q.options.forEach((opt, idx) => {
                  const prefix = String.fromCharCode(65 + idx);
                  doc.text(`${prefix}) ${opt}`, margin + 5, y);
                  y += 6;
              });
              y += 5;
          } else {
              y += 15; // Space for written answer
          }

          if (includeAnswers && (q.correctAnswer || q.modelAnswer)) {
              doc.setFontSize(10);
              doc.setTextColor(0, 128, 0);
              if (q.correctAnswer) doc.text(`Correct Answer: ${q.correctAnswer}`, margin, y);
              if (q.modelAnswer) {
                  y+=5;
                  const splitModel = doc.splitTextToSize(`Model Answer: ${q.modelAnswer}`, 170);
                  doc.text(splitModel, margin, y);
                  y += (splitModel.length * 5);
              }
              doc.setTextColor(0, 0, 0);
              y += 10;
          }
      });

      doc.save(`${assignment.title.replace(/\s+/g, '_')}.pdf`);
  };

  // --- TEACHER ACTIONS ---

  const handleAIGenerate = async () => {
      if (!meta.topicPrompt) return;
      setIsGenerating(true);
      try {
          const newQs = await generateAssignmentFromPrompt(
              meta.topicPrompt, 
              meta.subject, 
              meta.grades.join(','), 
              meta.type, 
              meta.totalMarks
          );
          setQuestions(newQs);
      } catch (e) {
          console.error(e);
          alert("Agent failed to generate. Try a clearer prompt.");
      } finally {
          setIsGenerating(false);
      }
  };

  const saveAssignment = (status: 'DRAFT' | 'PUBLISHED') => {
      const newAssign: Assignment = {
          id: Date.now().toString(),
          title: meta.title,
          description: meta.description,
          category: meta.category,
          classroomId: meta.classroomId,
          dueDate: meta.dueDate,
          status: status,
          type: 'AI',
          questions: questions,
          subject: meta.subject,
          totalMarks: meta.totalMarks,
          durationMinutes: meta.durationMinutes,
          grades: meta.grades,
          submissions: [],
          topicPrompt: meta.topicPrompt
      };
      setAssignments([newAssign, ...assignments]);
      setView('TEACHER_LIST');
      if(status === 'PUBLISHED') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      showNotification(status === 'DRAFT' ? 'Saved as Draft' : 'Assignment Deployed!');
  };

  const cloneAssignment = (a: Assignment) => {
      setMeta({
          title: `${a.title} (Copy)`,
          subject: a.subject || 'General',
          description: a.description,
          grades: a.grades || [10],
          type: QuestionType.MCQ, // Reset type or infer from questions
          category: a.category,
          totalMarks: a.totalMarks || 20,
          durationMinutes: a.durationMinutes || 30,
          topicPrompt: a.topicPrompt || '',
          dueDate: new Date().toISOString().slice(0, 16),
          classroomId: ''
      });
      setQuestions(a.questions);
      setView('TEACHER_CREATE');
  };

  const handlePublishResult = (assignId: string, subId: string) => {
      const updated = assignments.map(a => {
          if (a.id === assignId) {
              return {
                  ...a,
                  submissions: a.submissions.map(s => {
                      if (s.studentId === subId) {
                          return { ...s, status: 'RETURNED' as const };
                      }
                      return s;
                  })
              };
          }
          return a;
      });
      setAssignments(updated);
      showNotification('Results & Feedback sent to student!');
  };

  const handleManualGradeUpdate = (qId: number, score: number) => {
      setGradingChanges(prev => ({ ...prev, [qId]: score }));
  };

  const saveGrading = () => {
      if (!selectedSubmission || !activeAssignment) return;
      
      // Merge individual question scores
      const updatedQuestionScores: Record<number, number> = { ...(selectedSubmission.questionScores || {}), ...gradingChanges };
      
      // Recalculate total score
      const newScore = Object.values(updatedQuestionScores).reduce((a: number, b: number) => a + b, 0);

      const updatedSub: AssignmentSubmission = {
          ...selectedSubmission,
          score: newScore,
          questionScores: updatedQuestionScores,
          feedback: teacherFeedback || selectedSubmission.feedback,
          status: 'GRADED',
          teacherComments: teacherFeedback
      };

      const updatedAssigns = assignments.map(a => {
          if (a.id === activeAssignment.id) {
              return {
                  ...a,
                  submissions: a.submissions.map(s => s.studentId === selectedSubmission.studentId ? updatedSub : s)
              };
          }
          return a;
      });
      setAssignments(updatedAssigns);
      setSelectedSubmission(updatedSub);
      setGradingChanges({});
      showNotification('Grades Saved Locally. Click "Return" to notify student.');
  };

  const handleAICheck = async () => {
    if (!activeAssignment || !selectedSubmission) return;
    setIsGenerating(true);
    showNotification('AI Agent checking answers...');

    try {
        const result = await evaluateSubmission(activeAssignment.questions, selectedSubmission.answers);
        
        const updatedSub: AssignmentSubmission = {
            ...selectedSubmission,
            score: result.score,
            feedback: result.feedback,
            questionScores: result.questionScores,
            questionFeedback: result.questionFeedback,
            teacherComments: result.feedback
        };

        const updatedAssigns = assignments.map(a => {
            if (a.id === activeAssignment.id) {
                return {
                    ...a,
                    submissions: a.submissions.map(s => s.studentId === selectedSubmission.studentId ? updatedSub : s)
                };
            }
            return a;
        });
        
        setAssignments(updatedAssigns);
        setSelectedSubmission(updatedSub);
        showNotification(`AI Grading Complete: Score ${result.score}`);
    } catch (e) {
        console.error(e);
        showNotification('AI Grading Failed');
    } finally {
        setIsGenerating(false);
    }
  };

  const resolveStudentQuery = (sub: AssignmentSubmission) => {
      const updatedSub: AssignmentSubmission = { ...sub, queryStatus: 'RESOLVED', teacherComments: `Resolved: ${teacherFeedback}` };
      const updatedAssigns = assignments.map(a => {
          if (a.id === activeAssignment?.id) {
              return {
                  ...a,
                  submissions: a.submissions.map(s => s.studentId === sub.studentId ? updatedSub : s)
              };
          }
          return a;
      });
      setAssignments(updatedAssigns);
      setTeacherFeedback('');
      setSelectedSubmission(updatedSub);
      showNotification('Query Resolved');
  };

  // --- STUDENT ACTIONS ---
  
  // Timer Logic
  useEffect(() => {
      let timer: any;
      if (view === 'STUDENT_TAKE' && timeLeft > 0) {
          timer = setInterval(() => {
              setTimeLeft(prev => {
                  if (prev <= 1) {
                      clearInterval(timer);
                      submitAssignment(true); // Force submit
                      return 0;
                  }
                  if (prev % 30 === 0) setSaveStatus('Saved'); // Mock auto-save
                  return prev - 1;
              });
          }, 1000);
      }
      return () => clearInterval(timer);
  }, [view, timeLeft]);

  const startAssignment = (a: Assignment) => {
      setActiveAssignment(a);
      // Initialize time
      setTimeLeft((a.durationMinutes || 60) * 60);
      setView('STUDENT_TAKE');
  };

  const submitAssignment = (auto: boolean = false) => {
      if (!activeAssignment) return;
      const newSubmission: AssignmentSubmission = {
          studentId: user.id,
          studentName: user.name,
          submittedAt: new Date().toISOString(),
          answers: answers,
          audioBlobs: audioBlobs,
          status: 'PENDING',
          autoSubmitted: auto
      };
      
      const updatedAssignments = assignments.map(a => {
          if (a.id === activeAssignment.id) {
              return { ...a, submissions: [...a.submissions, newSubmission] };
          }
          return a;
      });
      setAssignments(updatedAssignments);
      setView('STUDENT_LIST');
      if (auto) alert("Time's up! Your answers have been auto-submitted.");
      else confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      showNotification('Submitted Successfully!');
  };

  const sendQuery = () => {
      if (!activeAssignment) return;
      const updated = assignments.map(a => {
          if (a.id === activeAssignment.id) {
              return {
                  ...a,
                  submissions: a.submissions.map(s => {
                      if (s.studentId === user.id) return { ...s, studentQuery, queryStatus: 'OPEN' as const };
                      return s;
                  })
              }
          }
          return a;
      });
      setAssignments(updated);
      setStudentQuery('');
      showNotification('Query Sent to Teacher');
  };

  // --- AUDIO LOGIC ---
  const handleAudioRecord = async (qId: number) => {
      if (isRecording === qId) {
          mediaRecorder.current?.stop();
          setIsRecording(null);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              const chunks: Blob[] = [];
              recorder.ondataavailable = e => chunks.push(e.data);
              recorder.onstop = () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  const url = URL.createObjectURL(blob);
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  reader.onloadend = () => {
                      setAudioBlobs(prev => ({ ...prev, [qId]: reader.result as string }));
                  };
                  setAnswers(prev => ({ ...prev, [qId]: url }));
              };
              recorder.start();
              mediaRecorder.current = recorder;
              setIsRecording(qId);
          } catch (e) { alert("Microphone access denied."); }
      }
  };

  // --- RENDERERS ---

  const renderTeacherCreator = () => (
      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in print:hidden">
          <div className="w-full lg:w-80 space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5"/> Assignment Settings
                  </h3>
                  <div className="space-y-4">
                      <input value={meta.title} onChange={e => setMeta({...meta, title: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="Title" />
                      <div className="flex gap-2">
                          <select value={meta.category} onChange={e => setMeta({...meta, category: e.target.value as any})} className="w-1/2 p-2 border rounded dark:bg-gray-700 dark:text-white font-bold">
                              <option value="ASSIGNMENT">Assignment</option>
                              <option value="TEST">Test</option>
                          </select>
                          <select value={meta.subject} onChange={e => setMeta({...meta, subject: e.target.value})} className="w-1/2 p-2 border rounded dark:bg-gray-700 dark:text-white">
                              {['Physics','Math','English','History'].map(s => <option key={s}>{s}</option>)}
                          </select>
                      </div>
                      
                      {/* Deployment Selection */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Deploy To Classroom</label>
                          <select 
                              value={meta.classroomId} 
                              onChange={e => setMeta({...meta, classroomId: e.target.value})}
                              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                          >
                              <option value="">Select a Classroom...</option>
                              {classrooms && classrooms.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>

                      <select value={meta.type} onChange={e => setMeta({...meta, type: e.target.value as QuestionType})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white">
                          <option value={QuestionType.MCQ}>MCQ</option>
                          <option value={QuestionType.SHORT}>Short Answer</option>
                          <option value={QuestionType.NUMERICAL}>Numerical Problem</option>
                          <option value={QuestionType.ORAL}>Oral Test</option>
                      </select>
                      <input type="number" value={meta.totalMarks} onChange={e => setMeta({...meta, totalMarks: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="Total Marks" />
                      <input type="number" value={meta.durationMinutes} onChange={e => setMeta({...meta, durationMinutes: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="Duration (Minutes)" />
                      <input type="datetime-local" value={meta.dueDate} onChange={e => setMeta({...meta, dueDate: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
                  </div>
              </div>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 p-8 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                  <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Bot className="w-8 h-8 text-blue-600" /> AI Assignment Creator</h2>
                  <p className="text-gray-500 text-sm">Describe the questions you need.</p>
              </div>
              
              {/* DESCRIPTION BOX (Appears after or during creation) */}
              <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Assignment Instructions (Visible to Students)</label>
                  <textarea value={meta.description} onChange={e => setMeta({...meta, description: e.target.value})} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white h-24" placeholder="Instructions for students..." />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6">
                  <textarea value={meta.topicPrompt} onChange={e => setMeta({...meta, topicPrompt: e.target.value})} placeholder="e.g. Create 3 Numerical problems on Kinematics." className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white h-24 resize-none" />
                  <div className="flex justify-end mt-2"><button onClick={handleAIGenerate} disabled={isGenerating || !meta.topicPrompt} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">{isGenerating ? <Loader2 className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4"/>} Generate Questions</button></div>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {questions.map((q, i) => (
                      <div key={q.id} className="p-4 border rounded-lg dark:border-gray-700 relative group">
                          <span className="font-bold text-blue-600">Q{i+1} ({q.type})</span>
                          <span className="float-right text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded dark:text-white">{q.marks} Marks</span>
                          <p className="mt-2 dark:text-white">{q.text}</p>
                          <div className="mt-2 text-xs text-gray-500">
                              <p><span className="font-bold">Correct:</span> {q.correctAnswer}</p>
                              {q.modelAnswer && <p><span className="font-bold">Model Answer:</span> {q.modelAnswer}</p>}
                          </div>
                      </div>
                  ))}
              </div>
              {questions.length > 0 && (
                  <div className="mt-6 flex justify-end gap-3 border-t pt-4 dark:border-gray-700">
                      <button onClick={() => saveAssignment('DRAFT')} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded font-bold hover:bg-gray-300">Save Draft</button>
                      <button onClick={() => saveAssignment('PUBLISHED')} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg"><Send className="w-4 h-4"/> Deploy Now</button>
                  </div>
              )}
          </div>
      </div>
  );

  const renderTeacherReview = () => {
      if (!activeAssignment) return null;
      return (
          <div className="flex flex-col h-[800px]">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                          <CheckSquare className="w-6 h-6 text-purple-600"/> Review: {activeAssignment.title}
                      </h2>
                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                          <span>Status: {activeAssignment.status}</span>
                          <span>Submissions: {activeAssignment.submissions.length}</span>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => generatePDF(activeAssignment, true)} className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200"><Download className="w-4 h-4"/> Download Key</button>
                      <button onClick={() => setActiveAgent('REPORTER')} className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 bg-purple-600 text-white"><BarChart className="w-4 h-4"/> Class Report</button>
                  </div>
              </div>

              <div className="flex flex-1 gap-6 overflow-hidden">
                  {/* STUDENT LIST */}
                  <div className="w-72 bg-white dark:bg-gray-800 rounded-xl shadow overflow-y-auto border border-gray-200 dark:border-gray-700">
                      {activeAssignment.submissions.map(sub => (
                          <button key={sub.studentId} onClick={() => { setSelectedSubmission(sub); setActiveAgent('CHECKER'); }} className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedSubmission?.studentId === sub.studentId ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}`}>
                              <div className="font-bold dark:text-white flex justify-between">{sub.studentName} {sub.queryStatus === 'OPEN' && <MessageCircle className="w-4 h-4 text-red-500 animate-pulse"/>}</div>
                              <div className="text-xs text-gray-500 flex justify-between mt-1">
                                  <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                  <span className={sub.status === 'RETURNED' ? 'text-green-600' : 'text-orange-500'}>{sub.status}</span>
                              </div>
                          </button>
                      ))}
                  </div>

                  {/* GRADING WORKSPACE */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-8 overflow-y-auto">
                      {activeAgent === 'REPORTER' ? (
                          <div className="space-y-4">
                              <h3 className="text-xl font-bold mb-4 dark:text-white">Class Performance Report</h3>
                              <button onClick={async () => setReport(await generateClassReport(activeAssignment.submissions, activeAssignment.questions, activeAssignment.title))} className="bg-purple-600 text-white px-4 py-2 rounded mb-4 flex items-center gap-2">
                                  {isGenerating ? <Loader2 className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4"/>} Generate Report
                              </button>
                              <div className="prose dark:prose-invert"><ReactMarkdown>{report}</ReactMarkdown></div>
                          </div>
                      ) : selectedSubmission ? (
                          <div className="space-y-6">
                              <div className="flex justify-between items-start border-b pb-4">
                                  <div>
                                      <h3 className="text-xl font-bold dark:text-white">{selectedSubmission.studentName}</h3>
                                      <p className="text-gray-500 text-sm">Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                                      {selectedSubmission.autoSubmitted && <span className="text-xs text-red-500 font-bold">Auto-Submitted via Timer</span>}
                                  </div>
                                  <div className="text-right">
                                      <div className="text-3xl font-bold text-green-600">{selectedSubmission.score} <span className="text-sm text-gray-400">/ {activeAssignment.totalMarks}</span></div>
                                      <div className="flex gap-2 mt-2">
                                          <button onClick={handleAICheck} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-blue-200"><Bot className="w-3 h-3"/> Auto-Check</button>
                                          <button onClick={() => handlePublishResult(activeAssignment.id, selectedSubmission.studentId)} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700">Return Result</button>
                                      </div>
                                  </div>
                              </div>

                              {selectedSubmission.studentQuery && (
                                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200">
                                      <h4 className="text-red-700 font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Student Query</h4>
                                      <p className="text-sm dark:text-red-200">{selectedSubmission.studentQuery}</p>
                                      {selectedSubmission.queryStatus === 'OPEN' && (
                                          <div className="mt-2 flex gap-2">
                                              <input value={teacherFeedback} onChange={e => setTeacherFeedback(e.target.value)} placeholder="Reply to query..." className="flex-1 p-1 border rounded text-sm dark:bg-gray-800 dark:text-white"/>
                                              <button onClick={() => resolveStudentQuery(selectedSubmission)} className="bg-red-600 text-white px-3 rounded text-sm">Resolve</button>
                                          </div>
                                      )}
                                  </div>
                              )}

                              <div className="space-y-6">
                                  {activeAssignment.questions.map((q, i) => (
                                      <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                          <div className="flex justify-between mb-2">
                                              <p className="font-bold dark:text-white">Q{i+1}: {q.text} <span className="text-gray-400 font-normal">({q.marks} Marks)</span></p>
                                              <input type="number" className="w-16 p-1 border rounded text-center font-bold dark:bg-gray-800 dark:text-white" placeholder={String(selectedSubmission.questionScores?.[q.id] || q.marks)} onChange={e => handleManualGradeUpdate(q.id, Number(e.target.value))} />
                                          </div>
                                          <div className="bg-white dark:bg-gray-800 p-3 rounded border mb-2">
                                              <p className="text-xs text-gray-400 uppercase">Student Answer:</p>
                                              {q.type === QuestionType.ORAL ? (
                                                  selectedSubmission.answers[q.id] ? <audio src={selectedSubmission.answers[q.id]} controls className="w-full h-8" /> : <span className="text-red-400">No Audio</span>
                                              ) : <p className="dark:text-gray-200">{selectedSubmission.answers[q.id] || "No Answer"}</p>}
                                          </div>
                                          {selectedSubmission.questionFeedback?.[q.id] && (
                                              <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded mb-2">
                                                  <strong>AI Feedback:</strong> {selectedSubmission.questionFeedback[q.id]}
                                              </div>
                                          )}
                                          <div className="grid grid-cols-2 gap-4 text-xs">
                                              <p className="text-green-600"><strong>Correct:</strong> {q.correctAnswer}</p>
                                              {q.modelAnswer && <p className="text-purple-600"><strong>Model:</strong> {q.modelAnswer}</p>}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <div className="flex justify-end gap-2">
                                  <input value={teacherFeedback} onChange={e => setTeacherFeedback(e.target.value)} placeholder="Overall feedback..." className="flex-1 p-2 border rounded dark:bg-gray-800 dark:text-white" />
                                  <button onClick={saveGrading} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">Save Grades</button>
                              </div>
                          </div>
                      ) : <div className="text-center text-gray-400 py-20 flex flex-col items-center"><UserIcon className="w-12 h-12 mb-4 opacity-50"/> Select a student submission to grade.</div>}
                  </div>
              </div>
          </div>
      );
  };

  const renderStudentView = () => {
      // LIST VIEW
      if (!activeAssignment) {
          return (
              <div className="p-6 max-w-6xl mx-auto">
                  <h2 className="text-3xl font-bold dark:text-white mb-6">My Tasks</h2>
                  <div className="grid gap-4">
                      {assignments.filter(a => a.status === 'PUBLISHED').map(a => {
                          const mySub = a.submissions.find(s => s.studentId === user.id);
                          return (
                              <div key={a.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col gap-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <div className="flex items-center gap-2">
                                              <h3 className="text-xl font-bold dark:text-white">{a.title}</h3>
                                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${a.category === 'TEST' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{a.category}</span>
                                          </div>
                                          <p className="text-sm text-gray-500 mt-1">{a.subject} • Due {new Date(a.dueDate).toLocaleDateString()} • {a.durationMinutes} Mins</p>
                                          
                                          {/* ASSIGNMENT DESCRIPTION - No prompt shown */}
                                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 border-l-4 border-blue-500">
                                              <p className="font-bold mb-1 text-xs uppercase text-gray-400">Description</p>
                                              {a.description}
                                          </div>
                                      </div>
                                      
                                      <div className="text-right flex flex-col items-end gap-2">
                                          {mySub ? (
                                              mySub.status === 'RETURNED' ? (
                                                  <>
                                                    <span className="text-sm font-bold text-green-600">Graded: {mySub.score}/{a.totalMarks}</span>
                                                    <button onClick={() => { setActiveAssignment(a); setView('STUDENT_RESULT'); }} className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow-lg animate-pulse">View Result</button>
                                                  </>
                                              ) : (
                                                  <span className="text-orange-500 font-bold bg-orange-100 px-3 py-1 rounded">Submitted</span>
                                              )
                                          ) : (
                                              <button onClick={() => startAssignment(a)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Start</button>
                                          )}
                                          <button onClick={() => generatePDF(a)} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"><Download className="w-3 h-3"/> Download PDF</button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          );
      }

      // RESULT VIEW
      if (view === 'STUDENT_RESULT') {
          const mySub = activeAssignment.submissions.find(s => s.studentId === user.id);
          if (!mySub) return null;
          return (
              <div className="p-6 max-w-4xl mx-auto">
                  <button onClick={() => { setActiveAssignment(null); setView('STUDENT_LIST'); }} className="mb-4 text-gray-500">← Back</button>
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border-t-8 border-green-500">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h1 className="text-3xl font-bold dark:text-white">Result: {activeAssignment.title}</h1>
                              <p className="text-gray-500">{activeAssignment.subject} • {activeAssignment.category}</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                              <span className="block text-sm text-gray-500">Your Score</span>
                              <span className="text-4xl font-bold text-green-600">{mySub.score} <span className="text-lg text-gray-400">/ {activeAssignment.totalMarks}</span></span>
                          </div>
                      </div>

                      {mySub.teacherComments && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded mb-6 border border-blue-100 dark:border-blue-800">
                              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2"><Bot className="w-4 h-4"/> Feedback</h4>
                              <p className="text-sm dark:text-gray-300">{mySub.teacherComments}</p>
                          </div>
                      )}

                      <div className="space-y-6 mb-8">
                          {activeAssignment.questions.map((q, i) => (
                              <div key={q.id} className="p-4 border rounded-lg dark:border-gray-700">
                                  <div className="flex justify-between font-bold mb-2">
                                      <span className="dark:text-white">Q{i+1}: {q.text}</span>
                                      <span className="text-gray-500">{mySub.questionScores?.[q.id] || 0} / {q.marks} Marks</span>
                                  </div>
                                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded mb-2">
                                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Answer:</span>
                                      <p className="dark:text-gray-300">{mySub.answers[q.id] || '(No Answer)'}</p>
                                  </div>
                                  {mySub.questionFeedback?.[q.id] && (
                                      <p className="text-xs text-blue-600 mb-2">{mySub.questionFeedback[q.id]}</p>
                                  )}
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                                      <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase block mb-1">Correct Answer:</span>
                                      <p className="text-sm text-green-800 dark:text-green-300">{q.correctAnswer}</p>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="border-t pt-6">
                          <h4 className="font-bold dark:text-white mb-2 flex items-center gap-2"><MessageCircle className="w-5 h-5"/> Have a query?</h4>
                          <div className="flex gap-2">
                              <input value={studentQuery} onChange={e => setStudentQuery(e.target.value)} className="flex-1 p-3 border rounded dark:bg-gray-700 dark:text-white" placeholder="Type your question for the teacher..." />
                              <button onClick={sendQuery} className="bg-blue-600 text-white px-6 rounded font-bold hover:bg-blue-700">Send</button>
                          </div>
                          {mySub.queryStatus === 'OPEN' && <p className="text-xs text-orange-500 mt-2 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Query sent! Waiting for teacher response.</p>}
                      </div>
                  </div>
              </div>
          );
      }

      // TAKE VIEW (Existing logic mostly)
      return (
          <div className="max-w-4xl mx-auto pb-20 mt-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-b-4 border-blue-600 mb-6 sticky top-4 z-10 flex justify-between items-center">
                  <div>
                      <h1 className="text-2xl font-bold dark:text-white">{activeAssignment.title}</h1>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                          <span>{saveStatus}</span>
                      </div>
                  </div>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold">{activeAssignment.totalMarks} Marks</span>
              </div>
              <div className="space-y-6">
                  {activeAssignment.questions.map((q, i) => (
                      <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-bold mb-4 dark:text-white text-lg">Q{i+1}: {q.text} <span className="text-gray-400 text-sm font-normal">({q.marks} Marks)</span></p>
                          {q.type === QuestionType.MCQ ? (
                              <div className="space-y-2">{q.options?.map(opt => <label key={opt} className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}><input type="radio" name={`q-${q.id}`} checked={answers[q.id] === opt} onChange={() => { setAnswers({...answers, [q.id]: opt}); setSaveStatus('Saving...'); }} className="w-4 h-4 text-blue-600"/><span className="dark:text-white">{opt}</span></label>)}</div>
                          ) : q.type === QuestionType.ORAL ? (
                              <div className="flex items-center gap-4"><button onClick={() => handleAudioRecord(q.id)} className={`p-4 rounded-full ${isRecording === q.id ? 'bg-red-500 animate-pulse' : 'bg-blue-600'} text-white`}>{isRecording === q.id ? <div className="w-6 h-6 bg-white rounded-sm"/> : <Mic className="w-6 h-6"/>}</button>{answers[q.id] && <audio src={answers[q.id]} controls className="h-10"/>}</div>
                          ) : (
                              <textarea value={answers[q.id] || ''} onChange={e => { setAnswers({...answers, [q.id]: e.target.value}); setSaveStatus('Saving...'); }} className="w-full p-3 border rounded dark:bg-gray-900 dark:text-white" rows={4} placeholder="Type answer..." />
                          )}
                      </div>
                  ))}
              </div>
              <div className="fixed bottom-6 right-6"><button onClick={() => submitAssignment(false)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-bold shadow-2xl flex items-center gap-2"><CheckCircle className="w-6 h-6"/> Submit</button></div>
          </div>
      );
  };

  // MAIN RENDER
  if (user.role === UserRole.STUDENT) return renderStudentView();

  return (
      <div className="p-6 max-w-7xl mx-auto">
          {view === 'TEACHER_LIST' && (
              <>
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-bold dark:text-white">Assignment Dashboard</h2>
                      <div className="flex gap-2">
                          <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 rounded ${activeTab === 'ALL' ? 'bg-gray-200 dark:bg-gray-700 font-bold' : ''}`}>All</button>
                          <button onClick={() => setActiveTab('DRAFTS')} className={`px-4 py-2 rounded ${activeTab === 'DRAFTS' ? 'bg-gray-200 dark:bg-gray-700 font-bold' : ''}`}>Drafts</button>
                          <button onClick={() => setView('TEACHER_CREATE')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 ml-4"><Plus className="w-5 h-5"/> Create</button>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {assignments.filter(a => activeTab === 'ALL' || (activeTab === 'DRAFTS' && a.status === 'DRAFT')).map(a => (
                          <div key={a.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 relative group">
                              <div className="flex justify-between items-start mb-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${a.category === 'TEST' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{a.category}</span>
                                  <span className={`text-xs px-2 py-1 rounded font-bold ${a.status === 'DRAFT' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span>
                              </div>
                              <h3 className="font-bold text-lg dark:text-white mb-1">{a.title}</h3>
                              <p className="text-sm text-gray-500 mb-4 line-clamp-2 italic">{a.description}</p>
                              
                              <div className="flex gap-2 mt-4">
                                  {a.status === 'DRAFT' ? (
                                      <button onClick={() => { setActiveAssignment(a); setMeta({...meta, title: a.title, description: a.description, topicPrompt: a.topicPrompt || '', classroomId: a.classroomId || ''}); setQuestions(a.questions); setView('TEACHER_CREATE'); }} className="flex-1 py-2 bg-yellow-100 text-yellow-700 rounded font-bold hover:bg-yellow-200 flex justify-center items-center gap-2"><Edit className="w-4 h-4"/> Edit</button>
                                  ) : (
                                      <button onClick={() => { setActiveAssignment(a); setView('TEACHER_REVIEW'); }} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-bold hover:bg-gray-200 flex justify-center items-center gap-2"><CheckSquare className="w-4 h-4"/> Review</button>
                                  )}
                                  <button onClick={() => cloneAssignment(a)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200" title="Clone"><Copy className="w-4 h-4"/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </>
          )}

          {view === 'TEACHER_CREATE' && (
              <div>
                  <button onClick={() => setView('TEACHER_LIST')} className="mb-4 text-gray-500 hover:text-black dark:text-gray-400">← Back to Dashboard</button>
                  {renderTeacherCreator()}
              </div>
          )}

          {view === 'TEACHER_REVIEW' && (
              <div>
                  <button onClick={() => setView('TEACHER_LIST')} className="mb-4 text-gray-500 hover:text-black dark:text-gray-400">← Back to Dashboard</button>
                  {renderTeacherReview()}
              </div>
          )}
      </div>
  );
};

export default AssignmentManager;


import React, { useState, useEffect, useRef } from 'react';
import { generateTest, analyzeProctoringFrame } from '../services/gemini';
import { TestData, QuestionType, User, UserRole, TestResult, Classroom } from '../types';
import { 
    CheckCircle, XCircle, AlertCircle, Award, Loader2, Clock, 
    ShieldAlert, Plus, Play, Eye, FileText, Globe, Camera, Mic, 
    Users, AlertTriangle, ScreenShare, Activity, Lock, Gavel, Monitor, X, CheckSquare, Square, Megaphone
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TestManagerProps {
  user: User;
  globalTests: TestData[];
  testHistory: TestResult[];
  classrooms: Classroom[];
  onAddTest: (test: TestData) => void;
  onSaveResult: (result: TestResult) => void;
  onDeployTest: (testId: string, classIds: string[]) => void;
  onPublishResults: (testId: string) => void; // New prop
  onExit?: () => void;
}

const TestManager: React.FC<TestManagerProps> = ({ user, globalTests, testHistory, classrooms, onAddTest, onSaveResult, onDeployTest, onPublishResults, onExit }) => {
  // Navigation & View State
  const [view, setView] = useState<'LIST' | 'CREATE_SELECT' | 'CREATE_AI' | 'CREATE_MANUAL' | 'TAKE' | 'SUBMITTING' | 'RESULT' | 'DEPLOY' | 'PROCTOR_DASHBOARD' | 'PERMISSIONS'>('LIST');
  
  // Teacher State
  const [topic, setTopic] = useState('');
  const [qCount, setQCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualQuestions, setManualQuestions] = useState<{text: string, answer: string}[]>([]);
  const [currentManualQ, setCurrentManualQ] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  
  // Multi-select Deployment
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Student State
  const [joinCode, setJoinCode] = useState('');
  const [activeTest, setActiveTest] = useState<TestData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  // PROCTORING STATE
  const [violationLog, setViolationLog] = useState<string[]>([]);
  const [warnings, setWarnings] = useState(0);
  const [proctorStatus, setProctorStatus] = useState('Monitoring');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastViolationRef = useRef<number>(0);

  // --- TEACHER ACTIONS ---

  const handleAiGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateTest(topic, 'Medium', qCount);
      const newTest: TestData = { 
          ...data, 
          id: Date.now().toString(),
          creatorId: user.id, 
          status: 'DRAFT',
          accessCode: Math.floor(100000 + Math.random() * 900000).toString(),
          settings: { ...data.settings, proctoring: true },
          resultsPublished: false
      };
      onAddTest(newTest);
      setView('LIST');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addManualQuestion = () => {
      if(!currentManualQ) return;
      setManualQuestions([...manualQuestions, { text: currentManualQ, answer: '' }]);
      setCurrentManualQ('');
  }

  const saveManualTest = () => {
      const newTest: TestData = {
          id: Date.now().toString(),
          title: manualTitle,
          subject: 'General',
          creatorId: user.id,
          // Fix: Added missing properties to TestSettings within saveManualTest to satisfy the interface definition.
          settings: { 
            timeLimitMinutes: 30, 
            proctoring: true, 
            requireWebcam: true, 
            preventTabSwitch: true, 
            allowCalculator: false, 
            allowInternet: false, 
            adaptive: false, 
            shuffleQuestions: false 
          },
          status: 'DRAFT',
          accessCode: Math.floor(100000 + Math.random() * 900000).toString(),
          questions: manualQuestions.map((q, i) => ({
              id: i,
              text: q.text,
              type: QuestionType.SHORT,
              explanation: 'Manual question',
              difficulty: 'Medium'
          })),
          resultsPublished: false
      };
      onAddTest(newTest);
      setView('LIST');
      setManualTitle('');
      setManualQuestions([]);
  };

  const openDeployModal = (testId: string) => {
      setSelectedTestId(testId);
      setSelectedClassIds([]); // Reset
      setView('DEPLOY');
  }

  const toggleClassSelection = (classId: string) => {
      setSelectedClassIds(prev => 
          prev.includes(classId) 
              ? prev.filter(id => id !== classId) 
              : [...prev, classId]
      );
  };

  const handleDeploy = () => {
      if (selectedTestId && selectedClassIds.length > 0) {
          onDeployTest(selectedTestId, selectedClassIds);
          setView('LIST');
          setSelectedClassIds([]);
      }
  };

  const handleAnnounce = (testId: string) => {
      if(confirm("Are you sure? All students will be notified and can see their results immediately.")) {
          onPublishResults(testId);
      }
  };

  // --- STUDENT ACTIONS ---
  
  const requestPermissions = async () => {
      try {
          // Request permissions with specific constraints for mobile & sensitivity
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                  facingMode: 'user', // Prefer front camera for self-view on mobile
                  width: { ideal: 640 },
                  height: { ideal: 480 }
              }, 
              audio: { 
                  echoCancellation: true, 
                  noiseSuppression: true,
                  autoGainControl: true 
              } 
          });
          setStream(mediaStream);
          setPermissionsGranted(true);
          setView('TAKE');
      } catch (e) {
          console.error("Permission Error:", e);
          alert("Permission Denied: Camera and Microphone are required. Please check your browser settings or ensure no other app is using the camera.");
      }
  }

  const joinLiveTest = () => {
      const test = globalTests.find(t => t.accessCode === joinCode || t.id === 'demo-photosynthesis'); // Demo hack
      if (test) {
          // Check if already taken
          const taken = testHistory.find(r => r.testId === test.id);
          if (taken) {
              alert("You have already submitted this test. Please wait for results.");
              return;
          }
          initiateTest(test);
      } else {
          alert("Invalid Code or Test Not Live");
      }
  }

  const initiateTest = (test: TestData) => {
      setActiveTest(test);
      setViolationLog([]);
      setWarnings(0);
      setPermissionsGranted(false);
      setAnswers({});
      setView('PERMISSIONS');
  }

  const viewMyResult = (test: TestData) => {
      // Find the specific result
      const result = testHistory.find(r => r.testId === test.id);
      if (result) {
          // Set state to simulate the "RESULT" view logic
          setActiveTest(test);
          setAnswers(result.answers);
          setWarnings(result.warningsCount || 0);
          setViolationLog(result.violationLog || []);
          setView('RESULT');
      }
  };

  // --- PROCTORING LOGIC ---

  useEffect(() => {
    // Tab Switching Detection (Requirement: Immediate Auto-Submit)
    const handleVisibilityChange = () => {
        if (document.hidden && view === 'TAKE') {
            triggerViolation("Tab/Window Change Detected (Auto-Submit Triggered)", true);
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        // Clean up stream on unmount or view change
        if (stream && view !== 'TAKE') {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        }
    };
  }, [view, stream]);

  // Initialize Sensors when in TAKE mode
  useEffect(() => {
      let visionInterval: any;
      let audioInterval: any;

      if (view === 'TAKE' && permissionsGranted && stream) {
          // 1. Setup Video
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }

          // 2. Setup Audio
          if (!audioContextRef.current) {
              try {
                  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                  audioContextRef.current = new AudioContext();
                  analyserRef.current = audioContextRef.current.createAnalyser();
                  const source = audioContextRef.current.createMediaStreamSource(stream);
                  source.connect(analyserRef.current);
                  analyserRef.current.fftSize = 256;
                  analyserRef.current.smoothingTimeConstant = 0.5; // Smooth out jitter
                  
                  // Resume context if suspended (common on mobile browsers)
                  if (audioContextRef.current.state === 'suspended') {
                      audioContextRef.current.resume();
                  }
              } catch (e) {
                  console.error("Audio Context Error", e);
              }
          }

          // 3. Start AI Vision Loop (Every 5 seconds)
          visionInterval = setInterval(checkVision, 5000);

          // 4. Start Audio Loop (Every 200ms for high responsiveness)
          audioInterval = setInterval(checkAudio, 200);
      }

      return () => {
          clearInterval(visionInterval);
          clearInterval(audioInterval);
      };
  }, [view, permissionsGranted, stream]);

  const checkAudio = () => {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);

      // SENSITIVITY SETTING:
      // A threshold of 15 is usually just above the noise floor of a quiet room.
      // This will detect whispering or low talking.
      const THRESHOLD = 15; 

      if (average > THRESHOLD) {
          triggerViolation("Audio Alert: Voice/Whispering Detected");
      }
  };

  const checkVision = async () => {
      if (!videoRef.current) return;
      
      // Draw video to low-res canvas for analysis
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]; // Compress jpg

      setProctorStatus('AI Analyzing...');
      try {
          // Send to Gemini
          const result = await analyzeProctoringFrame(base64);
          
          // Fix: Update to check result.action as analyzeProctoringFrame returns {action, message?}
          if (result.action !== 'NONE') {
              triggerViolation(`AI Vision Alert: ${result.message || result.action}`, result.action === 'CRITICAL_VIOLATION' || result.action === 'TERMINATE_EXAM');
          }
      } catch (e) {
          console.error("Vision Check Failed", e);
      } finally {
          setProctorStatus('Monitoring');
      }
  };

  const triggerViolation = (reason: string, isSevere: boolean = false) => {
      if (view !== 'TAKE') return;

      const now = Date.now();
      // Debounce: Avoid spammed warnings within 5 seconds for the same reason
      if (!isSevere && (now - lastViolationRef.current < 5000)) {
          return;
      }
      
      lastViolationRef.current = now;
      const log = `${new Date().toLocaleTimeString()}: ${reason}`;
      setViolationLog(prev => [...prev, log]);

      if (isSevere) {
           alert(`SEVERE VIOLATION: ${reason}. Test will be auto-submitted.`);
           submitTest(true);
           return;
      }

      setWarnings(prev => {
          const newCount = prev + 1;
          
          // Warning Toast
          const toast = document.createElement('div');
          toast.className = "fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl z-[100] animate-bounce font-bold border-2 border-white text-center";
          toast.innerText = `⚠️ WARNING (${newCount}/5): ${reason}`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);

          if (newCount >= 5) {
              // Use timeout to allow state update to reflect before alert
              setTimeout(() => {
                  alert("Maximum warnings (5/5) reached. System is auto-submitting your test.");
                  submitTest(true);
              }, 500);
          }
          return newCount;
      });
  };

  const handleTimerTick = () => {
      if (timeLeft > 0) {
          setTimeLeft(prev => prev - 1);
      } else if (timeLeft === 0 && view === 'TAKE') {
          submitTest(true);
      }
  };

  useEffect(() => {
    let timer: any;
    if (view === 'TAKE' && activeTest) {
        if (timeLeft === 0 && activeTest.settings.timeLimitMinutes) {
             setTimeLeft(activeTest.settings.timeLimitMinutes * 60);
        }
        timer = setInterval(handleTimerTick, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, view, activeTest]);

  const submitTest = (auto = false) => {
    if (!activeTest) return;
    
    // Switch to SUBMITTING state
    setView('SUBMITTING');

    // Stop camera & audio
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
    }

    // Simulate "Uploading" delay for realism
    setTimeout(() => {
        let score = 0;
        activeTest.questions.forEach(q => {
          if (q.type === QuestionType.MCQ && answers[q.id] === q.correctAnswer) {
            score++;
          }
        });

        const result: TestResult = {
          testId: activeTest.id,
          studentId: user.id,
          score,
          maxScore: activeTest.questions.length,
          answers,
          dateTaken: new Date().toISOString(),
          status: 'COMPLETED',
          violationLog,
          warningsCount: warnings,
          autoSubmitted: auto
        };
        
        onSaveResult(result);
        
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });

        if (onExit) {
            onExit();
        } else {
            setView('LIST'); // Return to list instead of result directly (Wait for publish)
        }
    }, 2000);
  };

  // --- RENDERERS ---

  const setVideoRef = (el: HTMLVideoElement | null) => {
    (videoRef as any).current = el;
    if (el && stream) {
        el.srcObject = stream;
    }
  };

  if (user.role === UserRole.TEACHER) {
      return (
          <div className="p-6 max-w-6xl mx-auto">
              {view === 'LIST' && (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h2 className="text-3xl font-bold dark:text-white">Test Management</h2>
                          <div className="flex gap-2">
                             <button onClick={() => setView('PROCTOR_DASHBOARD')} className="bg-gray-800 text-white px-4 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-700 shadow-lg border border-gray-600">
                                  <Activity className="w-5 h-5 text-red-500 animate-pulse"/> Live Proctoring
                              </button>
                              <button onClick={() => setView('CREATE_SELECT')} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                                  <Plus className="w-5 h-5"/> Create New Test
                              </button>
                          </div>
                      </div>

                      <div className="grid gap-4">
                          {globalTests.map(test => (
                              <div key={test.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex justify-between items-center transition-all hover:shadow-md">
                                  <div>
                                      <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                          {test.title}
                                          {test.status === 'LIVE' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse font-bold">● LIVE</span>}
                                          {test.resultsPublished && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded font-bold">RESULTS OUT</span>}
                                      </h3>
                                      <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                          <span>{test.questions.length} Questions</span>
                                          <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 rounded">Code: {test.accessCode || 'N/A'}</span>
                                          {/* Show count of deployed classes */}
                                          {test.assignedClassIds && test.assignedClassIds.length > 0 && <span className="text-blue-600 dark:text-blue-400 font-medium">Assigned to {test.assignedClassIds.length} Classes</span>}
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      {test.status !== 'DRAFT' && !test.resultsPublished && (
                                          <button 
                                            onClick={() => handleAnnounce(test.id)}
                                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded font-bold text-sm flex items-center gap-2"
                                          >
                                              <Megaphone className="w-4 h-4" /> Announce Result
                                          </button>
                                      )}
                                      
                                      <button className="text-gray-500 hover:text-primary-600 p-2"><Eye className="w-5 h-5"/></button>
                                      
                                      {test.status === 'DRAFT' && (
                                          <button 
                                            onClick={() => openDeployModal(test.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"
                                          >
                                              <Globe className="w-4 h-4" /> Deploy
                                          </button>
                                      )}
                                      {test.status === 'LIVE' && (
                                          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm">
                                              End Test
                                          </button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {view === 'PROCTOR_DASHBOARD' && (
                  <div className="space-y-6">
                      <div className="flex items-center justify-between mb-6 border-b pb-4 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setView('LIST')} className="text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white font-bold mr-2">← Back</button>
                            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-500"/> Live Proctoring Dashboard</h2>
                          </div>
                          <div className="flex gap-4 text-sm font-medium">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 24 Active</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 2 Warnings</span>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {/* Simulated Students */}
                           {[1,2,3,4,5,6].map((i) => (
                               <div key={i} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 border ${i===2 ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
                                   <div className="bg-gray-900 rounded-lg aspect-video relative overflow-hidden group">
                                       <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                            <Users className="w-16 h-16 opacity-20" />
                                       </div>
                                       {/* Mock Video Feed Overlay */}
                                       <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            <span className="bg-black/60 text-white text-[10px] px-1.5 rounded font-mono">CAM-{i}0{i}</span>
                                            {i===2 && <span className="bg-red-600 text-white text-[10px] px-1.5 rounded font-bold animate-pulse">EYE MOVEMENT</span>}
                                       </div>
                                       <div className="absolute top-2 right-2 flex gap-1">
                                           <div className={`w-2 h-2 rounded-full ${i===2 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                       </div>
                                       
                                       {/* Status Bar */}
                                       <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm p-2 flex justify-between items-center text-white text-xs">
                                           <div className="font-bold">Student {i}</div>
                                           <div className="flex items-center gap-2">
                                               <span>warn: {i===2 ? '2/5' : '0/5'}</span>
                                               <div className="w-12 h-1 bg-gray-600 rounded-full overflow-hidden">
                                                   <div className="bg-green-500 h-full" style={{width: `${Math.random() * 100}%`}}></div>
                                               </div>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           ))}
                      </div>
                  </div>
              )}

              {view === 'DEPLOY' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 animate-slide-in">
                          <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
                              <Globe className="w-5 h-5 text-green-500"/> Deploy Test
                          </h3>
                          <p className="text-gray-500 mb-6">Select classrooms to assign this test to. Students will be notified immediately.</p>
                          
                          <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                              {classrooms.length === 0 ? (
                                  <p className="text-sm text-red-500">No classrooms found. Create one first.</p>
                              ) : classrooms.map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => toggleClassSelection(c.id)}
                                    className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${selectedClassIds.includes(c.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                  >
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedClassIds.includes(c.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 bg-white'}`}>
                                          {selectedClassIds.includes(c.id) && <CheckSquare className="w-3 h-3"/>}
                                      </div>
                                      <div>
                                          <p className="font-bold text-sm dark:text-white">{c.name}</p>
                                          <p className="text-xs text-gray-500">{c.code} • {c.studentIds.length} Students</p>
                                      </div>
                                  </div>
                              ))}
                          </div>

                          <div className="flex gap-4 justify-end">
                              <button onClick={() => setView('LIST')} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                              <button onClick={handleDeploy} disabled={selectedClassIds.length === 0} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-green-700 shadow-lg">
                                  Deploy to Selected
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {view === 'CREATE_SELECT' && (
                  <div className="max-w-4xl mx-auto text-center py-10">
                      <h2 className="text-3xl font-bold mb-8 dark:text-white">Choose Creation Method</h2>
                      <div className="grid grid-cols-2 gap-8">
                          <button onClick={() => setView('CREATE_AI')} className="bg-gradient-to-br from-purple-500 to-blue-600 p-10 rounded-2xl text-white shadow-xl hover:scale-105 transition-transform text-left group relative overflow-hidden">
                              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors">
                                  <Loader2 className="w-8 h-8" />
                              </div>
                              <h3 className="text-2xl font-bold mb-2">Method 1: AI Prompt</h3>
                              <p className="opacity-90">Simply type a topic and let AI generate questions, answers, and distractors instantly.</p>
                          </button>

                          <button onClick={() => setView('CREATE_MANUAL')} className="bg-white dark:bg-gray-800 p-10 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:border-primary-500 transition-colors text-left group">
                              <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-gray-600 dark:text-gray-300 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                  <FileText className="w-8 h-8" />
                              </div>
                              <h3 className="text-2xl font-bold mb-2 dark:text-white">Method 2: Manual</h3>
                              <p className="text-gray-500">Create questions from scratch. Full control over text, options, and difficulty.</p>
                          </button>
                      </div>
                      <button onClick={() => setView('LIST')} className="mt-8 text-gray-500 hover:underline">Cancel</button>
                  </div>
              )}

              {view === 'CREATE_AI' && (
                  <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-bold mb-6 dark:text-white">AI Test Generator</h3>
                      <div className="space-y-4 mb-6">
                          <input 
                              value={topic}
                              onChange={e => setTopic(e.target.value)}
                              placeholder="Enter Topic (e.g. Thermodynamics)"
                              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <select 
                             value={qCount}
                             onChange={e => setQCount(Number(e.target.value))}
                             className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                              <option value={5}>5 Questions</option>
                              <option value={10}>10 Questions</option>
                              <option value={20}>20 Questions</option>
                          </select>
                      </div>
                      <button 
                        onClick={handleAiGenerate}
                        disabled={loading || !topic}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"
                      >
                          {loading ? <Loader2 className="animate-spin" /> : 'Generate & Save Draft'}
                      </button>
                      <button onClick={() => setView('CREATE_SELECT')} className="w-full mt-2 text-gray-500 py-2">Back</button>
                  </div>
              )}

              {view === 'CREATE_MANUAL' && (
                  <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-bold mb-6 dark:text-white">Manual Test Creator</h3>
                      <input 
                          value={manualTitle}
                          onChange={e => setManualTitle(e.target.value)}
                          placeholder="Test Title"
                          className="w-full p-3 border rounded-lg mb-6 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      
                      <div className="mb-6 space-y-4">
                          {manualQuestions.map((q, i) => (
                              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border flex justify-between">
                                  <span className="truncate flex-1 dark:text-white">{i+1}. {q.text}</span>
                              </div>
                          ))}
                      </div>

                      <div className="flex gap-2 mb-6">
                          <input 
                              value={currentManualQ}
                              onChange={e => setCurrentManualQ(e.target.value)}
                              placeholder="Type Question Text"
                              className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <button onClick={addManualQuestion} className="bg-gray-200 dark:bg-gray-600 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Add</button>
                      </div>

                      <button onClick={saveManualTest} disabled={!manualTitle || manualQuestions.length === 0} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">
                          Save Test
                      </button>
                  </div>
              )}
          </div>
      );
  }

  // --- STUDENT VIEW ---
  return (
      <div className="p-6 max-w-7xl mx-auto">
          {view === 'LIST' && (
              <div className="space-y-8">
                  <div className="bg-gradient-to-r from-red-500 to-orange-600 p-8 rounded-2xl text-white shadow-xl">
                      <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                          <Play className="w-8 h-8 fill-current" /> Live Test Arena
                      </h2>
                      <p className="mb-6 opacity-90">Enter the unique code provided by your instructor to join a live proctored exam.</p>
                      
                      <div className="flex gap-2 max-w-md bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                          <input 
                              value={joinCode}
                              onChange={e => setJoinCode(e.target.value)}
                              placeholder="ENTER CODE (e.g. 123456)"
                              className="flex-1 bg-transparent border-none text-white placeholder-white/50 text-center font-mono text-xl focus:ring-0"
                          />
                          <button onClick={joinLiveTest} className="bg-white text-red-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100">
                              JOIN
                          </button>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-xl font-bold dark:text-white mb-4">Assigned Tests</h3>
                      <div className="grid gap-4">
                          {globalTests.filter(t => t.status === 'LIVE' || t.id === 'demo-photosynthesis').map(test => {
                              const alreadyTaken = testHistory.some(r => r.testId === test.id);
                              
                              return (
                                  <div key={test.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex justify-between items-center transition-transform hover:scale-[1.01]">
                                      <div>
                                          <h4 className="font-bold text-lg dark:text-white">{test.title}</h4>
                                          <div className="flex gap-2 mt-1">
                                              <span className="text-sm text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded animate-pulse">● LIVE NOW</span>
                                              {test.settings.proctoring && <span className="text-sm text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> PROCTORED</span>}
                                          </div>
                                      </div>
                                      
                                      {alreadyTaken ? (
                                          test.resultsPublished ? (
                                              <button onClick={() => viewMyResult(test)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 flex items-center gap-2">
                                                  <CheckCircle className="w-4 h-4"/> View Result
                                              </button>
                                          ) : (
                                              <button disabled className="bg-yellow-100 text-yellow-700 px-6 py-2 rounded-lg font-bold shadow-sm border border-yellow-200 cursor-not-allowed flex items-center gap-2 animate-pulse">
                                                  <Clock className="w-4 h-4"/> Waiting for Result
                                              </button>
                                          )
                                      ) : (
                                          <button onClick={() => initiateTest(test)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-primary-700">
                                              Start Exam
                                          </button>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          )}

          {view === 'PERMISSIONS' && (
              <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl text-center mt-10 border border-gray-200 dark:border-gray-700">
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShieldAlert className="w-12 h-12 text-red-500" />
                  </div>
                  <h2 className="text-3xl font-bold dark:text-white mb-4">Proctoring Required</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
                      This exam requires access to your **Camera** and **Microphone** for AI invigilation. 
                      Strict anti-cheating measures are active. 
                      <br/><br/>
                      <span className="text-red-500 font-bold">Warning:</span> Suspicious eye movements or looking away will trigger auto-warnings. 5 warnings = Fail.
                  </p>
                  
                  <div className="flex justify-center gap-12 mb-10">
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full"><Camera className="w-8 h-8" /></div>
                          <span className="font-medium">Camera</span>
                      </div>
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full"><Mic className="w-8 h-8" /></div>
                          <span className="font-medium">Microphone</span>
                      </div>
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full"><ScreenShare className="w-8 h-8" /></div>
                          <span className="font-medium">Tab Focus</span>
                      </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <button onClick={() => setView('LIST')} className="text-gray-500 px-6 py-3 font-bold hover:text-gray-700">Cancel</button>
                    <button 
                        onClick={requestPermissions}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg text-lg flex items-center gap-2"
                    >
                        Grant Permissions & Start
                    </button>
                  </div>
              </div>
          )}

          {view === 'TAKE' && activeTest && (
              <div className="h-[calc(100vh-6rem)] flex flex-col relative">
                  {/* HEADER */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6 flex justify-between items-center z-10">
                      <div>
                          <h2 className="text-xl font-bold dark:text-white">{activeTest.title}</h2>
                          <p className="text-xs text-gray-400">ID: {activeTest.id}</p>
                      </div>
                      <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                <span className="text-xl font-mono font-bold dark:text-white">
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                          </div>
                          
                          {/* WARNING METER */}
                          <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-gray-500 uppercase">Warnings ({warnings}/5)</span>
                              <div className="flex gap-1 mt-1">
                                  {[1,2,3,4,5].map(w => (
                                      <div key={w} className={`w-6 h-2 rounded-full transition-colors ${w <= warnings ? 'bg-red-600 animate-pulse' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* BODY - RESPONSIVE LAYOUT */}
                  <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                      {/* Questions (Order 2 on mobile to be below camera) */}
                      <div className="flex-1 overflow-y-auto pr-4 pb-20 order-2 lg:order-1">
                          {activeTest.questions.map((q, i) => (
                              <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                                  <div className="flex gap-4">
                                      <span className="w-8 h-8 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                          {i + 1}
                                      </span>
                                      <div className="flex-1">
                                          <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{q.text}</p>
                                          {q.type === QuestionType.MCQ && q.options && (
                                              <div className="space-y-3">
                                                  {q.options.map(opt => (
                                                      <label key={opt} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                          <input 
                                                              type="radio" 
                                                              name={`q-${q.id}`} 
                                                              checked={answers[q.id] === opt}
                                                              onChange={() => setAnswers({...answers, [q.id]: opt})}
                                                              className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                                                          />
                                                          <span className="dark:text-white">{opt}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          )}
                                          {q.type !== QuestionType.MCQ && (
                                              <textarea 
                                                  value={answers[q.id] || ''}
                                                  onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                                                  className="w-full p-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white h-32"
                                                  placeholder="Type your answer here..."
                                              />
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
                          <button onClick={() => submitTest(false)} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-lg mt-4">
                              Submit Exam
                          </button>
                      </div>

                      {/* SIDEBAR: PROCTORING STATUS (Order 1 on mobile to be top) */}
                      <div className="w-full lg:w-80 flex flex-col gap-4 order-1 lg:order-2 flex-shrink-0">
                          {/* Camera Feed */}
                          <div className="bg-black rounded-xl overflow-hidden shadow-lg border-2 border-red-500 relative aspect-video">
                              <video ref={setVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                              <div className="absolute top-2 left-2 flex items-center gap-2">
                                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-white font-bold bg-black/50 px-2 py-0.5 rounded">REC</span>
                              </div>
                              
                              {/* Audio Warning Overlay */}
                              {audioLevel > 15 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-sm z-20 animate-pulse">
                                      <div className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-2xl">
                                          <Mic className="w-6 h-6 animate-bounce" />
                                          <span>🔊 VOICE DETECTED</span>
                                      </div>
                                  </div>
                              )}

                              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-xs text-white z-10">
                                  <span className="bg-black/50 px-2 rounded flex items-center gap-1">
                                      {proctorStatus.includes('Analyzing') ? <Loader2 className="w-3 h-3 animate-spin"/> : <Eye className="w-3 h-3"/>}
                                      {proctorStatus}
                                  </span>
                                  {audioLevel > 15 && (
                                      <span className="bg-red-500/80 px-2 rounded animate-pulse font-bold">
                                          NOISE ALERT
                                      </span>
                                  )}
                              </div>
                          </div>

                          {/* Monitoring Status Panel */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                                  <Activity className="w-4 h-4 text-green-500" /> Active Sensors
                              </h3>
                              
                              <div className="space-y-3">
                                  {/* Audio Meter */}
                                  <div>
                                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                                          <span>Audio Level (Whisper Sensitive)</span>
                                          <span className={audioLevel > 15 ? 'text-red-500 font-bold' : ''}>{Math.round(audioLevel)}</span>
                                      </div>
                                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full transition-all duration-100 ${audioLevel > 15 ? 'bg-red-500' : 'bg-green-500'}`} 
                                            style={{ width: `${Math.min(audioLevel * 3, 100)}%` }} // Amplified visual for low values
                                          ></div>
                                      </div>
                                  </div>

                                  {/* AI Status */}
                                  <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                      <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded text-blue-600 dark:text-blue-200">
                                          <Eye className="w-4 h-4" />
                                      </div>
                                      <div>
                                          <p className="text-xs font-bold text-blue-800 dark:text-blue-200">Gemini Vision AI</p>
                                          <p className="text-[10px] text-blue-600 dark:text-blue-300">Scanning face & gaze every 5s</p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl text-xs text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                              <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Anti-Cheating Rules:</p>
                              <ul className="list-disc pl-4 space-y-1 opacity-90">
                                  <li>Do not look away from screen.</li>
                                  <li>No whispering or talking (High Sensitivity).</li>
                                  <li>No multiple faces in frame.</li>
                                  <li>Tab switching = Immediate Fail.</li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {view === 'SUBMITTING' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <div className="relative">
                      <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
                      <div className="w-24 h-24 border-4 border-green-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <h2 className="text-2xl font-bold mt-8 dark:text-white">Submitting Test...</h2>
                  <p className="text-gray-500 mt-2">Uploading proctoring logs and verifying answers.</p>
              </div>
          )}

          {view === 'RESULT' && (
              <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl text-center mt-10 border border-gray-200 dark:border-gray-700 animate-slide-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold dark:text-white mb-2">Exam Result</h2>
                  <p className="text-gray-500 mb-8">
                      {activeTest?.resultsPublished ? "Here is how you performed." : "Your responses have been recorded and sent for grading."}
                  </p>
                  
                  {/* Score Display */}
                  <div className="mb-8">
                      <span className="text-6xl font-bold text-primary-600">{
                          // Calculate mock score based on answers if not available
                          Object.keys(answers).length // Mock score logic just for display if actual score isn't passed
                      }</span>
                      <span className="text-2xl text-gray-400"> / {activeTest?.questions.length}</span>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-left mb-8">
                      <h3 className="font-bold mb-4 dark:text-white">Proctoring Report</h3>
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600 dark:text-gray-300">Total Warnings:</span>
                          <span className="font-bold dark:text-white">{warnings}/5</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-600 dark:text-gray-300">Submission Type:</span>
                          <span className={`font-bold ${violationLog.some(l => l.includes('Auto-Submit')) ? 'text-red-500' : 'text-green-500'}`}>
                              {violationLog.some(l => l.includes('Auto-Submit')) ? 'Forced Auto-Submit' : 'Standard'}
                          </span>
                      </div>
                      
                      {violationLog.length > 0 && (
                          <div className="mt-4 border-t pt-4 dark:border-gray-600">
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Violation Log</h4>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                  {violationLog.map((log, i) => (
                                      <div key={i} className="text-xs text-red-600 font-mono bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                          {log}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <button onClick={() => setView('LIST')} className="bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700">
                      Return to Dashboard
                  </button>
              </div>
          )}
      </div>
  );
};

export default TestManager;

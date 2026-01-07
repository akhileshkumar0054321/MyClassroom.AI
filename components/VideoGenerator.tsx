
import React, { useState, useRef, useEffect } from 'react';
import { generateVideoScript } from '../services/gemini';
import { VideoScript, VideoChapter } from '../types';
import { Play, Pause, Loader2, Video as VideoIcon, BrainCircuit, Lightbulb, Sparkles, MonitorPlay, RefreshCw, Download, Share2 } from 'lucide-react';

interface VideoGeneratorProps {
    onSave?: (script: VideoScript) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onSave }) => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(2); 
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  
  // Player State
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Thinking State
  const [thinkingStep, setThinkingStep] = useState('');

  // --- CANVAS RENDERING ENGINE ---
  const drawSlide = (chapter: VideoChapter, ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      // 1. Background (Dynamic Gradient)
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const hue = (currentChapterIndex * 45 + time * 0.1) % 360; // Slower hue shift
      gradient.addColorStop(0, `hsl(${hue}, 40%, 15%)`);
      gradient.addColorStop(1, `hsl(${hue + 30}, 40%, 5%)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Animated Particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for(let i=0; i<8; i++) {
          const size = 60 + i * 20;
          const x = width/2 + Math.sin(time * 0.002 + i) * (width * 0.3);
          const y = height/2 + Math.cos(time * 0.003 + i) * (height * 0.3);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
      }

      // 3. Typography & Layout
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // -- Title --
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px Inter, system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(chapter.title, width / 2, height * 0.25);
      
      // -- Content Box --
      const boxWidth = width * 0.8;
      const boxHeight = height * 0.5;
      const boxX = (width - boxWidth) / 2;
      const boxY = height * 0.35;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // -- Content Text (Visual Cue or Script Summary) --
      const textToDisplay = chapter.visualCue.length > 10 ? chapter.visualCue : chapter.content;
      
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '500 28px Inter, system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      
      const words = textToDisplay.split(' ');
      let line = '';
      const lineHeight = 44;
      let y = boxY + 60; // Start padding

      for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > boxWidth - 60 && n > 0) {
              ctx.fillText(line, width / 2, y);
              line = words[n] + ' ';
              y += lineHeight;
          } else {
              line = testLine;
          }
      }
      ctx.fillText(line, width / 2, y);

      // 4. Progress Indicator
      const totalChapters = script?.chapters.length || 1;
      const progressWidth = width / totalChapters;
      
      // Draw progress track
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, height - 8, width, 8);
      
      // Draw completed segments
      ctx.fillStyle = '#4f46e5'; // Primary Color
      ctx.fillRect(0, height - 8, progressWidth * (currentChapterIndex), 8);
      
      // Draw current segment pulsing
      const pulse = (Math.sin(time * 0.1) + 1) / 2; // 0 to 1
      ctx.fillStyle = `rgba(99, 102, 241, ${0.5 + pulse * 0.5})`;
      ctx.fillRect(progressWidth * currentChapterIndex, height - 8, progressWidth, 8);

      // 5. Recording Indicator
      if (isRecording) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(40, 40, 10, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText("REC", 60, 40);
      }
  };

  // --- ANIMATION LOOP ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !script) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      if (!ctx.roundRect) {
         ctx.roundRect = (x:number, y:number, w:number, h:number) => ctx.fillRect(x,y,w,h);
      }

      let frameCount = 0;
      let animationId: number;

      const render = () => {
          frameCount++;
          if (script && script.chapters[currentChapterIndex]) {
              drawSlide(script.chapters[currentChapterIndex], ctx, canvas.width, canvas.height, frameCount);
          }
          animationId = requestAnimationFrame(render);
      };
      
      render();
      return () => cancelAnimationFrame(animationId);
  }, [script, currentChapterIndex, isRecording]);

  // --- PLAYBACK CONTROLLER ---
  const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
  };

  const speakChapter = (index: number) => {
      if (!script || index >= script.chapters.length) {
          setIsPlaying(false);
          if (isRecording) stopRecording();
          return;
      }

      setIsPlaying(true);
      window.speechSynthesis.cancel();

      const text = script.chapters[index].content;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0; 
      
      utterance.onend = () => {
          if (index < script.chapters.length - 1) {
              setCurrentChapterIndex(index + 1);
              speakChapter(index + 1); // Auto-advance
          } else {
              setIsPlaying(false);
              if (isRecording) stopRecording(); // Finished
          }
      };

      utterance.onerror = (e) => {
          console.error("TTS Error", e);
          setIsPlaying(false);
          if(isRecording) stopRecording();
      };

      window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
      if (isPlaying) {
          window.speechSynthesis.pause();
          setIsPlaying(false);
      } else {
          if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
          } else {
              speakChapter(currentChapterIndex);
          }
          setIsPlaying(true);
      }
  };

  const handleRestart = () => {
      window.speechSynthesis.cancel();
      setCurrentChapterIndex(0);
      speakChapter(0);
  };

  // --- EXPORT LOGIC ---
  const handleExportVideo = () => {
      if (!canvasRef.current || !script) return;
      
      const stream = canvasRef.current.captureStream(30); 
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${script.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lesson.webm`;
          a.click();
          URL.revokeObjectURL(url);
          setIsRecording(false);
          setIsPlaying(false);
      };
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.start();
      setIsRecording(true);
      handleRestart();
  };

  // --- GENERATION LOGIC ---
  const handleGenerate = async () => {
    setLoading(true);
    setThinkingStep('Analyzing Prompt...');
    
    setTimeout(() => setThinkingStep('Generating Script & Slides...'), 1000);
    setTimeout(() => setThinkingStep('Drafting Visual Cues...'), 2500);

    try {
      const result = await generateVideoScript(prompt, duration, 'English', 'Educational');
      setScript(result);
      setCurrentChapterIndex(0);
      
      // AUTO SAVE
      if (onSave) onSave(result);

    } catch (error) {
      console.error("Failed to generate content", error);
    } finally {
      setLoading(false);
      setThinkingStep('');
    }
  };

  // Cleanup
  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
      };
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
        <VideoIcon className="w-8 h-8 text-primary-500" />
        Video Studio <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold ml-2">FREE PIPELINE</span>
      </h2>

      {!script && !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-3xl mx-auto animate-fade-in">
          <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold dark:text-white">Create Educational Videos</h3>
                <p className="text-gray-500">Enter a topic, and our Free Engine will render and export a video lesson instantly.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Video Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., 'Explain photosynthesis in 2 minutes', 'History of Rome summary'..."
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 min-h-[120px]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration: ~{duration} minutes
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 text-lg"
            >
              Generate Video
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Player Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {loading ? (
                 <div className="bg-black rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center text-white shadow-2xl">
                     <Loader2 className="w-16 h-16 animate-spin mb-4 text-primary-500" />
                     <h3 className="text-xl font-bold animate-pulse">{thinkingStep}</h3>
                 </div>
            ) : (
                <div className="relative group">
                    <canvas 
                        ref={canvasRef} 
                        width={1280} 
                        height={720} 
                        className="w-full h-auto bg-black rounded-xl shadow-2xl"
                    />
                    
                    {/* Overlay Controls */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${isPlaying || isRecording ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                         {!isRecording && (
                             <button 
                                onClick={handlePlayPause}
                                className="bg-white/20 backdrop-blur-sm p-6 rounded-full hover:bg-white/30 transition-all transform hover:scale-110"
                             >
                                 {isPlaying ? <Pause className="w-12 h-12 text-white fill-current" /> : <Play className="w-12 h-12 text-white fill-current" />}
                             </button>
                         )}
                         {isRecording && (
                             <div className="text-white flex flex-col items-center">
                                 <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mb-2"></div>
                                 <span className="font-bold">Recording in Progress...</span>
                                 <span className="text-xs opacity-70">Please wait for the video to finish playing.</span>
                             </div>
                         )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm bg-black/50 px-2 py-1 rounded backdrop-blur-md">
                            Slide {currentChapterIndex + 1} of {script.chapters.length}
                        </span>
                        
                        <div className="flex gap-2">
                             <button onClick={handleRestart} className="text-white hover:bg-white/20 bg-black/50 p-2 rounded-full backdrop-blur-md" title="Restart">
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {script && !loading && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                            <MonitorPlay className="w-5 h-5" /> Live Script
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleExportVideo}
                                disabled={isRecording}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isRecording ? 'bg-red-100 text-red-600' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md'}`}
                            >
                                {isRecording ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                                {isRecording ? 'Recording...' : 'Export Video'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-40 overflow-y-auto mb-4 border border-gray-100 dark:border-gray-700">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-serif text-lg">
                            {script.chapters[currentChapterIndex].content}
                        </p>
                    </div>
                    
                    {/* Chapters Nav */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {script.chapters.map((chap, idx) => (
                            <button
                                key={idx}
                                onClick={() => { 
                                    if(isRecording) return; // Lock nav during record
                                    window.speechSynthesis.cancel();
                                    setCurrentChapterIndex(idx); 
                                    setIsPlaying(false);
                                }}
                                disabled={isRecording}
                                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${currentChapterIndex === idx ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'} ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {idx + 1}. {chap.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* AI Insights Sidebar */}
          {script && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 h-fit border-l-4 border-indigo-500 animate-slide-in">
                <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-500" />
                    AI Teacher Insights
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    Students typically ask these questions about "{script.topic}":
                </p>
                
                <div className="space-y-3">
                    {script.anticipatedQuestions?.map((q, idx) => (
                        <div key={idx} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-tight">{q}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <button className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm">
                        <Share2 className="w-4 h-4"/> Share with Class
                    </button>
                    
                    <button 
                        onClick={() => { setScript(null); window.speechSynthesis.cancel(); setIsRecording(false); }}
                        className="text-sm font-bold text-gray-500 hover:text-red-500 w-full text-center transition-colors"
                    >
                        Create New Video
                    </button>
                </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;

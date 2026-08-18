import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import { StudentSession, UserRole } from "./types";

// Helper to get GoogleGenAI on server
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // 10MB for video frames
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // In-memory state
  const activeSessions = new Map<string, StudentSession>();
  const invigilators = new Set<string>();

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- GEMINI SERVER-SIDE API ROUTES ---

  // 1. Generate Test
  app.post("/api/gemini/generate-test", async (req, res) => {
    try {
      const { topic, difficulty = "Medium", count = 5 } = req.body;
      const ai = getAiClient();
      const prompt = `
        Generate a comprehensive, rigorous test paper on: "${topic}".
        Difficulty Level: ${difficulty}.
        Number of questions: ${count}.
        Include a mix of MCQs and descriptive/short answer questions.
        For MCQs: include 4 distinct options, specify the exact 'correctAnswer', and a detailed explanation.
        For Short/Descriptive questions: provide a detailed 'modelAnswer' and 'explanation'.
        Assign marks per question (MCQ: 1-2 marks, Short: 3-5 marks).
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subject: { type: Type.STRING },
          settings: {
            type: Type.OBJECT,
            properties: {
              timeLimitMinutes: { type: Type.INTEGER },
              proctoring: { type: Type.BOOLEAN },
              requireWebcam: { type: Type.BOOLEAN },
              preventTabSwitch: { type: Type.BOOLEAN },
              allowCalculator: { type: Type.BOOLEAN },
              allowInternet: { type: Type.BOOLEAN },
              adaptive: { type: Type.BOOLEAN },
              shuffleQuestions: { type: Type.BOOLEAN },
            },
            required: ["timeLimitMinutes", "proctoring", "requireWebcam", "preventTabSwitch", "allowCalculator", "allowInternet", "adaptive", "shuffleQuestions"]
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                text: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["MCQ", "SHORT", "LONG", "ONE_WORD", "TRUE_FALSE", "NUMERICAL"] },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswer: { type: Type.STRING },
                modelAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                marks: { type: Type.INTEGER }
              },
              required: ["id", "text", "type", "explanation", "difficulty", "marks"]
            }
          }
        },
        required: ["title", "subject", "questions", "settings"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server generate-test error:", err);
      res.status(500).json({ error: err.message || "Failed to generate test" });
    }
  });

  // 2. Video Script Generation
  app.post("/api/gemini/video-script", async (req, res) => {
    try {
      const { topic, duration = 2, language = "English", style = "Educational" } = req.body;
      const ai = getAiClient();
      const prompt = `
        Create an engaging, structured educational video script for: "${topic}".
        Target Duration: ${duration} minutes. Language: ${language}. Style: ${style}.
        Structure it as a sequence of clear slides/chapters.
        For 'content', provide the exact engaging narrator script (approx 2-4 sentences per slide).
        For 'visualCue', describe what should visually appear on the presentation slide.
        Also provide 5 anticipated questions students would ask about this topic.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          totalDuration: { type: Type.STRING },
          summary: { type: Type.STRING },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                content: { type: Type.STRING },
                visualCue: { type: Type.STRING },
              },
              required: ["title", "duration", "content", "visualCue"]
            }
          },
          anticipatedQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["topic", "totalDuration", "chapters", "summary", "anticipatedQuestions"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server video-script error:", err);
      res.status(500).json({ error: err.message || "Failed to generate video script" });
    }
  });

  // 3. Smart Notes Generation
  app.post("/api/gemini/generate-notes", async (req, res) => {
    try {
      const { topic, detailLevel = "Comprehensive" } = req.body;
      const ai = getAiClient();
      const prompt = `
        Create comprehensive revision notes for "${topic}".
        Level of Detail: ${detailLevel}.
        Format in rich Markdown with clean headers, bullet points, key definitions, mnemonics, and practical examples.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });
      res.json({ content: response.text || "" });
    } catch (err: any) {
      console.error("Server generate-notes error:", err);
      res.status(500).json({ error: err.message || "Failed to generate notes" });
    }
  });

  // 4. PPT Maker Generation
  app.post("/api/gemini/generate-ppt", async (req, res) => {
    try {
      const { topic, slideCount = 5 } = req.body;
      const ai = getAiClient();
      const prompt = `Create a professional presentation on "${topic}" with ${slideCount} slides.`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                speakerNotes: { type: Type.STRING },
                imageDescription: { type: Type.STRING },
              },
              required: ["title", "bullets", "speakerNotes", "imageDescription"]
            }
          }
        },
        required: ["topic", "slides"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server generate-ppt error:", err);
      res.status(500).json({ error: err.message || "Failed to generate presentation" });
    }
  });

  // 5. Assignment Generation
  app.post("/api/gemini/generate-assignment", async (req, res) => {
    try {
      const { topic, gradeLevel = "10", questionCount = 5, includeSubjective = true, marksPerQuestion = 5, includeAudio = false } = req.body;
      const ai = getAiClient();
      const prompt = `
        Create a homework assignment for Grade ${gradeLevel} on the topic: "${topic}".
        Number of questions: ${questionCount}.
        Include Subjective Questions: ${includeSubjective}.
        Include Audio/Oral Response Questions: ${includeAudio}.
        Standard Marks per Question: ${marksPerQuestion}.
        Return a well-structured JSON format.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          subject: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                text: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["MCQ", "SHORT", "LONG", "VIDEO_RESPONSE", "ORAL"] },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                modelAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                marks: { type: Type.INTEGER }
              },
              required: ["id", "text", "type", "explanation", "difficulty", "marks"]
            }
          }
        },
        required: ["title", "description", "subject", "questions"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server generate-assignment error:", err);
      res.status(500).json({ error: err.message || "Failed to generate assignment" });
    }
  });

  // 6. Assignment Evaluation
  app.post("/api/gemini/evaluate-submission", async (req, res) => {
    try {
      const { assignmentTitle, questions, submission } = req.body;
      const ai = getAiClient();
      const prompt = `
        You are an expert educator grading an assignment submission.
        Assignment Title: "${assignmentTitle}".
        Questions and Model Answers: ${JSON.stringify(questions)}
        Student Submission Answers: ${JSON.stringify(submission.answers)}

        Grade each question fairly against the model answers and question max marks.
        Provide constructive feedback per question and overall summary feedback.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Total score achieved across all questions" },
          feedback: { type: Type.STRING, description: "Overall feedback and encouragement" },
          questionFeedback: { 
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.INTEGER },
                score: { type: Type.NUMBER },
                feedback: { type: Type.STRING }
              },
              required: ["questionId", "score", "feedback"]
            }
          }
        },
        required: ["score", "feedback", "questionFeedback"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const questionFeedbackMap: Record<number, string> = {};
      const questionScoresMap: Record<number, number> = {};
      if (Array.isArray(parsed.questionFeedback)) {
        parsed.questionFeedback.forEach((item: any) => {
          questionFeedbackMap[item.questionId] = item.feedback;
          questionScoresMap[item.questionId] = item.score;
        });
      }

      res.json({
        score: parsed.score || 0,
        feedback: parsed.feedback || "Submission graded successfully.",
        questionFeedback: questionFeedbackMap,
        questionScores: questionScoresMap
      });
    } catch (err: any) {
      console.error("Server evaluate-submission error:", err);
      res.status(500).json({ error: err.message || "Failed to evaluate submission" });
    }
  });

  // 7. Classroom Analytics Report
  app.post("/api/gemini/class-report", async (req, res) => {
    try {
      const { classroomName, studentCount, assignmentCount, averageScore } = req.body;
      const ai = getAiClient();
      const prompt = `
        Generate an insightful executive academic performance report for:
        Classroom: "${classroomName}"
        Total Students: ${studentCount}
        Assignments Evaluated: ${assignmentCount}
        Class Average Score: ${averageScore}%
        Include actionable insights, areas of strength, and intervention strategies. Format as Markdown.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });
      res.json({ report: response.text || "" });
    } catch (err: any) {
      console.error("Server class-report error:", err);
      res.status(500).json({ error: err.message || "Failed to generate class report" });
    }
  });

  // 8. Doubt Resolver
  app.post("/api/gemini/resolve-doubt", async (req, res) => {
    try {
      const { doubt, context = "" } = req.body;
      const ai = getAiClient();
      const prompt = `
        You are a friendly, patient, and brilliant AI tutor.
        Context / Subject: ${context}
        Student's Question / Doubt: "${doubt}"
        
        Answer clearly and step-by-step. Provide intuitive analogies.
        Verify if the question is academic. Suggest 3 related follow-up questions.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          isAcademic: { type: Type.BOOLEAN },
          relatedQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["answer", "isAcademic", "relatedQuestions"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server resolve-doubt error:", err);
      res.status(500).json({ error: err.message || "Failed to resolve doubt" });
    }
  });

  // 9. Learning Path Generator
  app.post("/api/gemini/learning-path", async (req, res) => {
    try {
      const { goal, days = 7 } = req.body;
      const ai = getAiClient();
      const prompt = `Create a structured, step-by-step ${days}-day learning schedule to master: "${goal}".`;
      
      const schema = {
        type: Type.OBJECT,
        properties: {
          goal: { type: Type.STRING },
          schedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                topic: { type: Type.STRING },
                activities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["day", "topic", "activities"]
            }
          }
        },
        required: ["goal", "schedule"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server learning-path error:", err);
      res.status(500).json({ error: err.message || "Failed to generate learning path" });
    }
  });

  // 10. Career Guide
  app.post("/api/gemini/career-path", async (req, res) => {
    try {
      const { interests } = req.body;
      const ai = getAiClient();
      const prompt = `
        Provide personalized, inspiring career guidance for a student with the following interests and skills:
        "${interests}"
        Include recommended degrees, top industry career trajectories, emerging skills to learn, and milestones.
        Format in Markdown.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });
      res.json({ result: response.text || "" });
    } catch (err: any) {
      console.error("Server career-path error:", err);
      res.status(500).json({ error: err.message || "Failed to generate career path" });
    }
  });

  // 11. AI Proctoring Frame Analysis
  app.post("/api/gemini/proctoring", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.json({ action: "NONE" });
      }
      const ai = getAiClient();
      const prompt = `
        You are a high-accuracy AI Exam Invigilator deployed in a live examination environment.
        Analyze this webcam frame for integrity violations.
        
        Rules:
        1. Face Missing/Out of Frame -> Warning: "Face not detected in camera frame. Please return to screen."
        2. Multiple Faces Detected -> Critical Violation: "Multiple faces detected in camera frame."
        3. Looking away repeatedly -> Warning: "Unusual head or eye movement detected."
        4. Normal examinee behavior -> Action: "NONE"
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["NONE", "WARNING", "CRITICAL_VIOLATION", "TERMINATE_EXAM"] },
          message: { type: Type.STRING }
        },
        required: ["action"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]
        },
        config: { responseMimeType: "application/json", responseSchema: schema }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Server proctoring error:", err);
      res.json({ action: "NONE" });
    }
  });

  // 12. Veo Video Generation / Preview
  app.post("/api/gemini/generate-veo", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = getAiClient();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: `Educational animation: ${prompt}, clear visibility, 4k, photorealistic or animated style.`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      // Poll until done or max 30s
      let count = 0;
      while (!operation.done && count < 12) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        operation = await ai.operations.getVideosOperation({ operation });
        count++;
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (videoUri) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        const videoRes = await fetch(videoUri, {
          headers: { 'x-goog-api-key': apiKey || "" }
        });
        if (videoRes.ok) {
          const buffer = await videoRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return res.json({ videoDataUrl: `data:video/mp4;base64,${base64}` });
        }
      }

      res.json({ videoUri: videoUri || null, done: operation.done });
    } catch (err: any) {
      console.error("Server generate-veo error:", err);
      res.status(500).json({ error: err.message || "Veo generation failed" });
    }
  });

  // --- EXISTING INVIGILATOR & REAL-TIME SOCKET LOGIC ---

  app.get("/api/invigilator/students", (req, res) => {
    res.json(Array.from(activeSessions.values()));
  });

  app.post("/api/invigilator/kick", (req, res) => {
    const { studentId, invigilatorId, reason } = req.body;
    const session = activeSessions.get(studentId);
    
    if (session) {
      session.status = 'KICKED';
      io.to(session.socketId!).emit('student_kicked', { reason });
      io.to('invigilators').emit('session_updated', session);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Student session not found" });
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    socket.on("join_as_invigilator", (data) => {
      socket.join("invigilators");
      invigilators.add(socket.id);
      socket.emit("initial_state", Array.from(activeSessions.values()));
    });

    socket.on("student_joined", (session: StudentSession) => {
      session.socketId = socket.id;
      session.status = 'ACTIVE';
      activeSessions.set(session.studentId, session);
      io.to("invigilators").emit("student_joined", session);
    });

    socket.on("violation_updated", (data: { studentId: string, slashCount: number, lastViolation: string }) => {
      const session = activeSessions.get(data.studentId);
      if (session) {
        session.slashCount = data.slashCount;
        session.lastViolation = data.lastViolation;
        io.to("invigilators").emit("session_updated", session);
      }
    });

    socket.on("stream_frame", (data: { studentId: string, frame: string }) => {
      io.to("invigilators").emit("student_frame", data);
    });

    socket.on("disconnect", () => {
      if (invigilators.has(socket.id)) {
        invigilators.delete(socket.id);
      } else {
        for (const [id, session] of activeSessions.entries()) {
          if (session.socketId === socket.id) {
            session.status = 'DISCONNECTED';
            io.to("invigilators").emit("session_updated", session);
            break;
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

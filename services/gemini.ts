
import { GoogleGenAI, Type } from "@google/genai";
import { VideoScript, TestData, LearningPath, Presentation, QuestionType, DoubtResponse, Question, AssignmentSubmission } from "../types";

// Helper to get GoogleGenAI client with correct initialization
const getClient = async (useVeo: boolean = false) => {
  if (useVeo) {
    const win = window as any;
    if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function' && await win.aistudio.hasSelectedApiKey()) {
        // Key is injected via environment
    } else if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
       await win.aistudio.openSelectKey();
    }
  }

  // Always use process.env.API_KEY directly as required by guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- PROCTORING AGENT ---
export const analyzeProctoringFrame = async (imageBase64: string): Promise<{ suspicious: boolean, reason: string }> => {
  const ai = await getClient();
  const prompt = `
    Analyze this webcam frame of a student taking an online exam. STRICT PROCTORING MODE.
    
    Flag as 'suspicious': true if ANY of the following are detected:
    1. **Multiple Faces**: More than one person visible in the frame.
    2. **Looking Away**: Head turned significantly left, right, or up. Eyes gazing off-screen to read notes. (Slight downward gaze for typing/writing is Acceptable).
    3. **Absence**: No face visible in the frame.
    4. **Objects**: Usage of mobile phones, books, headphones, or other electronic devices.
    
    Be sensitive to suspicious eye movement.
    If suspicious, provide a short 'reason' (e.g. "Looking away left", "Multiple faces detected", "Phone detected").
    Otherwise 'suspicious': false.
    
    Return JSON.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      suspicious: { type: Type.BOOLEAN },
      reason: { type: Type.STRING }
    },
    required: ["suspicious", "reason"]
  };

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: prompt }
            ]
        },
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      
      const text = response.text;
      if (!text) return { suspicious: false, reason: "No response" };
      return JSON.parse(text) as { suspicious: boolean, reason: string };
  } catch (e) {
      console.error("Proctoring Error", e);
      return { suspicious: false, reason: "AI Service Error" };
  }
};

// --- VIDEO ---
export const generateVideoScript = async (topic: string, duration: number, language: string, style: string): Promise<VideoScript> => {
  const ai = await getClient();
  const prompt = `
    Create an educational video script for: "${topic}".
    Target Duration: ${duration} minutes. Language: ${language}.
    Structure it as a sequence of slides.
    For 'content', provide the exact narrator script (keep it concise, ~2-3 sentences per slide).
    For 'visualCue', describe what should be shown on screen (text summary or image description).
    Also provide 5 anticipated questions.
    Return JSON.
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
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}") as VideoScript;
};

export const generateVeoPreview = async (prompt: string): Promise<string | null> => {
  try {
    const ai = await getClient(true); 
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Educational animation: ${prompt}, clear visibility, 4k, photorealistic or animated style.`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    return videoUri ? `${videoUri}&key=${process.env.API_KEY}` : null;
  } catch (e) {
    console.error("Veo generation failed", e);
    return null;
  }
};

// --- EBOOK ---
export const generateEbookContentStream = async (topic: string, onChunk: (text: string) => void) => {
  const ai = await getClient();
  const prompt = `Write a multi-chapter ebook on: "${topic}". Include TOC, 3 Chapters, Summary. Format: Markdown.`;
  const stream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  for await (const chunk of stream) {
    if (chunk.text) onChunk(chunk.text);
  }
};

// --- NOTES ---
export const generateNotes = async (topic: string, detailLevel: string): Promise<string> => {
  const ai = await getClient();
  const prompt = `Create revision notes for "${topic}". Level: ${detailLevel}. Markdown format. Include Key Concepts, Mnemonics, Formulas.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "";
};

// --- PPT ---
export const generatePPT = async (topic: string, slideCount: number): Promise<Presentation> => {
  const ai = await getClient();
  const prompt = `Create a presentation on "${topic}" with ${slideCount} slides. Return JSON.`;
  
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
            imageDescription: { type: Type.STRING }
          },
          required: ["title", "bullets", "speakerNotes", "imageDescription"]
        }
      }
    },
    required: ["topic", "slides"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema }
  });

  return JSON.parse(response.text || "{}") as Presentation;
};

// --- ASSIGNMENT AGENTS (NEW) ---

// Agent 1: Assignment Generator
export const generateAssignmentFromPrompt = async (
    userPrompt: string, 
    subject: string, 
    grade: string, 
    type: QuestionType, 
    marks: number
): Promise<Question[]> => {
  const ai = await getClient();
  const prompt = `
    You are an AI Assignment Generator Agent.
    User Request: "${userPrompt}"
    Subject: ${subject}
    Grade Level: ${grade}
    Question Type: ${type}
    Total Marks: ${marks}
    
    Generate 5 high-quality questions based on this.
    For 'ORAL' type questions, provide a prompt that requires a spoken answer.
    For 'NUMERICAL' type questions, provide a problem that requires a calculated answer.
    For 'SHORT' or 'LONG' questions, provide a 'modelAnswer' that represents an ideal response.
    Allocated marks should sum up to ${marks}.
    Return JSON array.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        text: { type: Type.STRING },
        type: { type: Type.STRING, enum: ["MCQ", "SHORT", "LONG", "ONE_WORD", "FILL_BLANKS", "TRUE_FALSE", "ORAL", "NUMERICAL"] },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING },
        modelAnswer: { type: Type.STRING },
        explanation: { type: Type.STRING },
        difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
        marks: { type: Type.INTEGER }
      },
      required: ["text", "type", "difficulty", "marks", "explanation", "correctAnswer"]
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema }
  });

  const raw = JSON.parse(response.text || "[]");
  return raw.map((q: any, i: number) => ({ ...q, id: Date.now() + i }));
};

// Agent 2: Paper Checker
export const evaluateSubmission = async (
    questions: Question[], 
    answers: Record<number, string>
): Promise<{ score: number, feedback: string, questionScores: Record<number, number>, questionFeedback: Record<number, string> }> => {
    const ai = await getClient();
    
    // Prepare context
    const context = questions.map(q => ({
        id: q.id,
        question: q.text,
        correctAnswer: q.correctAnswer,
        modelAnswer: q.modelAnswer,
        studentAnswer: answers[q.id] || "No Answer",
        maxMarks: q.marks || 1
    }));

    const prompt = `
        You are an AI Paper Checker Agent.
        Evaluate the student's answers against the correct answers and model answers.
        
        Data: ${JSON.stringify(context)}
        
        Task:
        1. Evaluate each answer individually.
        2. Assign partial marks where appropriate for Short/Long/Numerical answers.
        3. Provide brief specific feedback for each question.
        4. Calculate total score.
        5. Provide an overall feedback summary.
        
        Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
        }
    });

    const result = JSON.parse(response.text || "{}");
    return {
        score: result.score || 0,
        feedback: result.feedback || "Evaluation failed.",
        questionScores: result.questionScores || {},
        questionFeedback: result.questionFeedback || {}
    };
};

// Agent 3: Result Formulator
export const generateClassReport = async (
    submissions: AssignmentSubmission[], 
    questions: Question[],
    title: string
): Promise<string> => {
    const ai = await getClient();
    
    // Anonymize and summarize for analysis
    const summaryData = submissions.map(s => ({
        studentId: s.studentId.substring(0,6), // Partial ID
        score: s.score,
        answers: s.answers
    }));

    const questionsContext = questions.map(q => ({
        id: q.id,
        text: q.text,
        correctAnswer: q.correctAnswer
    }));

    const prompt = `
        You are an Expert AI Result Formulator Agent.
        
        Assignment Title: "${title}"
        Questions: ${JSON.stringify(questionsContext)}
        Student Submissions: ${JSON.stringify(summaryData)}
        
        Task:
        Analyze all student submissions and generate a comprehensive result report.
        
        Include the following sections in Markdown format:
        1. **Class Average and Distribution**: Calculate mean, median, and show a grade distribution (A, B, C, D, F).
        2. **Question-wise Analysis**: Identify which questions were hardest (most wrong answers) and easiest. Explain common mistakes found in the wrong answers.
        3. **Individual Performance Summary**: Briefly list students (by ID) who excelled and those who need help.
        4. **Teacher Remarks Template**: A professional paragraph the teacher can use to summarize class performance to parents.
        5. **Suggested Topics for Revision**: Based on the mistakes, what should the teacher re-teach?
        
        Format as a professional, clean Markdown report. Use emojis for section headers.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    return response.text || "Report generation failed.";
};

// --- LEGACY ASSIGNMENT GEN (Keep for backward compat if needed) ---
export const generateAssignmentQuestions = async (topic: string, count: number, difficulty: string, questionType: string): Promise<Question[]> => {
  return generateAssignmentFromPrompt(`Generate questions about ${topic}`, "General", "10", questionType as any, count * 2);
};

// --- TEST ---
export const generateTest = async (topic: string, difficulty: string, count: number): Promise<TestData> => {
  const ai = await getClient();
  const prompt = `Generate a test on "${topic}". Difficulty: ${difficulty}. Questions: ${count}. Mix of MCQ and Short answer. Return JSON.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      subject: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["MCQ", "SHORT", "LONG"] },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
          },
          required: ["id", "text", "type", "explanation", "difficulty"]
        }
      }
    },
    required: ["title", "subject", "questions"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema }
  });

  const data = JSON.parse(response.text || "{}");
  // Fix: Added missing properties to TestSettings within the return object to satisfy the interface.
  return { 
    ...data, 
    id: Date.now().toString(), 
    settings: { 
      timeLimitMinutes: 30, 
      proctoring: false, 
      requireWebcam: false,
      preventTabSwitch: false,
      allowCalculator: false,
      allowInternet: false,
      adaptive: false, 
      shuffleQuestions: false 
    } 
  } as TestData;
};

// --- DOUBT ---
export const resolveDoubt = async (question: string, imageBase64?: string): Promise<DoubtResponse> => {
  const ai = await getClient();
  
  const promptText = `
    You are a helpful educational tutor.
    Question: "${question}".
    1. Check if the question is related to academic/educational topics (math, science, history, coding, etc.).
    2. If not academic, set isAcademic to false and politely decline.
    3. If academic, provide a clear, concise answer.
    4. Suggest 3 related follow-up questions.
    Return JSON.
  `;

  const parts: any[] = [{ text: promptText }];
  if (imageBase64) {
    parts.unshift({
      inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
    });
  }

  const schema = {
      type: Type.OBJECT,
      properties: {
          answer: { type: Type.STRING },
          isAcademic: { type: Type.BOOLEAN },
          relatedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["answer", "isAcademic", "relatedQuestions"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { 
        responseMimeType: "application/json",
        responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}") as DoubtResponse;
};

// --- LEARNING PATH ---
export const generateLearningPath = async (goal: string): Promise<LearningPath> => {
  const ai = await getClient();
  const prompt = `Create a 5-day learning plan to achieve: "${goal}". Return JSON.`;
  
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
            activities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["day", "topic", "activities"]
        }
      }
    },
    required: ["goal", "schedule"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema }
  });

  return JSON.parse(response.text || "{}") as LearningPath;
};

// --- CAREER PATH ---
export const generateCareerPath = async (interests: string): Promise<string> => {
  const ai = await getClient();
  const prompt = `Suggest 3 career paths based on these interests/skills: "${interests}". Include required skills and college major. Markdown format.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "";
};

// --- DEMO SCRIPT ---
export const generateDemoScript = async (role: string): Promise<string> => {
    const ai = await getClient();
    const prompt = `Write a short 30-second demo script for a ${role} presenting the MyClassroom AI App. Highlight 3 key features (AI Tests, Proctoring, Learning Path). Format as bullet points.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text || "";
}

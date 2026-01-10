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
export const analyzeProctoringFrame = async (imageBase64: string): Promise<{ action: 'NONE' | 'WARNING' | 'CRITICAL_VIOLATION' | 'TERMINATE_EXAM', message?: string }> => {
  const ai = await getClient();
  const prompt = `
    You are a high-accuracy AI Exam Invigilator deployed in a live, high-stakes online examination environment.
    Analyze this webcam frame for violations.

    🔍 INVIGILATION RULES:
    1. Face Out of Camera: Warning if face is missing or obscured.
       Message: "Face not detected in camera frame. Please return immediately to continue the exam."
    2. Multiple Face Detection (ZERO TOLERANCE): Critical Violation if 2+ faces detected.
       Message: "Multiple faces detected. This is a serious exam integrity violation."
    3. Unusual Movement: Warning if candidate repeatedly looks away.
       Message: "Unusual head or face movement detected. Please maintain focus on the screen."

    🔹 RESPONSE FORMAT (JSON ONLY):
    { "action": "NONE" }
    { "action": "WARNING", "message": "..." }
    { "action": "CRITICAL_VIOLATION", "message": "..." }
    { "action": "TERMINATE_EXAM", "message": "..." }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ["NONE", "WARNING", "CRITICAL_VIOLATION", "TERMINATE_EXAM"] },
      message: { type: Type.STRING }
    },
    required: ["action"]
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
      if (!text) return { action: "NONE" };
      return JSON.parse(text);
  } catch (e) {
      console.error("Proctoring Error", e);
      return { action: "NONE" };
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
    
    const context = questions.map(q => ({
        id: q.id,
        question: q.text,
        correctAnswer: q.correctAnswer,
        modelAnswer: q.modelAnswer,
        studentAnswer: answers[q.id] || "No Answer",
        maxMarks: q.marks || 1
    }));

    const prompt = `
        Evaluate the student's answers. Return JSON.
        Data: ${JSON.stringify(context)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
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
    
    const prompt = `
        Analyze all student submissions and generate a comprehensive result report for "${title}" in Markdown format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    return response.text || "Report generation failed.";
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
  return { 
    ...data, 
    id: Date.now().toString(), 
    settings: { 
      timeLimitMinutes: 30, 
      proctoring: true, 
      requireWebcam: true,
      preventTabSwitch: true,
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
  const parts: any[] = [{ text: `Resolve academic doubt: ${question}` }];
  if (imageBase64) parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}") as DoubtResponse;
};

// --- LEARNING PATH ---
export const generateLearningPath = async (goal: string): Promise<LearningPath> => {
  const ai = await getClient();
  const prompt = `Create a 5-day learning plan to achieve: "${goal}". Return JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}") as LearningPath;
};

// --- CAREER PATH ---
export const generateCareerPath = async (interests: string): Promise<string> => {
  const ai = await getClient();
  const prompt = `Suggest 3 career paths based on these interests: "${interests}". Markdown format.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "";
};

// --- DEMO SCRIPT ---
export const generateDemoScript = async (role: string): Promise<string> => {
    const ai = await getClient();
    const prompt = `Write a demo script for ${role} presenting MyClassroom AI. Bullet points.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return response.text || "";
}
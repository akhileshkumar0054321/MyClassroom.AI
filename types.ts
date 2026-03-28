
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VIDEO_GEN = 'VIDEO_GEN',
  EBOOK_GEN = 'EBOOK_GEN',
  NOTES_GEN = 'NOTES_GEN',
  PPT_GEN = 'PPT_GEN',
  TEST_MANAGER = 'TEST_MANAGER',
  EXAMINATION = 'EXAMINATION',
  DOUBT_TUTOR = 'DOUBT_TUTOR',
  LEARNING_PATH = 'LEARNING_PATH',
  CLASSROOMS = 'CLASSROOMS',
  LIBRARY = 'LIBRARY',
  VIRTUAL_LAB = 'VIRTUAL_LAB',
  CAREER_PATH = 'CAREER_PATH',
  LOGIN = 'LOGIN',
  SOCIAL = 'SOCIAL',
  PROFILE = 'PROFILE',
  ASSIGNMENTS = 'ASSIGNMENTS',
  ANALYTICS = 'ANALYTICS',
  EXAM_LOGIN = 'EXAM_LOGIN',
  INVIGILATOR_LOGIN = 'INVIGILATOR_LOGIN',
  INVIGILATOR_DASHBOARD = 'INVIGILATOR_DASHBOARD'
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
  INVIGILATOR = 'INVIGILATOR'
}

export interface UserProfile {
  dob: string;
  gender: string;
  school: string;
  phone: string;
  bio: string;
  isPublic: boolean;
}

export interface User {
  id: string; // Format: MC-XXXX-XXXX-XXXX
  email: string;
  name: string;
  role: UserRole;
  preferences: {
    language: string;
    gradeLevel: string;
    style: string;
  };
  profile: UserProfile;
  friends: string[]; // List of Friend UIDs
  exam?: string; // For Invigilators
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'EMAIL';
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'JOIN' | 'SUBMIT' | 'CREATE' | 'ALERT';
}

// Library Content
export enum ContentType {
  VIDEO = 'VIDEO',
  EBOOK = 'EBOOK',
  NOTES = 'NOTES',
  PPT = 'PPT',
  SMART_NOTE = 'SMART_NOTE'
}

export interface LibraryItem {
  id: string;
  type: ContentType;
  title: string;
  dateCreated: string;
  data: any; // The script, markdown, or slide data
  userId: string;
  
  // New Fields for Library Management
  status: 'ACTIVE' | 'BIN';
  isShared: boolean;
  views: number;
  imports: number;
  originalOwnerId?: string; // If imported
  originalOwnerName?: string;
}

// Video Generation Types
export interface VideoChapter {
  title: string;
  duration: string;
  content: string;
  visualCue: string;
  veoUrl?: string; // AI Generated Video URL
}

export interface VideoScript {
  topic: string;
  totalDuration: string;
  chapters: VideoChapter[];
  summary: string;
  anticipatedQuestions: string[]; // AI Teacher Insights
  veoUrl?: string; // Main video preview
}

// PPT Types
export interface Slide {
  title: string;
  bullets: string[];
  speakerNotes: string;
  imageDescription: string;
}

export interface Presentation {
  topic: string;
  slides: Slide[];
}

// Test Generation Types
export enum QuestionType {
  MCQ = 'MCQ',
  SHORT = 'SHORT',
  LONG = 'LONG',
  VIDEO_RESPONSE = 'VIDEO_RESPONSE',
  ONE_WORD = 'ONE_WORD',
  FILL_BLANKS = 'FILL_BLANKS',
  TRUE_FALSE = 'TRUE_FALSE',
  ORAL = 'ORAL',
  NUMERICAL = 'NUMERICAL',
  ESSAY = 'ESSAY',
  MATCHING = 'MATCHING'
}

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[]; // For MCQ
  correctAnswer?: string;
  modelAnswer?: string; // For subjective/long answers
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  marks?: number;
}

export interface AssignmentSubmission {
  studentId: string;
  studentName: string;
  submittedAt: string;
  answers: Record<number, string>; // questionId -> text answer or audio URL
  audioBlobs?: Record<number, string>; // questionId -> base64 audio
  score?: number;
  feedback?: string; // Overall AI/Teacher feedback
  questionFeedback?: Record<number, string>; // Specific feedback per question
  questionScores?: Record<number, number>; // Individual question scores
  status: 'PENDING' | 'GRADED' | 'RETURNED'; // RETURNED means sent to student
  autoSubmitted?: boolean;
  
  // Two-way feedback fields
  studentQuery?: string;
  queryStatus?: 'OPEN' | 'RESOLVED';
  teacherComments?: string; // For the student query response
}

export interface Assignment {
  id: string;
  title: string;
  description: string; // "Assignment Description" / Instructions
  category: 'ASSIGNMENT' | 'TEST';
  classroomId?: string; // Optional because drafts might not have one yet
  dueDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  type: 'AI' | 'MANUAL';
  questions: Question[];
  submissions: AssignmentSubmission[];
  
  // Advanced fields
  subject?: string;
  grades?: number[];
  totalMarks?: number;
  durationMinutes?: number;
  topicPrompt?: string; // Store prompt but don't show to student
}

export interface ClassroomSettings {
  expiryDate?: string;
  joinLimit?: number;
  requiresApproval: boolean;
}

export interface Classroom {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  studentIds: string[];
  code: string;
  // Invite Link Features
  inviteLink?: string;
  isLinkActive?: boolean;
  settings?: ClassroomSettings;
}

export interface TestSettings {
  timeLimitMinutes: number;
  proctoring: boolean;
  requireWebcam: boolean;
  preventTabSwitch: boolean;
  allowCalculator: boolean;
  allowInternet: boolean;
  adaptive: boolean;
  shuffleQuestions: boolean;
}

export type TestStatus = 'DRAFT' | 'LIVE' | 'ENDED' | 'COMPLETED';

export interface TestData {
  id: string;
  title: string;
  subject: string;
  creatorId: string;
  assignedClassId?: string; 
  assignedClassIds?: string[];
  questions: Question[];
  settings: TestSettings;
  status: TestStatus;
  accessCode?: string; 
  resultsPublished?: boolean; 
  instructions?: string;
}

export interface TestResult {
  testId: string;
  studentId: string;
  score: number;
  maxScore: number;
  answers: Record<number, string>;
  dateTaken: string;
  status: 'COMPLETED' | 'AWAITED';
  violationLog?: string[]; 
  warningsCount?: number;   
  autoSubmitted?: boolean;  
}

// Learning Path Types
export interface DailyPlan {
  day: number;
  topic: string;
  activities: string[];
  completed?: boolean;
}

export interface LearningPath {
  id?: string;
  goal: string;
  schedule: DailyPlan[];
  userId?: string;
  startDate?: string;
}

export interface DoubtResponse {
    answer: string;
    isAcademic: boolean;
    relatedQuestions: string[];
}

export interface StudentSession {
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  startTime: string;
  status: 'ACTIVE' | 'KICKED' | 'DISCONNECTED' | 'COMPLETED';
  slashCount: number;
  lastViolation?: string;
  socketId?: string;
}

export interface InvigilatorAction {
  id: string;
  invigilatorId: string;
  studentId: string;
  action: 'KICK' | 'WARN';
  timestamp: string;
  reason?: string;
}

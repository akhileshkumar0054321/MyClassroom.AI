
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VIDEO_GEN = 'VIDEO_GEN',
  EBOOK_GEN = 'EBOOK_GEN',
  NOTES_GEN = 'NOTES_GEN',
  PPT_GEN = 'PPT_GEN',
  TEST_MANAGER = 'TEST_MANAGER',
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
  ANALYTICS = 'ANALYTICS'
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN'
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

// Classroom & Assignments
export interface Assignment {
  id: string;
  title: string;
  description: string;
  classroomId: string;
  dueDate: string;
  status: 'PENDING' | 'SUBMITTED';
  type: 'AI' | 'MANUAL';
  questions?: string[];
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

// Video Generation Types
export interface VideoChapter {
  title: string;
  duration: string;
  content: string;
  visualCue: string;
}

export interface VideoScript {
  topic: string;
  totalDuration: string;
  chapters: VideoChapter[];
  summary: string;
  anticipatedQuestions: string[]; // AI Teacher Insights
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
  VIDEO_RESPONSE = 'VIDEO_RESPONSE'
}

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[]; // For MCQ
  correctAnswer?: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface TestSettings {
  timeLimitMinutes: number;
  proctoring: boolean;
  adaptive: boolean;
  shuffleQuestions: boolean;
}

export interface TestData {
  id: string;
  title: string;
  subject: string;
  creatorId: string;
  assignedClassId?: string; // New: Link to a classroom
  assignedClassName?: string; // New: Display name
  questions: Question[];
  settings: TestSettings;
  status: 'DRAFT' | 'LIVE' | 'ENDED';
  accessCode?: string; // For students to join live
}

export interface TestResult {
  testId: string;
  studentId: string;
  score: number;
  maxScore: number;
  answers: Record<number, string>;
  dateTaken: string;
  status: 'COMPLETED' | 'AWAITED';
  violationLog?: string[]; // New: List of proctoring violations
  warningsCount?: number;   // New: Count of warnings
  autoSubmitted?: boolean;  // New: Was it forced?
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

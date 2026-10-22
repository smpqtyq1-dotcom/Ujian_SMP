export type SubjectId = 
  | 'matematika'
  | 'ipa'
  | 'bahasa-indonesia'
  | 'bahasa-inggris'
  | 'ips'
  | 'ppkn';

export interface SubjectMeta {
  id: SubjectId | string;
  name: string;
  category: string;
  icon: string;
  description: string;
  kkm: number; // Kriteria Ketuntasan Minimal (misal 75)
  durationMinutes: number;
  gradeLevels: string[];
  totalQuestions?: number;
  color: string;
}

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  grade: 'Kelas 7' | 'Kelas 8' | 'Kelas 9' | 'Semua Kelas';
  topic: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: OptionKey;
  explanation: string;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit';
}

export interface StudentProfile {
  name: string;
  studentClass: string;
  nisn?: string;
  examCode?: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  niy: string; // Nomor Induk Yayasan / NIP Guru
  subject: string;
  schoolName?: string;
}

export interface ExamCode {
  id: string;
  code: string; // Misal: MAT8-2026
  title: string;
  subjectId: string;
  subjectName: string;
  grade: 'Kelas 7' | 'Kelas 8' | 'Kelas 9' | 'Semua Kelas';
  durationMinutes: number;
  kkm: number;
  questionCount: number;
  questionIds?: string[];
  createdByName: string;
  createdByNiy: string;
  createdAt: string;
  isActive: boolean;
}

export interface ExamSessionState {
  id: string;
  student: StudentProfile;
  examCode: string;
  subjectId: string;
  subjectName: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, OptionKey>;
  markedDoubt: Record<string, boolean>;
  timeRemainingSeconds: number;
  totalTimeSeconds: number;
  startTime: string;
  isCompleted: boolean;
}

export interface QuestionAnalysis {
  questionId: string;
  questionNumber: number;
  questionText: string;
  topic: string;
  selectedAnswer?: OptionKey;
  correctAnswer: OptionKey;
  isCorrect: boolean;
  isUnanswered: boolean;
  explanation: string;
}

export interface ExamResult {
  id: string;
  studentName: string;
  studentClass: string;
  nisn?: string;
  examCode?: string;
  subjectId: string;
  subjectName: string;
  score: number; // 0 - 100
  passed: boolean; // >= KKM
  kkm: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  accuracy: number; // percentage
  durationSeconds: number;
  completedAt: string;
  detailedAnalysis: QuestionAnalysis[];
  badges: Badge[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface AIGenerateRequest {
  subjectName: string;
  grade: 'Kelas 7' | 'Kelas 8' | 'Kelas 9';
  topic: string;
  questionCount: number;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit' | 'Campuran';
  additionalInstructions?: string;
}

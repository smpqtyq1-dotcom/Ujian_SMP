/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  DEFAULT_SUBJECTS, 
  INITIAL_QUESTIONS 
} from './data/defaultQuestions.ts';
import { 
  ExamCode,
  ExamResult, 
  ExamSessionState, 
  OptionKey, 
  Question, 
  StudentProfile, 
  SubjectMeta,
  TeacherProfile
} from './types/quiz.ts';
import { 
  loadAllQuestions, 
  loadAllResults, 
  loadAllExamCodes,
  saveStudentResult, 
  saveCustomQuestions, 
  deleteCustomQuestion, 
  clearAllResults, 
  saveActiveStudent, 
  loadActiveStudent, 
  saveExamCode,
  deleteExamCode,
  saveActiveTeacher,
  loadActiveTeacher,
  subscribeToRealtimeUpdates 
} from './utils/storage.ts';
import { buildExamResult } from './utils/grading.ts';
import { playFanfareSound, playNavigationSound } from './utils/soundEffects.ts';
import { triggerConfetti } from './utils/confetti.ts';
import { Navbar, ActivePortalMode } from './components/Navbar.tsx';
import { PortalAuth } from './components/PortalAuth.tsx';
import { testFirestoreConnection } from './firebase/service.ts';
import { ExambroExamView } from './components/ExambroExamView.tsx';
import { ExamResultView } from './components/ExamResultView.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';

export default function App() {
  const [portalMode, setPortalMode] = useState<ActivePortalMode>('student');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examCodes, setExamCodes] = useState<ExamCode[]>([]);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);
  const [activeTeacher, setActiveTeacher] = useState<TeacherProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<ExamSessionState | null>(null);
  const [latestResult, setLatestResult] = useState<ExamResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize data from persistent real-time storage
  useEffect(() => {
    testFirestoreConnection();
    setQuestions(loadAllQuestions());
    setResults(loadAllResults());
    setExamCodes(loadAllExamCodes());
    setActiveStudent(loadActiveStudent());
    setActiveTeacher(loadActiveTeacher());
    setIsInitialized(true);

    const unsubscribe = subscribeToRealtimeUpdates(() => {
      setResults(loadAllResults());
      setQuestions(loadAllQuestions());
      setExamCodes(loadAllExamCodes());
    });

    return () => unsubscribe();
  }, []);

  // Compute available subjects including any custom subjects added via upload
  const allSubjects = useMemo<SubjectMeta[]>(() => {
    const map = new Map<string, SubjectMeta>();
    DEFAULT_SUBJECTS.forEach((sub) => map.set(sub.id, sub));

    questions.forEach((q) => {
      if (!map.has(q.subjectId)) {
        map.set(q.subjectId, {
          id: q.subjectId,
          name: q.subjectName,
          category: 'Kustom',
          icon: 'FileText',
          description: `Koleksi soal ${q.subjectName} dari guru.`,
          kkm: 75,
          durationMinutes: 20,
          gradeLevels: [q.grade],
          color: 'from-purple-600 to-indigo-700',
        });
      }
    });

    return Array.from(map.values());
  }, [questions]);

  // Handle Starting an Exam from an Exam Code
  const handleStudentEnterExam = (student: StudentProfile, examCode: ExamCode) => {
    saveActiveStudent(student);
    setActiveStudent(student);

    // Filter questions corresponding to this exam code's subject
    const subjectQuestions = questions.filter((q) => q.subjectId === examCode.subjectId);
    
    // Choose questions (limit to questionCount if specified)
    const countToTake = examCode.questionCount || (subjectQuestions.length > 0 ? subjectQuestions.length : 5);
    const examQuestions = subjectQuestions.length > 0 
      ? subjectQuestions.slice(0, countToTake)
      : questions.slice(0, countToTake);

    const durationSeconds = (examCode.durationMinutes || 20) * 60;

    const newSession: ExamSessionState = {
      id: `session-${Date.now()}`,
      student,
      examCode: examCode.code,
      subjectId: examCode.subjectId,
      subjectName: examCode.subjectName,
      questions: examQuestions,
      currentQuestionIndex: 0,
      answers: {},
      markedDoubt: {},
      timeRemainingSeconds: durationSeconds,
      totalTimeSeconds: durationSeconds,
      startTime: new Date().toISOString(),
      isCompleted: false,
    };

    setLatestResult(null);
    setCurrentSession(newSession);
    setPortalMode('student');
  };

  // Handle Teacher Login via NIY
  const handleTeacherLogin = (teacher: TeacherProfile) => {
    saveActiveTeacher(teacher);
    setActiveTeacher(teacher);
    setPortalMode('teacher');
  };

  // Handle Teacher Logout
  const handleTeacherLogout = () => {
    saveActiveTeacher(null);
    setActiveTeacher(null);
  };

  // Handle Answer Selection
  const handleUpdateAnswer = (questionId: string, answer: OptionKey) => {
    if (!currentSession) return;
    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: answer,
        },
      };
    });
  };

  // Handle Doubt Toggle
  const handleToggleDoubt = (questionId: string) => {
    if (!currentSession) return;
    setCurrentSession((prev) => {
      if (!prev) return null;
      const current = !!prev.markedDoubt[questionId];
      return {
        ...prev,
        markedDoubt: {
          ...prev.markedDoubt,
          [questionId]: !current,
        },
      };
    });
  };

  // Handle Finishing Exam & Automatic Grading
  const handleFinishExam = () => {
    if (!currentSession) return;

    const sub = allSubjects.find((s) => s.id === currentSession.subjectId) || allSubjects[0];
    const durationSeconds = Math.max(1, currentSession.totalTimeSeconds - currentSession.timeRemainingSeconds);

    const examResult = buildExamResult(
      currentSession.questions,
      currentSession.answers,
      currentSession.student,
      sub,
      durationSeconds
    );

    // Persist result into real-time database
    saveStudentResult(examResult);
    setResults(loadAllResults());

    // Trigger celebration effects
    playFanfareSound();
    triggerConfetti();

    // Clear active session and display result
    setCurrentSession(null);
    setLatestResult(examResult);
  };

  // Handle Time Expired
  const handleTimeExpired = () => {
    alert('Waktu ujian telah habis! Jawaban Anda akan otomatis dikumpulkan dan dinilai.');
    handleFinishExam();
  };

  // Handle Logout Student
  const handleLogoutStudent = () => {
    if (currentSession) {
      const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar dari sesi ujian yang sedang berjalan?');
      if (!confirmLogout) return;
    }
    saveActiveStudent(null);
    setActiveStudent(null);
    setCurrentSession(null);
    setLatestResult(null);
  };

  // Handle Adding Bulk or AI Questions
  const handleAddCustomQuestions = (newQuestions: Question[]) => {
    saveCustomQuestions(newQuestions);
    setQuestions(loadAllQuestions());
  };

  // Handle Deleting Question
  const handleDeleteQuestion = (id: string) => {
    deleteCustomQuestion(id);
    setQuestions(loadAllQuestions());
  };

  // Handle Saving Exam Code
  const handleSaveExamCode = (code: ExamCode) => {
    saveExamCode(code);
    setExamCodes(loadAllExamCodes());
  };

  // Handle Deleting Exam Code
  const handleDeleteExamCode = (codeId: string) => {
    deleteExamCode(codeId);
    setExamCodes(loadAllExamCodes());
  };

  // Handle Resetting Results
  const handleResetResults = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh data ujian siswa ke kondisi awal?')) {
      clearAllResults();
      setResults(loadAllResults());
      setLatestResult(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Memuat Sistem CBT Exambro SMP...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation */}
      <Navbar
        portalMode={portalMode}
        setPortalMode={setPortalMode}
        activeStudent={activeStudent}
        activeTeacher={activeTeacher}
        onLogoutStudent={handleLogoutStudent}
        onLogoutTeacher={handleTeacherLogout}
        isExamRunning={!!currentSession}
      />

      {/* Main Content Body */}
      <div className="flex-1 pb-12">
        {/* STUDENT PORTAL */}
        {portalMode === 'student' && (
          <>
            {currentSession ? (
              <ExambroExamView
                session={currentSession}
                onUpdateAnswer={handleUpdateAnswer}
                onToggleDoubt={handleToggleDoubt}
                onFinishExam={handleFinishExam}
                onTimeExpired={handleTimeExpired}
              />
            ) : latestResult ? (
              <ExamResultView
                result={latestResult}
                onRetakeExam={() => setLatestResult(null)}
                onGoToProgress={() => setPortalMode('teacher')}
                onGoToLeaderboard={() => setPortalMode('teacher')}
              />
            ) : (
              <PortalAuth
                examCodes={examCodes}
                activeTeacher={activeTeacher}
                onStudentEnterExam={handleStudentEnterExam}
                onTeacherLogin={handleTeacherLogin}
              />
            )}
          </>
        )}

        {/* TEACHER PORTAL */}
        {portalMode === 'teacher' && (
          <>
            {activeTeacher ? (
              <TeacherDashboard
                results={results}
                questions={questions}
                subjects={allSubjects}
                examCodes={examCodes}
                activeTeacher={activeTeacher}
                onLogoutTeacher={handleTeacherLogout}
                onAddCustomQuestions={handleAddCustomQuestions}
                onDeleteQuestion={handleDeleteQuestion}
                onResetResults={handleResetResults}
                onSaveExamCode={handleSaveExamCode}
                onDeleteExamCode={handleDeleteExamCode}
              />
            ) : (
              <PortalAuth
                examCodes={examCodes}
                activeTeacher={activeTeacher}
                onStudentEnterExam={handleStudentEnterExam}
                onTeacherLogin={handleTeacherLogin}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

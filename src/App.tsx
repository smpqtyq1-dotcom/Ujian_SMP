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
  saveStudentResult, 
  saveCustomQuestions, 
  deleteCustomQuestion, 
  clearAllResults, 
  saveActiveStudent, 
  loadActiveStudent, 
  clearLegacyTeacherData,
  subscribeToRealtimeUpdates 
} from './utils/storage.ts';
import {
  deleteTeacherExamCode,
  getTeacherSession,
  loadTeacherExamCodes,
  logoutTeacher,
  saveTeacherExamCode,
} from './utils/secureApi.ts';
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
  const [serviceError, setServiceError] = useState('');

  // Initialize data from persistent real-time storage
  useEffect(() => {
    let isMounted = true;
    testFirestoreConnection();
    clearLegacyTeacherData();
    setQuestions(loadAllQuestions());
    setResults(loadAllResults());
    setActiveStudent(loadActiveStudent());

    const unsubscribe = subscribeToRealtimeUpdates(() => {
      setResults(loadAllResults());
      setQuestions(loadAllQuestions());
    });

    void getTeacherSession()
      .then(async (teacher) => {
        if (!teacher) return;
        const teacherCodes = await loadTeacherExamCodes();
        if (!isMounted) return;
        setActiveTeacher(teacher);
        setExamCodes(teacherCodes);
        setPortalMode('teacher');
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setServiceError(error instanceof Error ? error.message : 'Sesi guru tidak dapat dipulihkan.');
        }
      })
      .finally(() => {
        if (isMounted) setIsInitialized(true);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
  const handleTeacherLogin = async (teacher: TeacherProfile) => {
    try {
      const teacherCodes = await loadTeacherExamCodes();
      setActiveTeacher(teacher);
      setExamCodes(teacherCodes);
      setPortalMode('teacher');
      setServiceError('');
    } catch (error) {
      await logoutTeacher();
      throw error;
    }
  };

  // Handle Teacher Logout
  const handleTeacherLogout = () => {
    void logoutTeacher()
      .then(() => {
        setActiveTeacher(null);
        setExamCodes([]);
        setPortalMode('student');
      })
      .catch((error: unknown) => {
        setServiceError(error instanceof Error ? error.message : 'Tidak dapat keluar dari akun guru.');
      });
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
  const handleSaveExamCode = async (code: ExamCode) => {
    const savedCode = await saveTeacherExamCode(code);
    setExamCodes((current) => [
      savedCode,
      ...current.filter((entry) => entry.id !== savedCode.id && entry.code !== savedCode.code),
    ]);
  };

  // Handle Deleting Exam Code
  const handleDeleteExamCode = async (codeId: string) => {
    await deleteTeacherExamCode(codeId);
    setExamCodes((current) => current.filter((entry) => entry.id !== codeId));
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

      {serviceError && (
        <div role="alert" className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <span>{serviceError}</span>
            <button type="button" onClick={() => setServiceError('')} className="font-bold" aria-label="Tutup pesan">
              ×
            </button>
          </div>
        </div>
      )}

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

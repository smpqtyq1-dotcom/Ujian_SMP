import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Grid, 
  Wifi, 
  Eye, 
  Type, 
  ShieldAlert,
  Send,
  X
} from 'lucide-react';
import { ExamSessionState, OptionKey, Question } from '../types/quiz.ts';
import { formatTime } from '../utils/grading.ts';
import { playSelectSound, playNavigationSound } from '../utils/soundEffects.ts';

interface ExambroExamViewProps {
  session: ExamSessionState;
  onUpdateAnswer: (questionId: string, answer: OptionKey) => void;
  onToggleDoubt: (questionId: string) => void;
  onFinishExam: () => void;
  onTimeExpired: () => void;
}

export const ExambroExamView: React.FC<ExambroExamViewProps> = ({
  session,
  onUpdateAnswer,
  onToggleDoubt,
  onFinishExam,
  onTimeExpired,
}) => {
  const [currentIndex, setCurrentIndex] = useState(session.currentQuestionIndex || 0);
  const [timeRemaining, setTimeRemaining] = useState(session.timeRemainingSeconds);
  const [fontSizeLevel, setFontSizeLevel] = useState<'sm' | 'base' | 'lg'>('base');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [showTabWarningToast, setShowTabWarningToast] = useState(false);

  const questions = session.questions;
  const currentQuestion: Question | undefined = questions[currentIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Exambro focus / tab switch detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchWarnings((prev) => {
          const next = prev + 1;
          setShowTabWarningToast(true);
          setTimeout(() => setShowTabWarningToast(false), 4000);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Keyboard navigation & shortcuts (A, B, C, D, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirmModal) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion) {
        handleSelectAnswer(currentQuestion.id, key as OptionKey);
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, currentQuestion, showConfirmModal]);

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      playNavigationSound();
      setCurrentIndex((i) => i + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      playNavigationSound();
      setCurrentIndex((i) => i - 1);
    }
  };

  const jumpToQuestion = (index: number) => {
    playNavigationSound();
    setCurrentIndex(index);
    setIsSidebarOpen(false);
  };

  const handleSelectAnswer = (qId: string, opt: OptionKey) => {
    playSelectSound();
    onUpdateAnswer(qId, opt);
  };

  const handleToggleDoubt = (qId: string) => {
    playSelectSound();
    onToggleDoubt(qId);
  };

  // Stats calculation for confirmation modal & grid
  const answeredCount = Object.keys(session.answers).length;
  const doubtCount = Object.values(session.markedDoubt).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  // Font size styling
  const textSizeClass =
    fontSizeLevel === 'sm'
      ? 'text-sm'
      : fontSizeLevel === 'lg'
      ? 'text-lg sm:text-xl'
      : 'text-base sm:text-lg';

  const optionSizeClass =
    fontSizeLevel === 'sm'
      ? 'text-xs'
      : fontSizeLevel === 'lg'
      ? 'text-base'
      : 'text-sm';

  const isLowTime = timeRemaining <= 120; // 2 minutes

  if (!currentQuestion) {
    return <div className="p-8 text-center text-slate-500">Tidak ada soal yang tersedia.</div>;
  }

  const selectedAnswer = session.answers[currentQuestion.id];
  const isMarkedDoubt = !!session.markedDoubt[currentQuestion.id];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950 flex flex-col justify-between">
      {/* Exambro Strict Notice Banner */}
      {showTabWarningToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm animate-bounce">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Peringatan Keamanan Exambro!</div>
            <div className="text-xs text-rose-100">
              Anda terdeteksi meninggalkan halaman ujian ({tabSwitchWarnings}x). Harap tetap fokus.
            </div>
          </div>
        </div>
      )}

      {/* Sticky Exam Control Header */}
      <header className="sticky top-16 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Student & Subject Info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Peserta Ujian
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {session.student.name} ({session.student.studentClass})
              </span>
            </div>

            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {session.subjectName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Soal <strong className="text-slate-900 dark:text-white font-extrabold">{currentIndex + 1}</strong> dari {questions.length}
              </div>
            </div>
          </div>

          {/* Center/Right: Timer, Font Adjuster, Network Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Font Adjuster */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFontSizeLevel('sm')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  fontSizeLevel === 'sm' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="Font Kecil"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel('base')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  fontSizeLevel === 'base' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="Font Sedang"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel('lg')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  fontSizeLevel === 'lg' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-500'
                }`}
                title="Font Besar"
              >
                A+
              </button>
            </div>

            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base ${
                isLowTime
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTime(timeRemaining)}</span>
            </div>

            {/* Connection Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </div>

            {/* Question Palette Toggle (Mobile) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
              title="Daftar Soal"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination Center Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Question Card & Answers */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            {/* Question Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold text-sm shadow-sm">
                  {currentIndex + 1}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {currentQuestion.topic}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  {currentQuestion.grade}
                </span>
              </div>

              {isMarkedDoubt && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ragu-ragu
                </div>
              )}
            </div>

            {/* Question Text */}
            <div className={`text-slate-900 dark:text-slate-100 font-medium leading-relaxed mb-6 ${textSizeClass}`}>
              {currentQuestion.questionText}
            </div>

            {/* Options List (A, B, C, D) */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as OptionKey[]).map((optKey) => {
                const optText = currentQuestion.options[optKey];
                const isSelected = selectedAnswer === optKey;

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectAnswer(currentQuestion.id, optKey)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 cursor-pointer group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/50 text-blue-950 dark:text-blue-50 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    {/* Option Alphabet Badge */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {optKey}
                    </div>

                    {/* Option Text Content */}
                    <div className={`flex-1 pt-1 font-medium ${optionSizeClass}`}>
                      {optText}
                    </div>

                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation & Doubt Action Row */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            {/* Previous Question Button */}
            <button
              type="button"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {/* Ragu-ragu Checkbox Toggle */}
            <button
              type="button"
              onClick={() => handleToggleDoubt(currentQuestion.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                isMarkedDoubt
                  ? 'bg-amber-500 border-amber-600 text-white shadow-md'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <input
                type="checkbox"
                checked={isMarkedDoubt}
                onChange={() => {}}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer pointer-events-none"
              />
              <span>Ragu-ragu</span>
            </button>

            {/* Next or Finish Button */}
            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={goToNext}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Selesai Ujian</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Number Grid Palette (Desktop & Drawer on Mobile) */}
        <div
          className={`lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 ${
            isSidebarOpen
              ? 'fixed inset-x-4 top-20 bottom-4 z-40 overflow-y-auto block shadow-2xl'
              : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-600" />
              <span>Daftar Nomor Soal</span>
            </h3>

            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Color Legend */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600" />
              <span>Dijawab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700" />
              <span>Kosong</span>
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div className="grid grid-cols-5 gap-2.5 pt-2">
            {questions.map((q, idx) => {
              const isAnswered = !!session.answers[q.id];
              const isDoubt = !!session.markedDoubt[q.id];
              const isCurrent = idx === currentIndex;

              let btnBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

              if (isDoubt) {
                btnBg = 'bg-amber-400 text-amber-950 font-bold border-amber-500';
              } else if (isAnswered) {
                btnBg = 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => jumpToQuestion(idx)}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center text-xs transition-all cursor-pointer relative ${btnBg} ${
                    isCurrent
                      ? 'ring-3 ring-blue-500/80 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10'
                      : 'hover:scale-102'
                  }`}
                >
                  <span className="font-extrabold">{idx + 1}</span>
                  {isAnswered && (
                    <span className="text-[9px] uppercase leading-none opacity-90">
                      {session.answers[q.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Finish Button from Sidebar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kumpulkan & Selesai Ujian</span>
            </button>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Konfirmasi Selesai Ujian
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Apakah Anda yakin ingin mengakhiri sesi ujian CBT ini? Periksa kembali ringkasan jawaban Anda di bawah ini:
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-center">
                <div className="text-xl font-extrabold text-blue-600">{answeredCount}</div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Terjawab</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center">
                <div className="text-xl font-extrabold text-amber-600">{doubtCount}</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Ragu-ragu</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center">
                <div className="text-xl font-extrabold text-rose-600">{unansweredCount}</div>
                <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Kosong</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Perhatian: Masih ada <strong>{unansweredCount}</strong> soal yang belum Anda jawab!</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  onFinishExam();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

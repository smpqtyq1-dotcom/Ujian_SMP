import React, { useState } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Target, 
  ArrowRight, 
  BarChart2, 
  RotateCcw, 
  BookOpen, 
  Share2, 
  Award,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react';
import { ExamResult } from '../types/quiz.ts';
import { formatTime, formatDateIndo } from '../utils/grading.ts';
import { playNavigationSound } from '../utils/soundEffects.ts';

interface ExamResultViewProps {
  result: ExamResult;
  onRetakeExam: () => void;
  onGoToProgress: () => void;
  onGoToLeaderboard: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  result,
  onRetakeExam,
  onGoToProgress,
  onGoToLeaderboard,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'advice'>('review');
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong' | 'unanswered'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const isPassed = result.passed;

  const filteredQuestions = result.detailedAnalysis.filter((q) => {
    if (filterType === 'correct') return q.isCorrect;
    if (filterType === 'wrong') return !q.isCorrect && !q.isUnanswered;
    if (filterType === 'unanswered') return q.isUnanswered;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Score Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border ${
          isPassed
            ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 border-emerald-500/30'
            : 'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 border-blue-500/30'
        }`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Sesi Ujian Selesai • {result.subjectName}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isPassed ? 'Selamat, Anda Berhasil Tuntas!' : 'Tetap Semangat, Terus Berlatih!'}
            </h1>
            <p className="text-sm text-slate-100/90 max-w-md">
              {isPassed
                ? `Luar biasa, ${result.studentName}! Nilai Anda melampaui standar KKM (${result.kkm}). Pertahankan prestasimu!`
                : `Terima kasih ${result.studentName}. Anda sudah berusaha dengan baik. Pelajari kembali pembahasan di bawah ini untuk persiapan remedial.`}
            </p>
            <div className="text-xs text-white/70 pt-1">
              Peserta: <strong>{result.studentName}</strong> • Kelas <strong>{result.studentClass}</strong> • {formatDateIndo(result.completedAt)}
            </div>
          </div>

          {/* Big Score Dial */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 min-w-[160px] text-center shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Skor Akhir
            </span>
            <div className="text-5xl font-black my-1 tracking-tight">
              {result.score}
            </div>
            <div
              className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${
                isPassed ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-400 text-amber-950'
              }`}
            >
              {isPassed ? 'LULUS (TUNTAS)' : 'REMEDIAL'}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {result.correctCount} Soal
            </div>
            <div className="text-xs text-slate-500">Jawaban Benar</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {result.wrongCount} Soal
            </div>
            <div className="text-xs text-slate-500">Jawaban Salah</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {result.accuracy}%
            </div>
            <div className="text-xs text-slate-500">Akurasi Nilai</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {formatTime(result.durationSeconds)}
            </div>
            <div className="text-xs text-slate-500">Durasi Pengerjaan</div>
          </div>
        </div>
      </div>

      {/* Badges Earned */}
      {result.badges.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Penghargaan & Pencapaian Sesi Ini
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.badges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-800 dark:to-blue-950/20 border border-slate-200 dark:border-slate-700/60"
              >
                <div className="text-2xl shrink-0">{b.icon}</div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {b.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {b.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onRetakeExam}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Ujian Mapel Lain</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onGoToLeaderboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Cek Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={onGoToProgress}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Grafik Progres Belajar</span>
          </button>
        </div>
      </div>

      {/* Detailed Review Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pembahasan Lengkap & Kunci Jawaban
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Semua ({result.totalQuestions})
            </button>
            <button
              onClick={() => setFilterType('correct')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'correct'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Benar ({result.correctCount})
            </button>
            <button
              onClick={() => setFilterType('wrong')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'wrong'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Salah ({result.wrongCount})
            </button>
          </div>
        </div>

        {/* Questions Accordion List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={q.questionId}
                className={`rounded-2xl border transition-all ${
                  q.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : q.isUnanswered
                    ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                }`}
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                        q.isCorrect
                          ? 'bg-emerald-600'
                          : q.isUnanswered
                          ? 'bg-slate-500'
                          : 'bg-rose-600'
                      }`}
                    >
                      {q.questionNumber}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {q.topic}
                        </span>
                        {q.isCorrect ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Benar
                          </span>
                        ) : q.isUnanswered ? (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" /> Tidak Dijawab
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Salah
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {q.questionText}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80 space-y-3.5 text-xs">
                    {/* Answers Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div
                        className={`p-3 rounded-xl border ${
                          q.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        <div className="text-[11px] font-medium opacity-80 mb-0.5">
                          Jawaban Anda:
                        </div>
                        <div className="font-extrabold text-sm">
                          {q.selectedAnswer ? `Pilihan ${q.selectedAnswer}` : 'Tidak Ada (Kosong)'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200">
                        <div className="text-[11px] font-medium opacity-80 mb-0.5">
                          Kunci Jawaban yang Benar:
                        </div>
                        <div className="font-extrabold text-sm">
                          Pilihan {q.correctAnswer}
                        </div>
                      </div>
                    </div>

                    {/* Educational Concept Explanation */}
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pembahasan Edukatif Materi:</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

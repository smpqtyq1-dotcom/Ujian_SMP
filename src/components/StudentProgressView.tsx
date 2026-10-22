import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Award, 
  BookOpen, 
  CheckCircle, 
  Target, 
  Sparkles, 
  Flame, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { ExamResult, StudentProfile, SubjectMeta } from '../types/quiz.ts';
import { formatDateIndo } from '../utils/grading.ts';

interface StudentProgressViewProps {
  results: ExamResult[];
  subjects: SubjectMeta[];
  activeStudent: StudentProfile | null;
  onStartQuiz: (subjectId: string) => void;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({
  results,
  subjects,
  activeStudent,
  onStartQuiz,
}) => {
  const [viewScope, setViewScope] = useState<'my' | 'all'>(activeStudent ? 'my' : 'all');

  // Filter relevant results
  const studentResults = activeStudent && viewScope === 'my'
    ? results.filter((r) => r.studentName.toLowerCase() === activeStudent.name.toLowerCase())
    : results;

  // Calculate subject averages
  const subjectStats = subjects.map((sub) => {
    const subResults = studentResults.filter((r) => r.subjectId === sub.id);
    const count = subResults.length;
    const avgScore = count > 0
      ? Math.round((subResults.reduce((acc, curr) => acc + curr.score, 0) / count) * 10) / 10
      : 0;
    const bestScore = count > 0 ? Math.max(...subResults.map((r) => r.score)) : 0;

    return {
      id: sub.id,
      name: sub.name,
      kkm: sub.kkm,
      count,
      avgScore,
      bestScore,
      color: sub.color,
    };
  });

  // Calculate overall metrics
  const totalQuizzes = studentResults.length;
  const overallAverage = totalQuizzes > 0
    ? Math.round((studentResults.reduce((acc, curr) => acc + curr.score, 0) / totalQuizzes) * 10) / 10
    : 0;
  const passedCount = studentResults.filter((r) => r.passed).length;
  const passRate = totalQuizzes > 0 ? Math.round((passedCount / totalQuizzes) * 100) : 0;
  const totalMinutes = Math.round(studentResults.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60);

  // Sort chronological for line chart (oldest to newest)
  const timelineResults = [...studentResults].reverse().slice(-8); // last 8 attempts

  // Find weakest subject for motivation tip
  const attemptedSubjects = subjectStats.filter((s) => s.count > 0);
  const weakestSubject = attemptedSubjects.length > 0
    ? attemptedSubjects.reduce((prev, curr) => (curr.avgScore < prev.avgScore ? curr : prev))
    : null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header and Scope Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Visual Progress & Learning Motivation
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Grafik & Kemajuan Belajar Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pantau pertumbuhan nilai, konsistensi latihan, dan ketuntasan materi pelajaran SMP Anda.
          </p>
        </div>

        {activeStudent && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewScope('my')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewScope === 'my'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Progres Saya ({activeStudent.name})
            </button>
            <button
              onClick={() => setViewScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewScope === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Semua Peserta
            </button>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Rata-rata Nilai</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {overallAverage}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Standar KKM Sekolah: 75
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Ujian Diikuti</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {totalQuizzes} <span className="text-sm font-semibold text-slate-500">Sesi</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalMinutes} Menit waktu berlatih
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Tingkat Ketuntasan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {passedCount} dari {totalQuizzes} tuntas
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Streak Latihan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            Aktif
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Latihan konsisten setiap hari
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Subject Mastery Bar Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Capaian Rata-rata per Mata Pelajaran
              </h3>
              <p className="text-xs text-slate-400">
                Garis putus-putus menunjukkan ambang batas KKM (75)
              </p>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="space-y-4 pt-3">
            {subjectStats.map((sub) => {
              const percentage = Math.min(100, Math.max(0, sub.avgScore));
              const isOverKKM = sub.avgScore >= sub.kkm;

              return (
                <div key={sub.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{sub.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({sub.count}x ujian)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {sub.count > 0 ? sub.avgScore : '-'}
                      </span>
                      {sub.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isOverKKM
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {isOverKKM ? 'Tuntas' : 'Remedial'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Container with KKM Marker */}
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden flex items-center">
                    {/* 75% KKM Marker Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-400/80 z-10"
                      style={{ left: '75%' }}
                      title="Batas KKM: 75"
                    />

                    {/* Animated Score Fill */}
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isOverKKM
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
            <span>0</span>
            <span className="text-rose-500 font-medium">| Batas KKM (75)</span>
            <span>100</span>
          </div>
        </div>

        {/* Right Chart: Historical Progress Line Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tren Nilai Latihan Terakhir
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Rekam jejak nilai dari waktu ke waktu
            </p>

            {timelineResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada data latihan untuk ditampilkan.
              </div>
            ) : (
              <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 px-2">
                {timelineResults.map((r, idx) => {
                  const heightPercent = Math.max(10, Math.min(100, r.score));
                  const isGood = r.score >= r.kkm;

                  return (
                    <div key={r.id || idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {r.subjectName}: {r.score}
                      </div>

                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {Math.round(r.score)}
                      </span>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-36 flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isGood ? 'bg-blue-600' : 'bg-amber-500'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      <span className="text-[9px] text-slate-400 truncate max-w-full">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Motivational Advice Box */}
          <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 mb-1">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Saran Edukasi Guru:</span>
            </div>
            <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
              {weakestSubject && weakestSubject.avgScore < 80
                ? `Fokus perkuat latihan pada ${weakestSubject.name}. Ulangi soal yang salah dan periksa materi pembahasannya agar nilaimu semakin merata!`
                : 'Pencapaian belajarmu sudah sangat konsisten dan memuaskan. Pertahankan ritme belajarmu dan bantu teman sekelasmu dalam diskusi belajar!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Search, 
  Clock, 
  Target, 
  Sparkles, 
  UserCheck, 
  Filter 
} from 'lucide-react';
import { ExamResult, StudentProfile, SubjectMeta } from '../types/quiz.ts';
import { formatTime, formatDateIndo } from '../utils/grading.ts';

interface LeaderboardViewProps {
  results: ExamResult[];
  subjects: SubjectMeta[];
  activeStudent: StudentProfile | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  results,
  subjects,
  activeStudent,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract distinct classes from results
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.studentClass) set.add(r.studentClass);
    });
    return Array.from(set).sort();
  }, [results]);

  // Filter and sort results by highest score, then fastest duration, then newest date
  const filteredRankings = useMemo(() => {
    return results
      .filter((r) => {
        if (selectedSubjectId !== 'all' && r.subjectId !== selectedSubjectId) return false;
        if (selectedClass !== 'all') {
          if (selectedClass.startsWith('Kelas 7') && !r.studentClass.startsWith('7')) return false;
          if (selectedClass.startsWith('Kelas 8') && !r.studentClass.startsWith('8')) return false;
          if (selectedClass.startsWith('Kelas 9') && !r.studentClass.startsWith('9')) return false;
          if (!selectedClass.startsWith('Kelas') && r.studentClass !== selectedClass) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.studentName.toLowerCase().includes(q) ||
            r.studentClass.toLowerCase().includes(q) ||
            r.subjectName.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      });
  }, [results, selectedSubjectId, selectedClass, searchQuery]);

  const topThree = filteredRankings.slice(0, 3);
  const remainingRankings = filteredRankings.slice(3);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            Papan Peringkat Kompetisi Sehat SMP
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Leaderboard & Prestasi Siswa
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm leading-relaxed mt-1">
            Lihat siswa-siswi terbaik dengan skor tertinggi dan kecepatan pengerjaan paling optimal. Bangun semangat berkompetisi secara sportif dan edukatif!
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kelas</option>
            <option value="Kelas 7">Tingkat Kelas 7</option>
            <option value="Kelas 8">Tingkat Kelas 8</option>
            <option value="Kelas 9">Tingkat Kelas 9</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                Spesifik {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau kelas..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Top 3 Podium (Visual Showcase) */}
      {topThree.length > 0 && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
          {/* Rank 2 (Silver) */}
          {topThree[1] && (
            <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 p-5 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-md flex flex-col items-center text-center relative">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-lg mb-2 shadow-inner">
                🥈 2
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate max-w-full">
                {topThree[1].studentName}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Kelas {topThree[1].studentClass} • {topThree[1].subjectName}
              </p>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
                {topThree[1].score}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(topThree[1].durationSeconds)}</span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold) */}
          {topThree[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-amber-100 via-amber-50 to-white dark:from-amber-950/60 dark:via-slate-800 dark:to-slate-900 p-6 rounded-3xl border-2 border-amber-400 dark:border-amber-500 shadow-xl flex flex-col items-center text-center relative -translate-y-2">
              <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Crown className="w-3 h-3" />
                Juara 1
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl mb-2 shadow-lg ring-4 ring-amber-300/40">
                🥇
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 truncate max-w-full">
                {topThree[0].studentName}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Kelas {topThree[0].studentClass} • {topThree[0].subjectName}
              </p>
              <div className="text-4xl font-black text-amber-600 dark:text-amber-400">
                {topThree[0].score}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Waktu: {formatTime(topThree[0].durationSeconds)}</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {topThree[2] && (
            <div className="order-3 md:order-3 bg-gradient-to-b from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 p-5 rounded-3xl border-2 border-orange-200 dark:border-orange-900/60 shadow-md flex flex-col items-center text-center relative">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 flex items-center justify-center font-black text-lg mb-2 shadow-inner">
                🥉 3
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate max-w-full">
                {topThree[2].studentName}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Kelas {topThree[2].studentClass} • {topThree[2].subjectName}
              </p>
              <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
                {topThree[2].score}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(topThree[2].durationSeconds)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Ranking Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-500" />
            <span>Daftar Peringkat Lengkap ({filteredRankings.length} Peserta)</span>
          </h2>
        </div>

        {filteredRankings.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            Tidak ada data peringkat yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">Posisi</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4 text-center">Skor</th>
                  <th className="py-3 px-4 text-center">Ketuntasan</th>
                  <th className="py-3 px-4 text-center">Durasi</th>
                  <th className="py-3 px-4 text-right">Tanggal Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRankings.map((r, index) => {
                  const rank = index + 1;
                  const isCurrentStudent =
                    activeStudent &&
                    r.studentName.toLowerCase() === activeStudent.name.toLowerCase();

                  return (
                    <tr
                      key={r.id || index}
                      className={`transition-colors ${
                        isCurrentStudent
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-300 text-orange-900 font-bold text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">#{rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {r.studentName}
                          </span>
                          {isCurrentStudent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-600 text-white font-extrabold">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {r.studentClass}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {r.subjectName}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-sm text-blue-600 dark:text-blue-400">
                        {r.score}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {r.passed ? 'Tuntas' : 'Remedial'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {formatTime(r.durationSeconds)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                        {formatDateIndo(r.completedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

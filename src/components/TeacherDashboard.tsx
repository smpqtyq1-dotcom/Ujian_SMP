import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  PlusCircle, 
  Trash2, 
  Eye, 
  AlertCircle, 
  Check, 
  BarChart2, 
  Layers, 
  FileCheck,
  KeyRound,
  GraduationCap,
  Trophy,
  LogOut,
  Loader2
} from 'lucide-react';
import { 
  ExamCode, 
  ExamResult, 
  OptionKey, 
  Question, 
  SubjectMeta, 
  TeacherProfile
} from '../types/quiz.ts';
import { formatTime, formatDateIndo } from '../utils/grading.ts';
import { parseQuestionsFromCSV, generateCSVTemplate } from '../utils/csvParser.ts';
import { StudentAnswerSheetModal } from './StudentAnswerSheetModal.tsx';
import { StudentProgressView } from './StudentProgressView.tsx';
import { LeaderboardView } from './LeaderboardView.tsx';
import { parseDocumentTextWithAI } from '../utils/aiGenerator.ts';
import { extractTextFromDocument } from '../utils/documentParser.ts';
import { playNavigationSound, playSuccessSound } from '../utils/soundEffects.ts';

interface TeacherDashboardProps {
  results: ExamResult[];
  questions: Question[];
  subjects: SubjectMeta[];
  examCodes: ExamCode[];
  activeTeacher: TeacherProfile | null;
  onLogoutTeacher: () => void;
  onAddCustomQuestions: (newQuestions: Question[]) => void;
  onDeleteQuestion: (id: string) => void;
  onResetResults: () => void;
  onSaveExamCode: (code: ExamCode) => Promise<void>;
  onDeleteExamCode: (codeId: string) => Promise<void>;
}

export type TeacherTab = 'results' | 'analytics' | 'leaderboard' | 'document_import' | 'exam_codes' | 'questions';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  results,
  questions,
  subjects,
  examCodes,
  activeTeacher,
  onLogoutTeacher,
  onAddCustomQuestions,
  onDeleteQuestion,
  onResetResults,
  onSaveExamCode,
  onDeleteExamCode,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('results');
  
  // Results Tab Filters
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'remedial'>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedResultForDetail, setSelectedResultForDetail] = useState<ExamResult | null>(null);

  // Bulk Upload State
  const [csvRawText, setCsvRawText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [parsedPreviewQuestions, setParsedPreviewQuestions] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Document question import state
  const [aiSubject, setAiSubject] = useState(subjects[0]?.name || 'Matematika SMP');
  const [aiSubjectId, setAiSubjectId] = useState(subjects[0]?.id || 'matematika');
  const [aiGrade, setAiGrade] = useState<'Kelas 7' | 'Kelas 8' | 'Kelas 9'>('Kelas 8');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
  const [aiSuccessFeedback, setAiSuccessFeedback] = useState('');
  const [selectedDocumentName, setSelectedDocumentName] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [documentQuestionsSaved, setDocumentQuestionsSaved] = useState(false);

  // Exam Code Manager State
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeTitle, setNewCodeTitle] = useState('');
  const [newCodeSubject, setNewCodeSubject] = useState(subjects[0]?.id || 'matematika');
  const [newCodeGrade, setNewCodeGrade] = useState<'Kelas 7' | 'Kelas 8' | 'Kelas 9'>('Kelas 8');
  const [newCodeDuration, setNewCodeDuration] = useState(20);
  const [newCodeKKM, setNewCodeKKM] = useState(75);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState('');
  const [codeErrorMsg, setCodeErrorMsg] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [deletingCodeId, setDeletingCodeId] = useState('');

  // Overall Metrics
  const totalSubmissions = results.length;
  const overallAvg = totalSubmissions > 0
    ? Math.round((results.reduce((acc, curr) => acc + curr.score, 0) / totalSubmissions) * 10) / 10
    : 0;
  const passedCount = results.filter((r) => r.passed).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  // Filtered Student Results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (selectedSubject !== 'all' && r.subjectId !== selectedSubject) return false;
      if (selectedClass !== 'all' && r.studentClass !== selectedClass) return false;
      if (statusFilter === 'passed' && !r.passed) return false;
      if (statusFilter === 'remedial' && r.passed) return false;
      if (searchStudent.trim()) {
        const q = searchStudent.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.studentClass.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [results, selectedSubject, selectedClass, statusFilter, searchStudent]);

  // Distinct classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.studentClass) set.add(r.studentClass);
    });
    return Array.from(set).sort();
  }, [results]);

  // Item Analysis: Question Difficulty Index
  const itemAnalysis = useMemo(() => {
    const questionStats: Record<string, { text: string; topic: string; correct: number; total: number }> = {};

    results.forEach((r) => {
      if (r.detailedAnalysis) {
        r.detailedAnalysis.forEach((q) => {
          if (!questionStats[q.questionId]) {
            questionStats[q.questionId] = {
              text: q.questionText,
              topic: q.topic,
              correct: 0,
              total: 0,
            };
          }
          questionStats[q.questionId].total += 1;
          if (q.isCorrect) {
            questionStats[q.questionId].correct += 1;
          }
        });
      }
    });

    return Object.entries(questionStats)
      .map(([id, d]) => ({
        id,
        text: d.text,
        topic: d.topic,
        attempts: d.total,
        accuracy: Math.round((d.correct / d.total) * 100),
      }))
      .filter((d) => d.attempts >= 1)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [results]);

  const handleProcessDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setIsGeneratingAI(true);
    setDocumentError('');
    setAiSuccessFeedback('');
    setDocumentQuestionsSaved(false);
    setSelectedDocumentName(file.name);

    try {
      const text = await extractTextFromDocument(file);
      const parsed = await parseDocumentTextWithAI(text, String(aiSubjectId), aiSubject, aiGrade);
      setAiGeneratedQuestions(parsed);
    } catch (err) {
      console.error('Error processing uploaded document:', err);
      setAiGeneratedQuestions([]);
      setDocumentError(err instanceof Error ? err.message : 'Dokumen tidak dapat diproses.');
    } finally {
      setIsGeneratingAI(false);
      input.value = '';
    }
  };

  const handleSaveDocumentQuestions = () => {
    if (aiGeneratedQuestions.length === 0 || documentQuestionsSaved) return;
    onAddCustomQuestions(aiGeneratedQuestions);
    setDocumentQuestionsSaved(true);
    setAiSuccessFeedback(`${aiGeneratedQuestions.length} soal berhasil disimpan ke Bank Soal.`);
    playSuccessSound();
  };

  // Create Manual Exam Code
  const handleCreateExamCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeName.trim() || !newCodeTitle.trim()) return;
    setCodeErrorMsg('');

    const sub = subjects.find((s) => s.id === newCodeSubject);
    const subQuestions = questions.filter((q) => q.subjectId === newCodeSubject);

    const code: ExamCode = {
      id: `code-${Date.now()}`,
      code: newCodeName.trim().toUpperCase(),
      title: newCodeTitle.trim(),
      subjectId: newCodeSubject,
      subjectName: sub?.name || 'Mata Pelajaran SMP',
      grade: newCodeGrade,
      durationMinutes: Number(newCodeDuration) || 20,
      kkm: Number(newCodeKKM) || 75,
      questionCount: subQuestions.length > 0 ? subQuestions.length : 5,
      createdByName: activeTeacher?.name || 'Guru',
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setIsSavingCode(true);
    try {
      await onSaveExamCode(code);
      setCodeSuccessMsg(`Kode ujian "${code.code}" berhasil diaktifkan untuk siswa!`);
      setNewCodeName('');
      setNewCodeTitle('');
    } catch (error) {
      setCodeErrorMsg(error instanceof Error ? error.message : 'Kode ujian gagal disimpan.');
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleDeleteExamCode = async (codeId: string) => {
    setCodeErrorMsg('');
    setDeletingCodeId(codeId);
    try {
      await onDeleteExamCode(codeId);
    } catch (error) {
      setCodeErrorMsg(error instanceof Error ? error.message : 'Kode ujian gagal dihapus.');
    } finally {
      setDeletingCodeId('');
    }
  };

  // Export Results CSV
  const handleExportResultsCSV = () => {
    if (filteredResults.length === 0) return;

    const headers = ['No', 'Nama_Siswa', 'Kelas', 'No_Absen', 'Mata_Pelajaran', 'Skor', 'Ketuntasan', 'Benar', 'Salah', 'Durasi_Detik', 'Tanggal'];
    const rows = filteredResults.map((r, i) => [
      i + 1,
      `"${r.studentName}"`,
      r.studentClass,
      r.noAbsen || '-',
      `"${r.subjectName}"`,
      r.score,
      r.passed ? 'TUNTAS' : 'REMEDIAL',
      r.correctCount,
      r.wrongCount,
      r.durationSeconds,
      `"${formatDateIndo(r.completedAt)}"`,
    ]);

    const csvData = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_Exambro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Teacher Identity & Quick Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            SMP Al-Qur'an Terpadu Yanbu'ul Quran 1
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dashboard Guru & Manajemen Ujian
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mt-1 leading-relaxed">
            Kelola hasil belajar, bank soal, dan sesi ujian.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTeacher && (
            <button
              type="button"
              onClick={onLogoutTeacher}
              title="Keluar dari Akun Guru"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Ujian Selesai</span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 my-1">
            {totalSubmissions}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Data Tersimpan Real-time
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Rata-rata Nilai Sekolah</span>
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 my-1">
            {overallAvg}
          </div>
          <span className="text-[11px] text-slate-400">Target KKM Sekolah: 75</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tingkat Ketuntasan</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 my-1">
            {passRate}%
          </div>
          <span className="text-[11px] text-slate-400">{passedCount} siswa mencapai KKM</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Kode Ujian Aktif</span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 my-1">
            {examCodes.length} <span className="text-sm font-semibold text-slate-500">Sesi</span>
          </div>
          <span className="text-[11px] text-slate-400">{questions.length} Total Soal CBT</span>
        </div>
      </div>

      {/* Teacher Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('results');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Hasil & Rekap Nilai</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('analytics');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Grafik Belajar Siswa</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('leaderboard');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard Siswa</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('document_import');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'document_import'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Buat Soal dari File</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('exam_codes');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'exam_codes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Kelola Kode Ujian ({examCodes.length})</span>
        </button>

        <button
          onClick={() => {
            playNavigationSound();
            setActiveTab('questions');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bank Soal CBT ({questions.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: HASIL & REKAP NILAI SISWA ================= */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Semua Mapel</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Semua Kelas</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Semua Status</option>
                <option value="passed">Tuntas (&gt;= KKM)</option>
                <option value="remedial">Remedial (&lt; KKM)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Cari siswa / kelas..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleExportResultsCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Rekap (CSV)</span>
              </button>
            </div>
          </div>

          {/* Student Results Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Tidak ada data nilai siswa yang sesuai kriteria pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Mapel</th>
                      <th className="py-3 px-4 text-center">Skor</th>
                      <th className="py-3 px-4 text-center">Ketuntasan</th>
                      <th className="py-3 px-4 text-center">Benar / Total</th>
                      <th className="py-3 px-4 text-center">Durasi</th>
                      <th className="py-3 px-4">Waktu Selesai</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredResults.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {r.studentName}
                          {r.noAbsen && (
                            <div className="text-[10px] text-slate-400 font-normal">No. Absen: {r.noAbsen}</div>
                          )}
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
                            {r.passed ? 'TUNTAS' : 'REMEDIAL'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                          <strong className="text-emerald-600">{r.correctCount}</strong> / {r.totalQuestions}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {formatTime(r.durationSeconds)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDateIndo(r.completedAt)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedResultForDetail(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lembar Jawaban</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: GRAFIK PROGRES BELAJAR SISWA ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <StudentProgressView
            results={results}
            subjects={subjects}
            activeStudent={null}
            onStartQuiz={() => {}}
          />

          {/* Item Analysis (Analisis Butir Soal) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Analisis Butir Soal (Indeks Kesulitan / Soal Paling Sering Salah)
                </h3>
                <p className="text-xs text-slate-400">
                  Guru dapat melihat soal dengan akurasi terendah untuk bahan materi remedial di kelas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-14">Tingkat</th>
                    <th className="py-2.5 px-3">Topik Pembelajaran</th>
                    <th className="py-2.5 px-3">Teks Pertanyaan</th>
                    <th className="py-2.5 px-3 text-center">Dikerjakan</th>
                    <th className="py-2.5 px-3 text-center">Akurasi Benar</th>
                    <th className="py-2.5 px-3 text-center">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemAnalysis.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {item.topic}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 max-w-md">
                        {item.text}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">{item.attempts}x</td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            item.accuracy < 60
                              ? 'bg-rose-100 text-rose-800 font-extrabold'
                              : item.accuracy < 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.accuracy < 60 ? (
                          <span className="text-rose-600 font-bold text-[11px]">Perlu Remedial</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Cukup Dikuasai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: LEADERBOARD SISWA ================= */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <LeaderboardView
            results={results}
            subjects={subjects}
            activeStudent={null}
          />
        </div>
      )}

      {/* ================= TAB 4: IMPOR SOAL DARI DOKUMEN ================= */}
      {activeTab === 'document_import' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Buat Soal dari Dokumen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran</label>
                <select
                  value={aiSubjectId}
                  onChange={(event) => {
                    setAiSubjectId(event.target.value);
                    setAiSubject(subjects.find((subject) => String(subject.id) === event.target.value)?.name || '');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat Kelas</label>
                <select
                  value={aiGrade}
                  onChange={(event) => setAiGrade(event.target.value as typeof aiGrade)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="Kelas 7">Kelas 7</option>
                  <option value="Kelas 8">Kelas 8</option>
                  <option value="Kelas 9">Kelas 9</option>
                </select>
              </div>
            </div>

            <input
              ref={documentInputRef}
              type="file"
              accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              onChange={handleProcessDocument}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              disabled={isGeneratingAI}
              className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-60 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isGeneratingAI ? 'Memproses dokumen...' : 'Pilih file Word (.docx) atau PDF'}</span>
            </button>
            {selectedDocumentName && (
              <p className="text-xs text-slate-500 dark:text-slate-400">File: {selectedDocumentName}</p>
            )}
            {documentError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {documentError}
              </div>
            )}
            {aiSuccessFeedback && (
              <div role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
                {aiSuccessFeedback}
              </div>
            )}
          </div>

          {aiGeneratedQuestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Pratinjau Soal ({aiGeneratedQuestions.length})
                </h3>
                <button
                  type="button"
                  onClick={handleSaveDocumentQuestions}
                  disabled={documentQuestionsSaved}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-emerald-600 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {documentQuestionsSaved ? 'Tersimpan' : 'Simpan Soal'}
                </button>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {aiGeneratedQuestions.map((question, index) => (
                  <div key={question.id} className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="font-extrabold text-blue-600">Nomor {index + 1}</div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{question.questionText}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
                        <div key={key} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                          <strong>{key}.</strong> {question.options[key]}
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 text-[11px] text-blue-900 dark:text-blue-200">
                        <strong>Pembahasan:</strong> {question.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: KELOLA KODE UJIAN SISWA ================= */}
      {activeTab === 'exam_codes' && (
        <div className="space-y-6">
          {codeErrorMsg && (
            <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs">
              {codeErrorMsg}
            </div>
          )}

          {codeSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{codeSuccessMsg}</span>
              </div>
              <button
                onClick={() => setCodeSuccessMsg('')}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form Create Exam Code */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Buat Kode Ujian CBT Baru
            </h3>
            <p className="text-xs text-slate-400">
              Siswa cukup memasukkan kode ini pada halaman masuk untuk langsung masuk ke sesi ujiannya.
            </p>

            <form onSubmit={handleCreateExamCode} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Kode Ujian (Token) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                    placeholder="Contoh: MAT8-UTS"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-blue-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Mata Pelajaran</label>
                  <select
                    value={newCodeSubject}
                    onChange={(e) => setNewCodeSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Tingkat Kelas</label>
                  <select
                    value={newCodeGrade}
                    onChange={(e) => setNewCodeGrade(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="Kelas 7">Kelas 7</option>
                    <option value="Kelas 8">Kelas 8</option>
                    <option value="Kelas 9">Kelas 9</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Judul / Deskripsi Sesi Ujian</label>
                <input
                  type="text"
                  required
                  value={newCodeTitle}
                  onChange={(e) => setNewCodeTitle(e.target.value)}
                  placeholder="Misal: Penilaian Harian Matematika (Sistem Aljabar)"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Alokasi Waktu (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={newCodeDuration}
                    onChange={(e) => setNewCodeDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Batas KKM (Poin)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={newCodeKKM}
                    onChange={(e) => setNewCodeKKM(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingCode}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {isSavingCode ? 'Menyimpan...' : '+ Simpan & Aktifkan Kode Ujian'}
              </button>
            </form>
          </div>

          {/* List of Active Exam Codes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Daftar Kode Ujian Siswa ({examCodes.length})</span>
              <span className="text-xs text-slate-400 font-normal">Sinkronisasi Cloud Real-time</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examCodes.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-blue-600 text-white">
                      {c.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteExamCode(c.id)}
                      disabled={deletingCodeId === c.id}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                      title="Hapus Kode Ujian"
                    >
                      {deletingCodeId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {c.title}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                    <span>Mapel: <strong>{c.subjectName}</strong></span>
                    <span>Tingkat: <strong>{c.grade}</strong></span>
                    <span>Durasi: <strong>{c.durationMinutes} m</strong></span>
                    <span>KKM: <strong>{c.kkm}</strong></span>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: BANK SOAL CBT & UPLOAD MASSAL ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Upload Success Feedback Banner */}
          {uploadSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{uploadSuccessMsg}</span>
              </div>
              <button
                onClick={() => setUploadSuccessMsg('')}
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Document import shortcut */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs flex items-center justify-between">
            <span className="text-blue-900 dark:text-blue-200">Unggah dokumen Word atau PDF untuk menyiapkan soal.</span>
            <button
              onClick={() => setActiveTab('document_import')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              Unggah Dokumen
            </button>
          </div>

          {/* Existing Question Bank Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Daftar Butir Soal Terdaftar ({questions.length} Soal)
              </h3>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">No. {idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
                        {q.subjectName} ({q.grade})
                      </span>
                      <span className="font-bold text-emerald-600 text-xs">
                        Kunci: {q.correctAnswer}
                      </span>
                    </div>
                    {q.id.startsWith('q-') && (
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {q.questionText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Answer Sheet Modal for Specific Student */}
      {selectedResultForDetail && (
        <StudentAnswerSheetModal
          result={selectedResultForDetail}
          onClose={() => setSelectedResultForDetail(null)}
        />
      )}
    </div>
  );
};

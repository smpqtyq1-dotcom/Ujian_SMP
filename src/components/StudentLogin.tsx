import React, { useState, useEffect } from 'react';
import { 
  User, 
  School, 
  KeyRound, 
  Play, 
  Clock, 
  Target, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Question, StudentProfile, SubjectMeta } from '../types/quiz.ts';
import { playNavigationSound } from '../utils/soundEffects.ts';

interface StudentLoginProps {
  subjects: SubjectMeta[];
  questions: Question[];
  activeStudent: StudentProfile | null;
  onStartExam: (student: StudentProfile, subjectId: string) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  subjects,
  questions,
  activeStudent,
  onStartExam,
}) => {
  const [name, setName] = useState(activeStudent?.name || '');
  const [studentClass, setStudentClass] = useState(activeStudent?.studentClass || '8A');
  const [attendanceNumber, setAttendanceNumber] = useState(activeStudent?.noAbsen || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'matematika');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Count questions available per subject
  const getSubjectQuestionCount = (subjectId: string) => {
    return questions.filter((q) => q.subjectId === subjectId).length;
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const questionCount = getSubjectQuestionCount(selectedSubjectId);

  // Autostart support (?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const demoStudent: StudentProfile = {
        name: activeStudent?.name || 'Siswa Berprestasi',
        studentClass: activeStudent?.studentClass || '8A',
        noAbsen: activeStudent?.noAbsen,
      };
      onStartExam(demoStudent, selectedSubjectId);
    }
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Silakan masukkan nama lengkap siswa.');
      return;
    }

    if (!token.trim()) {
      setErrorMsg('Masukkan kode ujian dari guru.');
      return;
    }

    if (questionCount === 0) {
      setErrorMsg('Belum ada soal pada mata pelajaran ini. Silakan pilih mata pelajaran lain atau upload soal di Dashboard Guru.');
      return;
    }

    playNavigationSound();
    onStartExam(
      {
        name: name.trim(),
        studentClass,
        noAbsen: attendanceNumber.trim() || undefined,
      },
      selectedSubjectId
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Banner Exambro Hero */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-blue-500/20">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <School className="w-3.5 h-3.5" />
            Computer Based Test (CBT) Siswa SMP
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Selamat Datang di Portal Ujian Exambro SMP
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
            Kerjakan soal pilihan ganda dengan teliti, pantau sisa waktu Anda, dan dapatkan penilaian otomatis serta pembahasan lengkap seketika setelah selesai.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Registration Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-blue-600" />
            Identitas Peserta Ujian
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Lengkapi data diri Anda sebelum memulai sesi ujian CBT.
          </p>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStart} className="space-y-4">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Student Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tingkat & Kelas <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {['7', '8', '9'].flatMap((grade) => (
                      <optgroup key={grade} label={`Kelas ${grade}`}>
                        {['A', 'B', 'C', 'D', 'E'].map((room) => (
                          <option key={`${grade}${room}`} value={`${grade}${room}`}>
                            Kelas {grade}{room}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nomor absen */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  No. Absen <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={attendanceNumber}
                  onChange={(e) => setAttendanceNumber(e.target.value)}
                  placeholder="Masukkan nomor absen"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Mata Pelajaran Selector */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Mata Pelajaran Ujian <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {subjects.map((sub) => {
                  const count = getSubjectQuestionCount(sub.id);
                  const isSelected = selectedSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        playNavigationSound();
                        setSelectedSubjectId(sub.id);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-tight mb-1">
                        {sub.name}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{count} Soal</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          KKM {sub.kkm}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Token Ujian */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Token Ujian CBT <span className="text-rose-500">*</span></span>
                <span className="text-[11px] text-slate-500 font-normal">Kode diberikan oleh guru.</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode ujian"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono tracking-wider text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={questionCount === 0}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Mulai Kerjakan Ujian Sekarang</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Exam Details & Guidelines */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Subject Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              Detail Sesi Ujian Terpilih
            </h3>

            <div className="space-y-3.5">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedSubject.name}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedSubject.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Jumlah Soal</span>
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {questionCount} Butir
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Alokasi Waktu</span>
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {selectedSubject.durationMinutes} Menit
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <span>Nilai KKM (Ketuntasan):</span>
                <span className="font-extrabold text-sm">{selectedSubject.kkm} Poin</span>
              </div>
            </div>
          </div>

          {/* Rules & Exambro Etiquette */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2.5 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Tata Tertib & Petunjuk Ujian CBT
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Pilih satu jawaban terbaik (A, B, C, atau D) untuk setiap butir soal.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Gunakan tombol <strong>Ragu-ragu</strong> jika Anda belum yakin dengan jawaban yang dipilih.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Timer hitung mundur otomatis mengumpulkan jawaban saat waktu habis.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Hasil skor, ranking, dan pembahasan soal langsung muncul seketika setelah selesai.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

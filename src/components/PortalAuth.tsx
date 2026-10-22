import React, { useState } from 'react';
import { 
  Laptop, 
  GraduationCap, 
  KeyRound, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  FileText, 
  ShieldCheck, 
  BookOpen,
  School,
  Lock
} from 'lucide-react';
import { ExamCode, StudentProfile, TeacherProfile } from '../types/quiz.ts';
import { REGISTERED_TEACHERS } from '../data/teacherData.ts';
import { playNavigationSound } from '../utils/soundEffects.ts';

interface PortalAuthProps {
  examCodes: ExamCode[];
  activeTeacher: TeacherProfile | null;
  onStudentEnterExam: (student: StudentProfile, examCode: ExamCode) => void;
  onTeacherLogin: (teacher: TeacherProfile) => void;
  onGuestStudentDirectExam?: () => void;
}

export const PortalAuth: React.FC<PortalAuthProps> = ({
  examCodes,
  activeTeacher,
  onStudentEnterExam,
  onTeacherLogin,
}) => {
  const [activePortal, setActivePortal] = useState<'siswa' | 'guru'>('siswa');

  // Student State
  const [inputExamCode, setInputExamCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('8-A');
  const [customClass, setCustomClass] = useState('');
  const [nisn, setNisn] = useState('');
  const [studentError, setStudentError] = useState('');

  // Teacher State
  const [inputNiy, setInputNiy] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(REGISTERED_TEACHERS[0].id);
  const [teacherError, setTeacherError] = useState('');
  const [teacherSuccess, setTeacherSuccess] = useState('');

  // Matched Exam Code
  const matchedExam = examCodes.find(
    (c) => c.code.trim().toUpperCase() === inputExamCode.trim().toUpperCase()
  );

  // Student Submit
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    if (!inputExamCode.trim()) {
      setStudentError('Silakan masukkan Kode Ujian yang diberikan oleh Guru.');
      return;
    }

    if (!matchedExam) {
      setStudentError(`Kode ujian "${inputExamCode}" tidak ditemukan atau belum aktif. Silakan pilih dari daftar kode aktif di bawah.`);
      return;
    }

    if (!studentName.trim()) {
      setStudentError('Silakan lengkapi nama lengkap Anda.');
      return;
    }

    const finalClass = studentClass === 'custom' ? customClass.trim() : studentClass;
    if (!finalClass) {
      setStudentError('Silakan pilih atau ketik kelas Anda.');
      return;
    }

    playNavigationSound();
    onStudentEnterExam(
      {
        name: studentName.trim(),
        studentClass: finalClass,
        nisn: nisn.trim() || undefined,
      },
      matchedExam
    );
  };

  // Teacher Login with NIY
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccess('');

    const trimmedNiy = inputNiy.trim();
    if (!trimmedNiy) {
      setTeacherError('Silakan masukkan Nomor Induk Yayasan (NIY) Guru Anda.');
      return;
    }

    // Match NIY with registered teachers
    const foundTeacher = REGISTERED_TEACHERS.find(
      (t) => t.niy.replace(/[\s-]/g, '') === trimmedNiy.replace(/[\s-]/g, '')
    );

    if (foundTeacher) {
      playNavigationSound();
      setTeacherSuccess(`Selamat datang kembali, ${foundTeacher.name}! Mengalihkan ke Dashboard Guru...`);
      setTimeout(() => {
        onTeacherLogin(foundTeacher);
      }, 600);
    } else {
      setTeacherError('Nomor Induk Yayasan (NIY) tidak terdaftar. Silakan gunakan daftar NIY guru resmi di bawah ini.');
    }
  };

  // Quick select teacher for easy 1-click verification
  const handleQuickTeacherSelect = (teacher: TeacherProfile) => {
    setSelectedTeacherId(teacher.id);
    setInputNiy(teacher.niy);
    setTeacherError('');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-blue-500/20">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <School className="w-3.5 h-3.5" />
            Sistem CBT & Manajemen Ujian SMP Terpadu
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Portal Masuk Exambro SMP
          </h1>
          <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed">
            Pilih portal sesuai peran Anda: Siswa dapat langsung masuk dengan <strong>Kode Ujian</strong> dari guru, sedangkan Guru dapat mengakses dashboard analitik, pembuatan soal AI, dan leaderboard menggunakan <strong>NIY Guru</strong>.
          </p>
        </div>
      </div>

      {/* Portal Selection Tabs */}
      <div className="flex p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl max-w-md mx-auto mb-8 shadow-inner">
        <button
          type="button"
          onClick={() => {
            playNavigationSound();
            setActivePortal('siswa');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activePortal === 'siswa'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Masuk Sebagai Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playNavigationSound();
            setActivePortal('guru');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            activePortal === 'guru'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Masuk Sebagai Guru (NIY)</span>
        </button>
      </div>

      {/* ================= PORTAL SISWA ================= */}
      {activePortal === 'siswa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Formulir Masuk Peserta Ujian CBT
                </h2>
                <p className="text-xs text-slate-500">
                  Masukkan kode ujian dari bapak/ibu guru untuk memulai sesi tes.
                </p>
              </div>
            </div>

            {studentError && (
              <div className="my-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{studentError}</span>
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-4 mt-5">
              {/* Step 1: Input Kode Ujian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Kode Ujian / Token CBT <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                    Diberikan oleh Guru Mapel
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={inputExamCode}
                    onChange={(e) => setInputExamCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: MAT8-2026 atau IPA8-2026"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border-2 border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-slate-900 dark:text-slate-100 font-mono font-bold tracking-wider text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Detected Exam Banner Preview */}
              {matchedExam ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kode Ujian Valid: {matchedExam.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-800 dark:text-emerald-300 pt-1">
                    <span>Mapel: <strong>{matchedExam.subjectName}</strong></span>
                    <span>Tingkat: <strong>{matchedExam.grade}</strong></span>
                    <span>Durasi: <strong>{matchedExam.durationMinutes} Menit</strong></span>
                    <span>Guru: <strong>{matchedExam.createdByName}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  💡 Tips: Klik salah satu <strong>Kode Ujian Aktif</strong> di kolom kanan untuk mengisi otomatis.
                </div>
              )}

              {/* Step 2: Minimal Student Info */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Lengkap Siswa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Contoh: Muhammad Farhan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Kelas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="7-A">Kelas 7-A</option>
                      <option value="7-B">Kelas 7-B</option>
                      <option value="7-C">Kelas 7-C</option>
                      <option value="8-A">Kelas 8-A</option>
                      <option value="8-B">Kelas 8-B</option>
                      <option value="8-C">Kelas 8-C</option>
                      <option value="9-A">Kelas 9-A</option>
                      <option value="9-B">Kelas 9-B</option>
                      <option value="9-C">Kelas 9-C</option>
                      <option value="custom">Ketik Kelas Lain...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      NISN / No. Peserta <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      placeholder="Contoh: 0089123412"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {studentClass === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nama Kelas Kustom
                    </label>
                    <input
                      type="text"
                      required
                      value={customClass}
                      onChange={(e) => setCustomClass(e.target.value)}
                      placeholder="Misal: 8-Tahfidz"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Masuk & Mulai Sesi Ujian CBT</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Active Exam Codes List for Quick Access */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  Daftar Kode Ujian Aktif
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                  {examCodes.length} Tersedia
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Klik salah satu kode ujian di bawah ini untuk mengisinya secara instan ke formulir login Anda:
              </p>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {examCodes.map((c) => {
                  const isSelected = inputExamCode.toUpperCase() === c.code.toUpperCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        playNavigationSound();
                        setInputExamCode(c.code);
                        setStudentError('');
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-600 text-white">
                          {c.code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {c.durationMinutes} Menit
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-1">
                        {c.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>{c.subjectName} ({c.grade})</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{c.createdByName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exam Etiquette Notice */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Petunjuk Keamanan Exambro</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Jawaban Anda dinilai otomatis seketika setelah ujian selesai. Grafik belajar dan papan peringkat (leaderboard) dipantau secara langsung oleh dewan guru.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= PORTAL GURU (LOGIN NIY) ================= */}
      {activePortal === 'guru' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: NIY Authentication */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Login Guru dengan NIY
                </h2>
                <p className="text-xs text-slate-500">
                  Gunakan Nomor Induk Yayasan (NIY) resmi untuk membuka Dashboard Guru.
                </p>
              </div>
            </div>

            {teacherError && (
              <div className="my-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{teacherError}</span>
              </div>
            )}

            {teacherSuccess && (
              <div className="my-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{teacherSuccess}</span>
              </div>
            )}

            <form onSubmit={handleTeacherSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nomor Induk Yayasan (NIY) Guru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={inputNiy}
                    onChange={(e) => setInputNiy(e.target.value)}
                    placeholder="Masukkan 14 digit NIY Anda (misal: 19850412201001)..."
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  💡 Anda dapat mengklik salah satu nama guru di daftar sebelah kanan untuk mengisi NIY secara otomatis.
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Lock className="w-4 h-4" />
                  <span>Verifikasi NIY & Masuk ke Dashboard Guru</span>
                </button>
              </div>
            </form>

            {/* Quick Demo Access Bar */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Akses Cepat Penguji / Tamu:
              </span>
              <button
                type="button"
                onClick={() => {
                  const demo = REGISTERED_TEACHERS[0];
                  setInputNiy(demo.niy);
                  onTeacherLogin(demo);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Masuk Cepat Sebagai Bambang Suryono, S.Pd. (Matematika)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Registered Teachers List and NIY */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Daftar Nama Guru & NIY Terdaftar
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                SMP Negeri 1 Nusantara
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Pilih nama guru di bawah ini untuk memasukkan NIY secara instan:
            </p>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {REGISTERED_TEACHERS.map((t) => {
                const isSelected = inputNiy === t.niy;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleQuickTeacherSelect(t)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {t.name}
                      </div>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                        NIY: {t.niy}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>Mata Pelajaran: <strong>{t.subject}</strong></span>
                      <span className="text-indigo-600 font-semibold hover:underline">
                        Klik untuk Pilih
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

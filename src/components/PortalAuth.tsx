import React, { useEffect, useState } from 'react';
import { 
  Laptop, 
  GraduationCap, 
  KeyRound, 
  UserCheck, 
  AlertCircle, 
  Play, 
  School,
  Lock
} from 'lucide-react';
import { ExamCode, StudentProfile, TeacherProfile } from '../types/quiz.ts';
import { playNavigationSound } from '../utils/soundEffects.ts';
import { loadStudentRoster, loginTeacher, StudentRosterEntry, validateStudentExamCode } from '../utils/secureApi.ts';

interface PortalAuthProps {
  onStudentEnterExam: (student: StudentProfile, examCode: ExamCode) => void;
  onTeacherLogin: (teacher: TeacherProfile) => Promise<void>;
}

export const PortalAuth: React.FC<PortalAuthProps> = ({
onStudentEnterExam,
onTeacherLogin,
}) => {
  const [activePortal, setActivePortal] = useState<'siswa' | 'guru'>('siswa');

  // Student State
  const [inputExamCode, setInputExamCode] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [students, setStudents] = useState<StudentRosterEntry[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [attendanceNumber, setAttendanceNumber] = useState('');
  const [studentError, setStudentError] = useState('');
  const [isCheckingExamCode, setIsCheckingExamCode] = useState(false);

  // Teacher State
  const [inputNiy, setInputNiy] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setSelectedStudentId('');
    setStudents([]);
    setRosterError('');
    if (!studentClass || !inputExamCode.trim()) {
      setIsLoadingStudents(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingStudents(true);
    void loadStudentRoster(studentClass, inputExamCode.trim(), controller.signal)
      .then(setStudents)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRosterError(error instanceof Error ? error.message : 'Daftar siswa tidak dapat dimuat.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingStudents(false);
      });
    return () => controller.abort();
  }, [studentClass, inputExamCode]);

  // Student Submit
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const selectedStudent = students.find((student) => student.id === selectedStudentId);
    if (!studentClass) {
      setStudentError('Silakan pilih kelas terlebih dahulu.');
      return;
    }
    if (!selectedStudent) {
      setStudentError('Silakan pilih nama siswa dari daftar kelas.');
      return;
    }
    if (!inputExamCode.trim()) {
      setStudentError('Silakan masukkan Kode Ujian yang diberikan oleh Guru.');
      return;
    }

    setIsCheckingExamCode(true);
    try {
      const examCode = await validateStudentExamCode(inputExamCode.trim());
      playNavigationSound();
      onStudentEnterExam(
        {
          name: selectedStudent.name,
          studentClass,
          noAbsen: attendanceNumber.trim() || undefined,
        },
        examCode
      );
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Kode ujian tidak dapat diperiksa.');
    } finally {
      setIsCheckingExamCode(false);
    }
  };

  // Teacher Login with NIY
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError('');

    const trimmedNiy = inputNiy.trim();
    if (!trimmedNiy) {
      setTeacherError('Silakan masukkan Nomor Induk Yayasan (NIY) Guru Anda.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const teacher = await loginTeacher(trimmedNiy);
      playNavigationSound();
      await onTeacherLogin(teacher);
    } catch (error) {
      setTeacherError(error instanceof Error ? error.message : 'NIY tidak dapat diverifikasi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-blue-500/20">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <School className="w-3.5 h-3.5" />
            SMP Al-Qur'an Terpadu Yanbu'ul Quran 1
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Portal Masuk Exambro SMP
          </h1>
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
          <span>Masuk Sebagai Guru</span>
        </button>
      </div>

      {/* ================= PORTAL SISWA ================= */}
      {activePortal === 'siswa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                    placeholder="Masukkan kode yang diberikan guru"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border-2 border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-slate-900 dark:text-slate-100 font-mono font-bold tracking-wider text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Step 2: Select the class before loading its student names */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih kelas</option>
                    {['7', '8', '9'].flatMap((grade) =>
                      ['A', 'B', 'C', 'D', 'E'].map((room) => {
                        const className = `${grade}${room}`;
                        return (
                          <option key={className} value={className}>
                            Kelas {className}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nama Lengkap Siswa <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!studentClass || isLoadingStudents || students.length === 0}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">
                        {!studentClass
                          ? 'Pilih kelas terlebih dahulu'
                          : isLoadingStudents
                            ? 'Memuat nama siswa...'
                            : !inputExamCode.trim()
                              ? 'Masukkan kode ujian terlebih dahulu'
                            : students.length
                              ? 'Pilih nama siswa'
                              : 'Tidak ada data siswa'}
                      </option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.name}</option>
                      ))}
                    </select>
                    {rosterError && <p role="alert" className="mt-1.5 text-xs text-rose-600">{rosterError}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      No. Absen <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={attendanceNumber}
                      onChange={(e) => setAttendanceNumber(e.target.value)}
                      placeholder="Masukkan nomor absen"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isCheckingExamCode}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isCheckingExamCode ? 'Memeriksa kode...' : 'Masuk & Mulai Sesi Ujian CBT'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ================= PORTAL GURU (LOGIN NIY) ================= */}
      {activePortal === 'guru' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: NIY Authentication */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Login Guru
                </h2>
              </div>
            </div>

            {teacherError && (
              <div className="my-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{teacherError}</span>
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
                    placeholder="Masukkan NIY"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoggingIn ? 'Memeriksa...' : 'Masuk ke Dashboard Guru'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

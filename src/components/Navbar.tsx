import React, { useState } from 'react';
import { 
  Laptop, 
  GraduationCap, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  LogOut,
  User,
  School,
  Sparkles
} from 'lucide-react';
import { StudentProfile, TeacherProfile } from '../types/quiz.ts';
import { isSoundEnabled, setSoundEnabled, playNavigationSound } from '../utils/soundEffects.ts';

export type ActivePortalMode = 'student' | 'teacher';

interface NavbarProps {
  portalMode: ActivePortalMode;
  setPortalMode: (mode: ActivePortalMode) => void;
  activeStudent: StudentProfile | null;
  activeTeacher: TeacherProfile | null;
  onLogoutStudent: () => void;
  onLogoutTeacher: () => void;
  isExamRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  portalMode,
  setPortalMode,
  activeStudent,
  activeTeacher,
  onLogoutStudent,
  onLogoutTeacher,
  isExamRunning,
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playNavigationSound();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  const handlePortalSwitch = (mode: ActivePortalMode) => {
    if (isExamRunning && mode !== 'student') {
      const confirmLeave = window.confirm(
        'Ujian sedang berlangsung! Jika berpindah ke portal guru, sesi ujian siswa akan ditangguhkan. Tetap pindah?'
      );
      if (!confirmLeave) return;
    }
    playNavigationSound();
    setPortalMode(mode);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePortalSwitch('student')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30">
                <Laptop className="w-5 h-5 transition-transform group-hover:scale-110" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
                    EXAMBRO SMP
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    CBT Edukasi
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  SMP Negeri 1 Nusantara • Ujian Terpadu
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Mode Buttons */}
          <nav className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => handlePortalSwitch('student')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                portalMode === 'student'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Portal Siswa</span>
              {isExamRunning && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500 text-white animate-pulse">
                  Ujian Aktif
                </span>
              )}
            </button>

            <button
              onClick={() => handlePortalSwitch('teacher')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                portalMode === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Portal Guru & Analitik</span>
            </button>
          </nav>

          {/* Right Tools: User status badge, Sound, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Student Badge */}
            {portalMode === 'student' && activeStudent && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-slate-200 truncate max-w-[100px]">
                    {activeStudent.name}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    {activeStudent.studentClass}
                  </div>
                </div>
                {!isExamRunning && (
                  <button
                    onClick={onLogoutStudent}
                    title="Ganti Kode / Siswa"
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors ml-1 rounded hover:bg-slate-700/50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Active Teacher Badge */}
            {portalMode === 'teacher' && activeTeacher && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/80">
                <div className="w-7 h-7 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-indigo-200 truncate max-w-[130px]">
                    {activeTeacher.name}
                  </div>
                  <div className="text-indigo-400/80 text-[10px] font-mono">
                    NIY: {activeTeacher.niy}
                  </div>
                </div>
                <button
                  onClick={onLogoutTeacher}
                  title="Keluar Akun Guru"
                  className="p-1 text-indigo-400 hover:text-rose-400 transition-colors ml-1 rounded hover:bg-indigo-900/50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              title={soundOn ? 'Nonaktifkan Suara Efek' : 'Aktifkan Suara Efek'}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Exambro PC)'}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

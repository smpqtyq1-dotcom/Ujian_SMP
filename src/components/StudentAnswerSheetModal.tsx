import React from 'react';
import { X, CheckCircle2, XCircle, Clock, BookOpen, User, FileText } from 'lucide-react';
import { ExamResult } from '../types/quiz.ts';
import { formatTime, formatDateIndo } from '../utils/grading.ts';

interface StudentAnswerSheetModalProps {
  result: ExamResult | null;
  onClose: () => void;
}

export const StudentAnswerSheetModal: React.FC<StudentAnswerSheetModalProps> = ({
  result,
  onClose,
}) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Lembar Jawaban Ujian Siswa (LJU)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  result.passed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {result.passed ? 'TUNTAS' : 'REMEDIAL'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {result.studentName} — Kelas {result.studentClass}
            </h2>
            <p className="text-xs text-slate-500">
              Mata Pelajaran: <strong>{result.subjectName}</strong> • {formatDateIndo(result.completedAt)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-3 text-center text-xs shrink-0">
          <div>
            <div className="font-medium text-slate-400">Skor Akhir</div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">{result.score}</div>
          </div>
          <div>
            <div className="font-medium text-slate-400">Benar</div>
            <div className="text-xl font-black text-emerald-600">{result.correctCount} Soal</div>
          </div>
          <div>
            <div className="font-medium text-slate-400">Salah</div>
            <div className="text-xl font-black text-rose-600">{result.wrongCount} Soal</div>
          </div>
          <div>
            <div className="font-medium text-slate-400">Durasi</div>
            <div className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono">
              {formatTime(result.durationSeconds)}
            </div>
          </div>
        </div>

        {/* Detailed Question Answers List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {result.detailedAnalysis && result.detailedAnalysis.length > 0 ? (
            result.detailedAnalysis.map((item) => (
              <div
                key={item.questionId}
                className={`p-4 rounded-2xl border text-xs ${
                  item.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20'
                    : item.isUnanswered
                    ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    No. {item.questionNumber} • {item.topic}
                  </span>
                  {item.isCorrect ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Jawaban Tepat
                    </span>
                  ) : item.isUnanswered ? (
                    <span className="text-slate-500 font-medium">Kosong</span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Salah
                    </span>
                  )}
                </div>

                <div className="text-slate-800 dark:text-slate-200 font-medium mb-3">
                  {item.questionText}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Jawaban Siswa:</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {item.selectedAnswer ? `Pilihan ${item.selectedAnswer}` : 'Tidak Ada'}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Kunci Jawaban:</span>
                    <strong className="text-blue-600 dark:text-blue-400">
                      Pilihan {item.correctAnswer}
                    </strong>
                  </div>
                </div>

                {item.explanation && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Pembahasan:</strong> {item.explanation}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              Rincian butir soal untuk rekaman ini telah diringkas.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 transition-colors"
          >
            Tutup Lembar Jawaban
          </button>
        </div>
      </div>
    </div>
  );
};

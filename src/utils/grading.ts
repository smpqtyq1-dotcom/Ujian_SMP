import { 
  Badge, 
  ExamResult, 
  OptionKey, 
  Question, 
  QuestionAnalysis, 
  StudentProfile, 
  SubjectMeta 
} from '../types/quiz.ts';

export function calculateExamScore(
  questions: Question[],
  answers: Record<string, OptionKey>
): {
  score: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  accuracy: number;
  detailedAnalysis: QuestionAnalysis[];
} {
  const total = questions.length;
  if (total === 0) {
    return {
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      accuracy: 0,
      detailedAnalysis: [],
    };
  }

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const detailedAnalysis: QuestionAnalysis[] = questions.map((q, idx) => {
    const selectedAnswer = answers[q.id];
    const isUnanswered = !selectedAnswer;
    const isCorrect = selectedAnswer === q.correctAnswer;

    if (isUnanswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }

    return {
      questionId: q.id,
      questionNumber: idx + 1,
      questionText: q.questionText,
      topic: q.topic,
      selectedAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      isUnanswered,
      explanation: q.explanation,
    };
  });

  const rawScore = (correctCount / total) * 100;
  const score = Math.round(rawScore * 10) / 10; // 1 decimal place
  const accuracy = Math.round((correctCount / total) * 100);

  return {
    score,
    correctCount,
    wrongCount,
    unansweredCount,
    accuracy,
    detailedAnalysis,
  };
}

export function determineBadges(
  score: number,
  accuracy: number,
  durationSeconds: number,
  totalQuestions: number
): Badge[] {
  const badges: Badge[] = [];

  if (score === 100) {
    badges.push({
      id: 'perfect-score',
      title: 'Skor Sempurna (100)',
      description: 'Menjawab seluruh soal dengan benar tanpa kesalahan!',
      icon: '🏆',
      color: 'from-amber-400 to-yellow-600',
    });
  } else if (score >= 85) {
    badges.push({
      id: 'high-achiever',
      title: 'Bintang Prestasi',
      description: 'Mencapai nilai luar biasa di atas 85!',
      icon: '⭐',
      color: 'from-blue-500 to-indigo-600',
    });
  }

  if (score >= 75) {
    badges.push({
      id: 'passed-kkm',
      title: 'Tuntas KKM',
      description: 'Berhasil melampaui Kriteria Ketuntasan Minimal.',
      icon: '🎯',
      color: 'from-emerald-500 to-teal-600',
    });
  }

  // Fast completion badge: average < 30 seconds per question with score >= 75
  const avgSecondsPerQ = durationSeconds / Math.max(1, totalQuestions);
  if (avgSecondsPerQ < 35 && score >= 75) {
    badges.push({
      id: 'speed-demon',
      title: 'Cepat & Tangkas',
      description: 'Menyelesaikan ujian dengan kilat dan akurasi tinggi!',
      icon: '⚡',
      color: 'from-orange-500 to-amber-600',
    });
  }

  if (badges.length === 0) {
    badges.push({
      id: 'perseverance',
      title: 'Semangat Berjuang',
      description: 'Terus belajar dan berlatih untuk hasil yang lebih baik!',
      icon: '🌱',
      color: 'from-sky-400 to-blue-500',
    });
  }

  return badges;
}

export function buildExamResult(
  questions: Question[],
  answers: Record<string, OptionKey>,
  student: StudentProfile,
  subject: SubjectMeta,
  durationSeconds: number
): ExamResult {
  const { score, correctCount, wrongCount, unansweredCount, accuracy, detailedAnalysis } = 
    calculateExamScore(questions, answers);

  const passed = score >= subject.kkm;
  const badges = determineBadges(score, accuracy, durationSeconds, questions.length);

  return {
    id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    studentName: student.name.trim(),
    studentClass: student.studentClass.trim(),
    nisn: student.nisn?.trim() || undefined,
    subjectId: subject.id,
    subjectName: subject.name,
    score,
    passed,
    kkm: subject.kkm,
    totalQuestions: questions.length,
    correctCount,
    wrongCount,
    unansweredCount,
    accuracy,
    durationSeconds,
    completedAt: new Date().toISOString(),
    detailedAnalysis,
    badges,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateIndo(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

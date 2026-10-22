import { INITIAL_QUESTIONS } from '../data/defaultQuestions.ts';
import { INITIAL_STUDENT_RESULTS } from '../data/seedResults.ts';
import { INITIAL_EXAM_CODES } from '../data/teacherData.ts';
import { ExamResult, Question, StudentProfile, ExamCode, TeacherProfile } from '../types/quiz.ts';
import { 
  saveResultToFirestore, 
  saveQuestionsToFirestore, 
  deleteQuestionFromFirestore,
  subscribeToFirestoreResults,
  subscribeToFirestoreQuestions,
  subscribeToFirestoreExamCodes,
  saveExamCodeToFirestore,
  deleteExamCodeFromFirestore
} from '../firebase/service.ts';

const STORAGE_KEYS = {
  RESULTS: 'exambro_student_results_v1',
  QUESTIONS: 'exambro_custom_questions_v1',
  ACTIVE_STUDENT: 'exambro_current_student_v1',
  EXAM_CODES: 'exambro_exam_codes_v1',
  ACTIVE_TEACHER: 'exambro_active_teacher_v1',
};

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('exambro_channel');
  }
} catch {
  // fallback
}

export function loadAllQuestions(): Question[] {
  if (typeof window === 'undefined') return INITIAL_QUESTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!raw) {
      return INITIAL_QUESTIONS;
    }
    const custom: Question[] = JSON.parse(raw);
    return [...INITIAL_QUESTIONS, ...custom];
  } catch (err) {
    console.error('Error loading questions:', err);
    return INITIAL_QUESTIONS;
  }
}

export function saveCustomQuestions(newQuestions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const existing: Question[] = raw ? JSON.parse(raw) : [];
    const merged = [...existing, ...newQuestions];
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('exambro:questions_updated', { detail: merged }));
    broadcastChannel?.postMessage({ type: 'QUESTIONS_UPDATED' });

    // Sync to Firestore cloud database in real-time
    saveQuestionsToFirestore(newQuestions).catch((e) => {
      console.warn('Firestore cloud sync for questions fallback:', e);
    });
  } catch (err) {
    console.error('Error saving custom questions:', err);
  }
}

export function deleteCustomQuestion(questionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!raw) return;
    const existing: Question[] = JSON.parse(raw);
    const filtered = existing.filter((q) => q.id !== questionId);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('exambro:questions_updated'));
    broadcastChannel?.postMessage({ type: 'QUESTIONS_UPDATED' });

    // Delete from Firestore
    deleteQuestionFromFirestore(questionId).catch((e) => {
      console.warn('Firestore cloud delete error:', e);
    });
  } catch (err) {
    console.error('Error deleting question:', err);
  }
}

export function loadAllResults(): ExamResult[] {
  if (typeof window === 'undefined') return INITIAL_STUDENT_RESULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESULTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_STUDENT_RESULTS));
      return INITIAL_STUDENT_RESULTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading results:', err);
    return INITIAL_STUDENT_RESULTS;
  }
}

export function saveStudentResult(result: ExamResult): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadAllResults();
    const updated = [result, ...current.filter((r) => r.id !== result.id)];
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('exambro:results_updated', { detail: result }));
    broadcastChannel?.postMessage({ type: 'RESULT_ADDED', payload: result });

    // Sync to Firestore real-time cloud database
    saveResultToFirestore(result).catch((e) => {
      console.warn('Firestore cloud sync for student result fallback:', e);
    });
  } catch (err) {
    console.error('Error saving result:', err);
  }
}

export function syncFirestoreResultsToLocal(firestoreResults: ExamResult[]): void {
  if (typeof window === 'undefined' || !firestoreResults.length) return;
  try {
    const current = loadAllResults();
    const map = new Map<string, ExamResult>();
    // Add existing
    current.forEach((r) => map.set(r.id, r));
    // Overwrite with Firestore real-time results
    firestoreResults.forEach((r) => map.set(r.id, r));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('exambro:results_updated'));
  } catch (err) {
    console.error('Error merging Firestore results:', err);
  }
}

export function syncFirestoreQuestionsToLocal(firestoreQuestions: Question[]): void {
  if (typeof window === 'undefined' || !firestoreQuestions.length) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    const existing: Question[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, Question>();
    existing.forEach((q) => map.set(q.id, q));
    firestoreQuestions.forEach((q) => map.set(q.id, q));

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('exambro:questions_updated'));
  } catch (err) {
    console.error('Error merging Firestore questions:', err);
  }
}

export function clearAllResults(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_STUDENT_RESULTS));
    window.dispatchEvent(new CustomEvent('exambro:results_updated'));
    broadcastChannel?.postMessage({ type: 'RESULTS_RESET' });
  } catch (err) {
    console.error('Error resetting results:', err);
  }
}

export function saveActiveStudent(student: StudentProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (student) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT, JSON.stringify(student));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT);
    }
  } catch (err) {
    console.error('Error saving active student:', err);
  }
}

export function loadActiveStudent(): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadAllExamCodes(): ExamCode[] {
  if (typeof window === 'undefined') return INITIAL_EXAM_CODES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_CODES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXAM_CODES, JSON.stringify(INITIAL_EXAM_CODES));
      return INITIAL_EXAM_CODES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading exam codes:', err);
    return INITIAL_EXAM_CODES;
  }
}

export function saveExamCode(code: ExamCode): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadAllExamCodes();
    const updated = [code, ...current.filter((c) => c.id !== code.id && c.code.toUpperCase() !== code.code.toUpperCase())];
    localStorage.setItem(STORAGE_KEYS.EXAM_CODES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('exambro:codes_updated', { detail: code }));
    broadcastChannel?.postMessage({ type: 'CODE_SAVED', payload: code });

    // Sync to Firestore
    saveExamCodeToFirestore(code).catch((e) => {
      console.warn('Firestore cloud sync for exam code fallback:', e);
    });
  } catch (err) {
    console.error('Error saving exam code:', err);
  }
}

export function deleteExamCode(codeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadAllExamCodes();
    const updated = current.filter((c) => c.id !== codeId);
    localStorage.setItem(STORAGE_KEYS.EXAM_CODES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('exambro:codes_updated'));
    broadcastChannel?.postMessage({ type: 'CODE_DELETED', payload: codeId });

    // Sync to Firestore
    deleteExamCodeFromFirestore(codeId).catch((e) => {
      console.warn('Firestore cloud delete exam code error:', e);
    });
  } catch (err) {
    console.error('Error deleting exam code:', err);
  }
}

export function syncFirestoreExamCodesToLocal(firestoreCodes: ExamCode[]): void {
  if (typeof window === 'undefined' || !firestoreCodes.length) return;
  try {
    const current = loadAllExamCodes();
    const map = new Map<string, ExamCode>();
    current.forEach((c) => map.set(c.id, c));
    firestoreCodes.forEach((c) => map.set(c.id, c));

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.EXAM_CODES, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('exambro:codes_updated'));
  } catch (err) {
    console.error('Error merging Firestore exam codes:', err);
  }
}

export function saveActiveTeacher(teacher: TeacherProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (teacher) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TEACHER, JSON.stringify(teacher));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TEACHER);
    }
  } catch (err) {
    console.error('Error saving active teacher:', err);
  }
}

export function loadActiveTeacher(): TeacherProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_TEACHER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function subscribeToRealtimeUpdates(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => onUpdate();
  const handleStorageEvent = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEYS.RESULTS || 
      e.key === STORAGE_KEYS.QUESTIONS || 
      e.key === STORAGE_KEYS.EXAM_CODES
    ) {
      onUpdate();
    }
  };

  const handleBroadcast = () => {
    onUpdate();
  };

  window.addEventListener('exambro:results_updated', handleCustomEvent);
  window.addEventListener('exambro:questions_updated', handleCustomEvent);
  window.addEventListener('exambro:codes_updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  broadcastChannel?.addEventListener('message', handleBroadcast);

  // Attach Firestore cloud listeners for real-time sync across any device!
  const unsubFirestoreResults = subscribeToFirestoreResults((cloudResults) => {
    syncFirestoreResultsToLocal(cloudResults);
    onUpdate();
  });

  const unsubFirestoreQuestions = subscribeToFirestoreQuestions((cloudQuestions) => {
    syncFirestoreQuestionsToLocal(cloudQuestions);
    onUpdate();
  });

  const unsubFirestoreExamCodes = subscribeToFirestoreExamCodes((cloudCodes) => {
    syncFirestoreExamCodesToLocal(cloudCodes);
    onUpdate();
  });

  return () => {
    window.removeEventListener('exambro:results_updated', handleCustomEvent);
    window.removeEventListener('exambro:questions_updated', handleCustomEvent);
    window.removeEventListener('exambro:codes_updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    broadcastChannel?.removeEventListener('message', handleBroadcast);
    unsubFirestoreResults();
    unsubFirestoreQuestions();
    unsubFirestoreExamCodes();
  };
}

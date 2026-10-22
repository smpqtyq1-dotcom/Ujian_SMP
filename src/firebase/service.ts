import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  getDocFromServer 
} from 'firebase/firestore';
import { db, auth } from './config.ts';
import { ExamResult, Question } from '../types/quiz.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline fallback active.');
    }
    return false;
  }
}

/**
 * Real-time listener for student quiz results in Firestore
 */
export function subscribeToFirestoreResults(
  onResultsChanged: (results: ExamResult[]) => void
): () => void {
  const collectionPath = 'studentResults';

  try {
    const unsub = onSnapshot(
      collection(db, collectionPath),
      (snapshot) => {
        const list: ExamResult[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as ExamResult);
        });
        // Sort descending by completion time
        list.sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        onResultsChanged(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );

    return unsub;
  } catch (error) {
    console.error('Error attaching firestore listener:', error);
    return () => {};
  }
}

function cleanDataForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value === undefined) return null;
      return value;
    })
  );
}

/**
 * Save student test result to Firestore
 */
export async function saveResultToFirestore(result: ExamResult): Promise<void> {
  const path = `studentResults/${result.id}`;
  try {
    const rawPayload = {
      id: result.id,
      studentName: result.studentName,
      studentClass: result.studentClass,
      nisn: result.nisn || '',
      subjectId: result.subjectId,
      subjectName: result.subjectName,
      score: result.score,
      passed: result.passed,
      kkm: result.kkm,
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      unansweredCount: result.unansweredCount,
      accuracy: result.accuracy,
      durationSeconds: result.durationSeconds,
      completedAt: result.completedAt,
      detailedAnalysis: (result.detailedAnalysis || []).map((d) => ({
        ...d,
        selectedAnswer: d.selectedAnswer || null,
      })),
      badges: result.badges || [],
    };

    const payload = cleanDataForFirestore(rawPayload);
    await setDoc(doc(db, 'studentResults', result.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Real-time listener for custom question bank in Firestore
 */
export function subscribeToFirestoreQuestions(
  onQuestionsChanged: (questions: Question[]) => void
): () => void {
  const collectionPath = 'customQuestions';

  try {
    const unsub = onSnapshot(
      collection(db, collectionPath),
      (snapshot) => {
        const list: Question[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Question);
        });
        onQuestionsChanged(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );

    return unsub;
  } catch (error) {
    console.error('Error attaching questions listener:', error);
    return () => {};
  }
}

/**
 * Save custom questions (bulk or manual) to Firestore
 */
export async function saveQuestionsToFirestore(questions: Question[]): Promise<void> {
  for (const q of questions) {
    const path = `customQuestions/${q.id}`;
    try {
      const payload = cleanDataForFirestore(q);
      await setDoc(doc(db, 'customQuestions', q.id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

/**
 * Delete a question from Firestore
 */
export async function deleteQuestionFromFirestore(questionId: string): Promise<void> {
  const path = `customQuestions/${questionId}`;
  try {
    await deleteDoc(doc(db, 'customQuestions', questionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for Exam Codes in Firestore
 */
export function subscribeToFirestoreExamCodes(
  onCodesChanged: (codes: any[]) => void
): () => void {
  const collectionPath = 'examCodes';

  try {
    const unsub = onSnapshot(
      collection(db, collectionPath),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((d) => {
          list.push(d.data());
        });
        onCodesChanged(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, collectionPath);
      }
    );

    return unsub;
  } catch (error) {
    console.error('Error attaching exam codes listener:', error);
    return () => {};
  }
}

/**
 * Save or update Exam Code in Firestore
 */
export async function saveExamCodeToFirestore(codeData: any): Promise<void> {
  const path = `examCodes/${codeData.id}`;
  try {
    const payload = cleanDataForFirestore(codeData);
    await setDoc(doc(db, 'examCodes', codeData.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete Exam Code from Firestore
 */
export async function deleteExamCodeFromFirestore(codeId: string): Promise<void> {
  const path = `examCodes/${codeId}`;
  try {
    await deleteDoc(doc(db, 'examCodes', codeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


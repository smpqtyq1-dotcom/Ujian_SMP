import { ExamCode, TeacherProfile } from '../types/quiz.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => ({}));
  if (!isRecord(body)) throw new Error('Respons server tidak valid.');
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Permintaan gagal diproses.');
  }
  return body;
}

function parseTeacherProfile(value: unknown): TeacherProfile {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.subject !== 'string'
  ) {
    throw new Error('Data akun guru dari server tidak valid.');
  }
  return {
    id: value.id,
    name: value.name,
    subject: value.subject,
    schoolName: typeof value.schoolName === 'string' ? value.schoolName : undefined,
  };
}

function parseExamCode(value: unknown): ExamCode {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.code !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.subjectId !== 'string' ||
    typeof value.subjectName !== 'string' ||
    (value.grade !== 'Kelas 7' && value.grade !== 'Kelas 8' && value.grade !== 'Kelas 9') ||
    typeof value.durationMinutes !== 'number' ||
    typeof value.kkm !== 'number' ||
    typeof value.questionCount !== 'number' ||
    typeof value.createdAt !== 'string' ||
    typeof value.isActive !== 'boolean'
  ) {
    throw new Error('Data kode ujian dari server tidak valid.');
  }
  return {
    id: value.id,
    code: value.code,
    title: value.title,
    subjectId: value.subjectId,
    subjectName: value.subjectName,
    grade: value.grade,
    durationMinutes: value.durationMinutes,
    kkm: value.kkm,
    questionCount: value.questionCount,
    questionIds: Array.isArray(value.questionIds)
      ? value.questionIds.filter((id): id is string => typeof id === 'string')
      : undefined,
    createdByName: typeof value.createdByName === 'string' ? value.createdByName : 'Guru',
    createdByNiy: typeof value.createdByNiy === 'string' ? value.createdByNiy : undefined,
    createdAt: value.createdAt,
    isActive: value.isActive,
  };
}

export async function validateStudentExamCode(code: string): Promise<ExamCode> {
  const response = await fetch('/api/student/validate-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await readResponse(response);
  return parseExamCode(data.examCode);
}

export interface StudentRosterEntry {
  id: string;
  name: string;
  studentClass: string;
}

export async function loadStudentRoster(
  studentClass: string,
  examCode: string,
  signal?: AbortSignal
): Promise<StudentRosterEntry[]> {
  const params = new URLSearchParams({ class: studentClass, code: examCode });
  const response = await fetch(`/api/student/roster?${params}`, { signal });
  const data = await readResponse(response);
  if (!Array.isArray(data.students)) throw new Error('Daftar siswa dari server tidak valid.');
  return data.students.map((value): StudentRosterEntry => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.name !== 'string' ||
      typeof value.studentClass !== 'string' ||
      value.studentClass !== studentClass
    ) {
      throw new Error('Data siswa dari server tidak valid.');
    }
    return { id: value.id, name: value.name, studentClass: value.studentClass };
  });
}

export async function loginTeacher(niy: string): Promise<TeacherProfile> {
  const response = await fetch('/api/teacher/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ niy }),
  });
  const data = await readResponse(response);
  return parseTeacherProfile(data.teacher);
}

export async function getTeacherSession(): Promise<TeacherProfile | null> {
  const response = await fetch('/api/teacher/session', { credentials: 'include' });
  if (response.status === 401) return null;
  const data = await readResponse(response);
  return parseTeacherProfile(data.teacher);
}

export async function logoutTeacher(): Promise<void> {
  const response = await fetch('/api/teacher/logout', {
    method: 'POST',
    credentials: 'include',
  });
  await readResponse(response);
}

export async function loadTeacherExamCodes(): Promise<ExamCode[]> {
  const response = await fetch('/api/teacher/exam-codes', { credentials: 'include' });
  const data = await readResponse(response);
  if (!Array.isArray(data.examCodes)) throw new Error('Daftar kode ujian dari server tidak valid.');
  return data.examCodes.map(parseExamCode);
}

export async function saveTeacherExamCode(code: ExamCode): Promise<ExamCode> {
  const response = await fetch('/api/teacher/exam-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(code),
  });
  const data = await readResponse(response);
  return parseExamCode(data.examCode);
}

export async function deleteTeacherExamCode(codeId: string): Promise<void> {
  const response = await fetch(`/api/teacher/exam-codes/${encodeURIComponent(codeId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await readResponse(response);
}

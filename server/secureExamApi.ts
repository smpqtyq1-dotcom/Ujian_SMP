import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ExamCode, TeacherProfile } from '../src/types/quiz.ts';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

interface ServerTeacher extends TeacherProfile {
  niy: string;
}

interface ApiEnvironment {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  FIRESTORE_DATABASE_ID?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  SESSION_SECRET?: string;
  TEACHER_NIY_ACCOUNTS?: string;
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const SESSION_COOKIE = 'exambro_teacher_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const MAX_REQUEST_BYTES = 32_000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
let firestore: Firestore | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk: Buffer | string) => {
      if (tooLarge) return;
      body += chunk.toString();
      if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) tooLarge = true;
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(new ApiError(413, 'Data permintaan terlalu besar.'));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(body || '{}');
        if (!isRecord(parsed)) {
          throw new ApiError(400, 'Format permintaan tidak valid.');
        }
        resolve(parsed);
      } catch (error) {
        reject(error instanceof ApiError ? error : new ApiError(400, 'Format JSON tidak valid.'));
      }
    });
    req.on('error', reject);
  });
}

function getEnvironmentTeachers(env: ApiEnvironment): ServerTeacher[] {
  if (!env.TEACHER_NIY_ACCOUNTS) {
    throw new ApiError(503, 'Autentikasi guru belum dikonfigurasi.');
  }
  let accounts: unknown;
  try {
    accounts = JSON.parse(env.TEACHER_NIY_ACCOUNTS);
  } catch {
    throw new ApiError(503, 'Konfigurasi autentikasi guru tidak valid.');
  }
  if (!Array.isArray(accounts)) {
    throw new ApiError(503, 'Konfigurasi autentikasi guru tidak valid.');
  }

  const teachers = accounts.filter((account): account is ServerTeacher => {
    return Boolean(
      account &&
      typeof account === 'object' &&
      typeof account.id === 'string' &&
      typeof account.name === 'string' &&
      typeof account.subject === 'string' &&
      typeof account.niy === 'string'
    );
  });
  if (!teachers.length) throw new ApiError(503, 'Belum ada akun guru yang dikonfigurasi.');
  return teachers;
}

function getSessionSecret(env: ApiEnvironment): string {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new ApiError(503, 'Secret sesi server belum dikonfigurasi.');
  }
  return env.SESSION_SECRET;
}

function getDatabase(env: ApiEnvironment): Firestore {
  if (firestore) return firestore;
  const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credentialFile = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccount && !credentialFile) {
    throw new ApiError(503, 'Kredensial Firebase Admin belum dikonfigurasi di server.');
  }

  const projectId = env.FIREBASE_PROJECT_ID || 'glassy-design-vbcxw';
  const existingApp = getApps()[0];
  if (!existingApp) {
    let credential;
    if (serviceAccount) {
      try {
        const parsed: unknown = JSON.parse(serviceAccount);
        if (!isRecord(parsed)) throw new Error();
        const account = parsed;
        const accountProjectId = account.project_id ?? account.projectId;
        const clientEmail = account.client_email ?? account.clientEmail;
        const privateKey = account.private_key ?? account.privateKey;
        if (
          typeof accountProjectId !== 'string' ||
          typeof clientEmail !== 'string' ||
          typeof privateKey !== 'string'
        ) {
          throw new Error();
        }
        credential = cert({ projectId: accountProjectId, clientEmail, privateKey });
      } catch {
        throw new ApiError(503, 'JSON kredensial Firebase Admin tidak valid.');
      }
    } else {
      credential = applicationDefault();
    }
    initializeApp({ credential, projectId });
  }

  firestore = getFirestore(
    getApps()[0],
    env.FIRESTORE_DATABASE_ID || 'ai-studio-exambrosmpeducbt-2b9249d4-bf7b-438a-9adb-08aed020af87'
  );
  return firestore;
}

function normalizeNiy(value: string): string {
  return value.replace(/[\s-]/g, '');
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(teacherId: string, secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({ teacherId, expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000 })
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getTeacherFromRequest(
  req: IncomingMessage,
  env: ApiEnvironment
): TeacherProfile {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = cookie?.slice(SESSION_COOKIE.length + 1);
  if (!token) throw new ApiError(401, 'Sesi guru tidak valid. Silakan masuk kembali.');

  const secret = getSessionSecret(env);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) throw new ApiError(401, 'Sesi guru tidak valid. Silakan masuk kembali.');
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (!secureEqual(signature, expected)) {
    throw new ApiError(401, 'Sesi guru tidak valid. Silakan masuk kembali.');
  }

  let tokenData: { teacherId?: unknown; expiresAt?: unknown };
  try {
    tokenData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new ApiError(401, 'Sesi guru tidak valid. Silakan masuk kembali.');
  }
  if (typeof tokenData.teacherId !== 'string' || typeof tokenData.expiresAt !== 'number' || tokenData.expiresAt < Date.now()) {
    throw new ApiError(401, 'Sesi guru sudah berakhir. Silakan masuk kembali.');
  }

  const teacher = getEnvironmentTeachers(env).find((entry) => entry.id === tokenData.teacherId);
  if (!teacher) throw new ApiError(401, 'Akun guru tidak lagi terdaftar. Silakan masuk kembali.');
  return toPublicTeacherProfile(teacher);
}

function toPublicTeacherProfile(teacher: ServerTeacher): TeacherProfile {
  return {
    id: teacher.id,
    name: teacher.name,
    subject: teacher.subject,
    schoolName: teacher.schoolName,
  };
}

function setSessionCookie(res: ServerResponse, token: string, secure: boolean): void {
  const secureAttribute = secure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secureAttribute}`
  );
}

function clearSessionCookie(res: ServerResponse, secure: boolean): void {
  const secureAttribute = secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureAttribute}`);
}

function isSecureRequest(req: IncomingMessage): boolean {
  const forwardedProtocol = req.headers['x-forwarded-proto'];
  return typeof forwardedProtocol === 'string' &&
    forwardedProtocol.split(',')[0].trim() === 'https';
}

function rateLimitLogin(req: IncomingMessage): void {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  current.count += 1;
  if (current.count > 8) throw new ApiError(429, 'Terlalu banyak percobaan. Coba lagi 15 menit kemudian.');
}

function safeExamCode(code: ExamCode): Omit<ExamCode, 'createdByName' | 'createdByNiy'> & {
  createdByName?: string;
  createdByNiy?: string;
} {
  const { createdByNiy: _createdByNiy, createdByName: _createdByName, ...safeCode } = code;
  return safeCode;
}

function handleError(res: ServerResponse, error: unknown, context: string): void {
  if (error instanceof ApiError) {
    sendJson(res, error.status, { error: error.message });
    return;
  }
  console.error(`${context}:`, error);
  sendJson(res, 500, { error: 'Layanan sedang mengalami kendala. Coba kembali.' });
}

export function secureExamApiPlugin(env: ApiEnvironment): Plugin {
  const installRoutes = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/api/teacher/login', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      try {
        rateLimitLogin(req);
        const body = await readJsonBody(req);
        const niy = typeof body.niy === 'string' ? normalizeNiy(body.niy) : '';
        if (!niy) throw new ApiError(400, 'Masukkan NIY guru.');
        const teacher = getEnvironmentTeachers(env).find((entry) =>
          secureEqual(normalizeNiy(entry.niy), niy)
        );
        if (!teacher) throw new ApiError(401, 'NIY tidak terdaftar.');

        loginAttempts.delete(req.socket.remoteAddress || 'unknown');
        setSessionCookie(res, createSessionToken(teacher.id, getSessionSecret(env)), isSecureRequest(req));
        sendJson(res, 200, { teacher: toPublicTeacherProfile(teacher) });
      } catch (error) {
        handleError(res, error, 'Teacher login error');
      }
    });

    server.middlewares.use('/api/teacher/session', (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      try {
        sendJson(res, 200, { teacher: getTeacherFromRequest(req, env) });
      } catch (error) {
        handleError(res, error, 'Teacher session error');
      }
    });

    server.middlewares.use('/api/teacher/logout', (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      clearSessionCookie(res, isSecureRequest(req));
      sendJson(res, 200, { ok: true });
    });

    server.middlewares.use('/api/teacher/exam-codes', async (req, res) => {
      try {
        const teacher = getTeacherFromRequest(req, env);
        if (req.method === 'GET') {
          const snapshot = await getDatabase(env).collection('examCodes').get();
          const codes = snapshot.docs.map((document) =>
            safeExamCode(document.data() as ExamCode)
          );
          sendJson(res, 200, { examCodes: codes });
          return;
        }

        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const code = validateNewExamCode(body, teacher);
          const database = getDatabase(env);
          const duplicate = await database.collection('examCodes')
            .where('code', '==', code.code)
            .limit(1)
            .get();
          if (!duplicate.empty) throw new ApiError(409, 'Kode ujian sudah digunakan.');
          await database.collection('examCodes').doc(code.id).create(code);
          sendJson(res, 201, { examCode: safeExamCode(code) });
          return;
        }

        if (req.method === 'DELETE') {
          const codeId = decodeURIComponent(req.url?.split('?')[0]?.replace(/^\/+/, '') || '');
          if (!/^[a-zA-Z0-9_-]{1,128}$/.test(codeId)) {
            throw new ApiError(400, 'Kode ujian tidak valid.');
          }
          await getDatabase(env).collection('examCodes').doc(codeId).delete();
          sendJson(res, 200, { ok: true });
          return;
        }

        sendJson(res, 405, { error: 'Method Not Allowed' });
      } catch (error) {
        handleError(res, error, 'Teacher exam code operation error');
      }
    });

    server.middlewares.use('/api/student/validate-exam', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
        if (!code || code.length > 40) throw new ApiError(400, 'Masukkan kode ujian.');
        const snapshot = await getDatabase(env).collection('examCodes')
          .where('code', '==', code)
          .where('isActive', '==', true)
          .limit(1)
          .get();
        if (snapshot.empty) throw new ApiError(404, 'Kode ujian tidak ditemukan atau tidak aktif.');
        const examCode = safeExamCode(snapshot.docs[0].data() as ExamCode);
        sendJson(res, 200, { examCode });
      } catch (error) {
        handleError(res, error, 'Student exam code validation error');
      }
    });
  };

  return {
    name: 'secure-exam-api',
    configureServer: installRoutes,
    configurePreviewServer: installRoutes,
  };
}

function validateNewExamCode(
  body: Record<string, unknown>,
  teacher: TeacherProfile
): ExamCode {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const subjectId = typeof body.subjectId === 'string' ? body.subjectId.trim() : '';
  const subjectName = typeof body.subjectName === 'string' ? body.subjectName.trim() : '';
  const grade = body.grade;
  const durationMinutes = Number(body.durationMinutes);
  const kkm = Number(body.kkm);
  const questionCount = Number(body.questionCount);

  if (!/^[A-Z0-9-]{3,40}$/.test(code)) throw new ApiError(400, 'Format kode ujian tidak valid.');
  if (!title || title.length > 150) throw new ApiError(400, 'Judul ujian tidak valid.');
  if (!subjectId || subjectId.length > 80 || !subjectName || subjectName.length > 100) {
    throw new ApiError(400, 'Mata pelajaran tidak valid.');
  }
  if (grade !== 'Kelas 7' && grade !== 'Kelas 8' && grade !== 'Kelas 9') {
    throw new ApiError(400, 'Tingkat kelas tidak valid.');
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 120) {
    throw new ApiError(400, 'Durasi ujian harus antara 5 dan 120 menit.');
  }
  if (!Number.isInteger(kkm) || kkm < 0 || kkm > 100) throw new ApiError(400, 'KKM tidak valid.');
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 200) {
    throw new ApiError(400, 'Jumlah soal tidak valid.');
  }

  return {
    id: randomUUID(),
    code,
    title,
    subjectId,
    subjectName,
    grade,
    durationMinutes,
    kkm,
    questionCount,
    createdByName: teacher.name,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
}

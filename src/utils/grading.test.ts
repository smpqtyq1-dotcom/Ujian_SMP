import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExamScore, determineBadges, formatTime } from './grading.ts';
import { Question } from '../types/quiz.ts';

const mockQuestions: Question[] = [
  {
    id: 'q1',
    subjectId: 'matematika',
    subjectName: 'Matematika',
    grade: 'Kelas 8',
    topic: 'Aljabar',
    questionText: 'Berapakah 2x + 3 = 7, nilai x adalah?',
    options: { A: '1', B: '2', C: '3', D: '4' },
    correctAnswer: 'B',
    explanation: '2x = 4 maka x = 2.',
    difficulty: 'Mudah',
  },
  {
    id: 'q2',
    subjectId: 'matematika',
    subjectName: 'Matematika',
    grade: 'Kelas 8',
    topic: 'Aljabar',
    questionText: 'Berapakah 3 + 5?',
    options: { A: '7', B: '8', C: '9', D: '10' },
    correctAnswer: 'B',
    explanation: '3 + 5 = 8.',
    difficulty: 'Mudah',
  },
  {
    id: 'q3',
    subjectId: 'matematika',
    subjectName: 'Matematika',
    grade: 'Kelas 8',
    topic: 'Geometri',
    questionText: 'Jumlah sudut dalam segitiga adalah?',
    options: { A: '90 derajat', B: '180 derajat', C: '270 derajat', D: '360 derajat' },
    correctAnswer: 'B',
    explanation: 'Total sudut segitiga selalu 180 derajat.',
    difficulty: 'Mudah',
  },
  {
    id: 'q4',
    subjectId: 'matematika',
    subjectName: 'Matematika',
    grade: 'Kelas 8',
    topic: 'Geometri',
    questionText: 'Rumus luas persegi panjang adalah?',
    options: { A: 'p x l', B: 's x s', C: '1/2 x a x t', D: '2 x (p+l)' },
    correctAnswer: 'A',
    explanation: 'Luas persegi panjang = panjang x lebar.',
    difficulty: 'Mudah',
  },
];

test('calculateExamScore gives 100 for all correct answers', () => {
  const answers = { q1: 'B' as const, q2: 'B' as const, q3: 'B' as const, q4: 'A' as const };
  const res = calculateExamScore(mockQuestions, answers);
  assert.equal(res.score, 100);
  assert.equal(res.correctCount, 4);
  assert.equal(res.wrongCount, 0);
  assert.equal(res.unansweredCount, 0);
  assert.equal(res.accuracy, 100);
});

test('calculateExamScore handles partial scores and unanswered questions', () => {
  const answers = { q1: 'B' as const, q2: 'A' as const }; // q1 correct, q2 wrong, q3 & q4 empty
  const res = calculateExamScore(mockQuestions, answers);
  assert.equal(res.score, 25);
  assert.equal(res.correctCount, 1);
  assert.equal(res.wrongCount, 1);
  assert.equal(res.unansweredCount, 2);
  assert.equal(res.accuracy, 25);
});

test('determineBadges awards Perfect Score badge when score is 100', () => {
  const badges = determineBadges(100, 100, 60, 4);
  const hasPerfect = badges.some((b) => b.id === 'perfect-score');
  assert.equal(hasPerfect, true);
});

test('determineBadges awards Speed Demon when fast and passing', () => {
  const badges = determineBadges(80, 80, 40, 4); // 10s per q < 35s
  const hasSpeed = badges.some((b) => b.id === 'speed-demon');
  assert.equal(hasSpeed, true);
});

test('formatTime correctly formats minutes and seconds', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(600), '10:00');
});

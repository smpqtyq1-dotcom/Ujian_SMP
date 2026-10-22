import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionsFromCSV, generateCSVTemplate } from './csvParser.ts';

test('parseQuestionsFromCSV parses standard CSV formatted questions', () => {
  const csv = `Pertanyaan,Pilihan_A,Pilihan_B,Pilihan_C,Pilihan_D,Kunci_Jawaban,Topik,Pembahasan
Berapa 10 + 10?,15,20,25,30,B,Aritmatika,10 tambah 10 adalah 20
Siapakah penemu bola lampu?,Einstein,Thomas Edison,Newton,Tesla,B,Fisika,Thomas Edison menemukan bola lampu komersil`;

  const result = parseQuestionsFromCSV(csv, 'ipa', 'IPA', 'Kelas 8');
  assert.equal(result.errors.length, 0);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].correctAnswer, 'B');
  assert.equal(result.questions[0].options.B, '20');
  assert.equal(result.questions[1].questionText, 'Siapakah penemu bola lampu?');
  assert.equal(result.questions[1].correctAnswer, 'B');
});

test('parseQuestionsFromCSV handles semicolon delimiter and quoted text', () => {
  const csv = `Pertanyaan;Pilihan_A;Pilihan_B;Pilihan_C;Pilihan_D;Kunci_Jawaban;Topik;Pembahasan
"Jika a = 2, b = 3, maka a x b adalah...";5;6;7;8;B;Aljabar;2 dikali 3 = 6`;

  const result = parseQuestionsFromCSV(csv, 'matematika', 'Matematika', 'Kelas 7');
  assert.equal(result.errors.length, 0);
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].options.B, '6');
  assert.equal(result.questions[0].correctAnswer, 'B');
});

test('parseQuestionsFromCSV reports error on invalid answer key', () => {
  const csv = `Pertanyaan,Pilihan_A,Pilihan_B,Pilihan_C,Pilihan_D,Kunci_Jawaban
Berapa 5 x 5?,20,25,30,35,Z`;

  const result = parseQuestionsFromCSV(csv);
  assert.equal(result.questions.length, 0);
  assert.equal(result.errors.length > 0, true);
  assert.match(result.errors[0], /Kunci jawaban "Z" tidak valid/);
});

test('generateCSVTemplate produces valid parseable template', () => {
  const template = generateCSVTemplate();
  assert.ok(template.length > 50);
  const parsed = parseQuestionsFromCSV(template);
  assert.equal(parsed.errors.length, 0);
  assert.ok(parsed.questions.length >= 4);
});

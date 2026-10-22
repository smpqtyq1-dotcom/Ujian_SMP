import { OptionKey, Question } from '../types/quiz.ts';

export interface ParseResult {
  questions: Question[];
  errors: string[];
  warnings: string[];
  totalParsed: number;
}

/**
 * Splits CSV lines while respecting quoted fields containing newlines or commas
 */
function parseCSVRows(csvText: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseQuestionsFromCSV(
  rawContent: string,
  fallbackSubjectId: string = 'matematika',
  fallbackSubjectName: string = 'Matematika',
  fallbackGrade: 'Kelas 7' | 'Kelas 8' | 'Kelas 9' | 'Semua Kelas' = 'Kelas 8'
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const questions: Question[] = [];

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return {
      questions: [],
      errors: ['File CSV kosong atau tidak memiliki data.'],
      warnings: [],
      totalParsed: 0,
    };
  }

  // Detect delimiter (comma vs semicolon vs tab)
  const firstLine = trimmed.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const rows = parseCSVRows(trimmed, delimiter);
  if (rows.length < 2) {
    return {
      questions: [],
      errors: ['File harus memiliki baris judul (header) dan minimal 1 baris soal.'],
      warnings: [],
      totalParsed: 0,
    };
  }

  const headerRow = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  
  // Find column indices
  const findIndex = (names: string[]) => {
    return headerRow.findIndex((h) => names.some((n) => h.includes(n.toLowerCase())));
  };

  const colQuestion = findIndex(['pertanyaan', 'soal', 'question', 'text']);
  const colA = findIndex(['pilihana', 'opsia', 'optiona', 'a']);
  const colB = findIndex(['pilihanb', 'opsib', 'optionb', 'b']);
  const colC = findIndex(['pilihanc', 'opsic', 'optionc', 'c']);
  const colD = findIndex(['pilihand', 'opsid', 'optiond', 'd']);
  const colKey = findIndex(['kuncijawaban', 'kunci', 'jawaban', 'answer', 'key']);
  const colSubject = findIndex(['matapelajaran', 'mapel', 'subject']);
  const colGrade = findIndex(['kelas', 'grade', 'tingkat']);
  const colTopic = findIndex(['topik', 'materi', 'bab', 'topic']);
  const colExplanation = findIndex(['pembahasan', 'penjelasan', 'explanation']);
  const colDifficulty = findIndex(['tingkatkesulitan', 'kesulitan', 'difficulty']);

  if (colQuestion === -1 || colA === -1 || colB === -1 || colC === -1 || colD === -1 || colKey === -1) {
    return {
      questions: [],
      errors: [
        'Format kolom tidak lengkap. Pastikan terdapat kolom: Pertanyaan, Pilihan_A, Pilihan_B, Pilihan_C, Pilihan_D, dan Kunci_Jawaban.',
      ],
      warnings: [],
      totalParsed: 0,
    };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Skip empty row
    if (!row || row.every((c) => !c.trim())) continue;

    const questionText = (row[colQuestion] || '').trim();
    const optA = (row[colA] || '').trim();
    const optB = (row[colB] || '').trim();
    const optC = (row[colC] || '').trim();
    const optD = (row[colD] || '').trim();
    const rawKey = (row[colKey] || '').trim().toUpperCase();

    if (!questionText) {
      errors.push(`Baris ${rowNum}: Teks pertanyaan tidak boleh kosong.`);
      continue;
    }

    if (!optA || !optB || !optC || !optD) {
      errors.push(`Baris ${rowNum}: Semua opsi jawaban (A, B, C, D) harus terisi.`);
      continue;
    }

    // Clean key (support "A", "Opsi A", "Pilihan A", "A.")
    let cleanKey: OptionKey | null = null;
    const match = rawKey.match(/^[ABCD]\b|[ABCD]$/);
    if (match) {
      cleanKey = match[0] as OptionKey;
    } else if (rawKey.startsWith('A')) cleanKey = 'A';
    else if (rawKey.startsWith('B')) cleanKey = 'B';
    else if (rawKey.startsWith('C')) cleanKey = 'C';
    else if (rawKey.startsWith('D')) cleanKey = 'D';

    if (!cleanKey || !['A', 'B', 'C', 'D'].includes(cleanKey)) {
      errors.push(`Baris ${rowNum}: Kunci jawaban "${rawKey}" tidak valid. Harus berupa A, B, C, atau D.`);
      continue;
    }

    const subjectStr = colSubject !== -1 && row[colSubject] ? row[colSubject].trim() : fallbackSubjectName;
    const subjectId = subjectStr.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    let gradeStr = fallbackGrade;
    if (colGrade !== -1 && row[colGrade]) {
      const g = row[colGrade].trim();
      if (g.includes('7')) gradeStr = 'Kelas 7';
      else if (g.includes('8')) gradeStr = 'Kelas 8';
      else if (g.includes('9')) gradeStr = 'Kelas 9';
    }

    const topic = colTopic !== -1 && row[colTopic] ? row[colTopic].trim() : 'Materi Pembelajaran';
    const explanation = colExplanation !== -1 && row[colExplanation] ? row[colExplanation].trim() : 'Tidak ada pembahasan khusus untuk soal ini.';
    
    let difficulty: 'Mudah' | 'Sedang' | 'Sulit' = 'Sedang';
    if (colDifficulty !== -1 && row[colDifficulty]) {
      const diff = row[colDifficulty].trim().toLowerCase();
      if (diff.includes('mudah') || diff.includes('easy')) difficulty = 'Mudah';
      else if (diff.includes('sulit') || diff.includes('hard')) difficulty = 'Sulit';
    }

    questions.push({
      id: `q-custom-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      subjectId,
      subjectName: subjectStr,
      grade: gradeStr,
      topic,
      questionText,
      options: {
        A: optA,
        B: optB,
        C: optC,
        D: optD,
      },
      correctAnswer: cleanKey,
      explanation,
      difficulty,
    });
  }

  return {
    questions,
    errors,
    warnings,
    totalParsed: questions.length,
  };
}

export function generateCSVTemplate(): string {
  const headers = [
    'Mata_Pelajaran',
    'Kelas',
    'Topik',
    'Pertanyaan',
    'Pilihan_A',
    'Pilihan_B',
    'Pilihan_C',
    'Pilihan_D',
    'Kunci_Jawaban',
    'Pembahasan',
    'Tingkat_Kesulitan',
  ];

  const sampleRows = [
    [
      'Matematika',
      'Kelas 8',
      'Teorema Pythagoras',
      'Panjang sisi miring segitiga siku-siku dengan sisi penyiku 6 cm dan 8 cm adalah...',
      '9 cm',
      '10 cm',
      '12 cm',
      '14 cm',
      'B',
      'Menggunakan rumus c² = a² + b² = 6² + 8² = 36 + 64 = 100, maka c = √100 = 10 cm.',
      'Mudah',
    ],
    [
      'IPA',
      'Kelas 8',
      'Sistem Peredaran Darah',
      'Bagian jantung yang berfungsi memompa darah kaya oksigen ke seluruh tubuh adalah...',
      'Serambi kanan',
      'Serambi kiri',
      'Bilik kanan',
      'Bilik kiri',
      'D',
      'Bilik kiri (ventrikel kiri) memiliki dinding paling tebal untuk memompa darah bersih ke seluruh tubuh via aorta.',
      'Sedang',
    ],
    [
      'Bahasa Indonesia',
      'Kelas 7',
      'Teks Laporan Hasil Observasi',
      'Struktur teks laporan hasil observasi secara umum terdiri atas...',
      'Pernyataan umum dan deskripsi bagian',
      'Orientasi, komplikasi, dan resolusi',
      'Tesis, argumen, dan penegasan ulang',
      'Tujuan, langkah-langkah, dan penutup',
      'A',
      'Teks LHO terdiri dari pernyataan umum (definisi) dan aspek yang dilaporkan (deskripsi bagian dan manfaat).',
      'Mudah',
    ],
    [
      'Bahasa Inggris',
      'Kelas 8',
      'Simple Past Tense',
      'She ... to the national library yesterday afternoon to borrow a science book.',
      'go',
      'goes',
      'went',
      'gone',
      'C',
      'Keterangan waktu "yesterday afternoon" menunjukkan Simple Past Tense, kata kerja kedua dari "go" adalah "went".',
      'Mudah',
    ],
    [
      'IPS',
      'Kelas 9',
      'Interaksi Antarruang ASEAN',
      'Negara pendiri ASEAN yang memiliki julukan Negeri Gajah Putih adalah...',
      'Filipina',
      'Malaysia',
      'Thailand',
      'Singapura',
      'C',
      'Thailand adalah salah satu dari 5 negara pendiri ASEAN tahun 1967 dan dijuluki Negeri Gajah Putih.',
      'Mudah',
    ],
  ];

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes(';')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.join(','),
    ...sampleRows.map((row) => row.map(escapeCSV).join(',')),
  ];

  return '\uFEFF' + csvLines.join('\r\n'); // Add UTF-8 BOM so Excel opens with proper Indonesian accented characters
}

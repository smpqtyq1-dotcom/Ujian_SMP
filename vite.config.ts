import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/ai/generate-questions', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ questions: [] }));
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Anda adalah Guru Ahli Kurikulum SMP Indonesia.
Buatkan ${data.questionCount || 5} butir soal pilihan ganda (A, B, C, D) berkualitas tinggi untuk:
- Mata Pelajaran: ${data.subjectName}
- Tingkat: ${data.grade}
- Topik/Materi: ${data.topic || 'Umum'}
- Tingkat Kesulitan: ${data.difficulty || 'Sedang'}

Format respons HARUS berupa array JSON valid tanpa markdown backtick:
[
  {
    "questionText": "Teks pertanyaan jelas dan lugas...",
    "options": {
      "A": "Pilihan A",
      "B": "Pilihan B",
      "C": "Pilihan C",
      "D": "Pilihan D"
    },
    "correctAnswer": "A",
    "explanation": "Pembahasan konsep edukatif yang mendalam..."
  }
]`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            const text = response.text || '[]';
            const parsed = JSON.parse(text);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ questions: parsed }));
          } catch (error) {
            console.error('Server AI generation error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ questions: [] }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

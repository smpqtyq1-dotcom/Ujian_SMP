import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 80_000;

export async function extractTextFromDocument(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file maksimal 20 MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  let text: string;

  if (extension === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = result.value;
  } else if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ('str' in item ? item.str : ''))
          .filter(Boolean)
          .join(' ')
      );
    }

    text = pages.join('\n');
  } else {
    throw new Error('Format file tidak didukung. Gunakan dokumen Word (.docx) atau PDF.');
  }

  const cleanedText = text.replace(/\u0000/g, '').trim();
  if (!cleanedText) {
    throw new Error('Teks tidak ditemukan. Pastikan PDF bukan hasil pindai gambar.');
  }
  if (cleanedText.length > MAX_EXTRACTED_CHARACTERS) {
    throw new Error('Isi dokumen terlalu panjang. Batasi hingga 80.000 karakter.');
  }

  return cleanedText;
}

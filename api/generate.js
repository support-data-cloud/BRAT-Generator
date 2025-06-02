import { createCanvas, registerFont } from 'canvas';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Cache untuk font yang sudah diunduh (path lokalnya)
const fontCache = new Map();
const FONT_FAMILY_NAME = 'CustomOnlineFont';

async function getFont(fontUrl) {
  if (fontCache.has(fontUrl)) {
    // Cek apakah file masih ada di tmp, jika tidak, unduh lagi
    const cachedPath = fontCache.get(fontUrl);
    if (fs.existsSync(cachedPath)) {
      return cachedPath;
    } else {
      fontCache.delete(fontUrl); // Hapus dari cache jika file hilang
    }
  }

  try {
    const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
    const fontBuffer = Buffer.from(response.data);

    // Simpan font ke direktori sementara Vercel (/tmp)
    const tempDir = os.tmpdir();
    // Buat nama file unik untuk menghindari konflik jika ada beberapa fontUrl berbeda
    const uniqueFileName = `font-${Date.now()}-${path.basename(new URL(fontUrl).pathname) || 'font.ttf'}`;
    const fontPath = path.join(tempDir, uniqueFileName);

    fs.writeFileSync(fontPath, fontBuffer);
    registerFont(fontPath, { family: FONT_FAMILY_NAME });
    fontCache.set(fontUrl, fontPath); // Simpan path ke cache
    console.log(`Font from ${fontUrl} registered as ${FONT_FAMILY_NAME} at ${fontPath}`);
    return fontPath;
  } catch (error) {
    console.error(`Failed to download or register font from ${fontUrl}:`, error.message);
    // Jika gagal, kita tidak bisa melanjutkan dengan font kustom
    throw new Error(`Gagal memuat font dari URL: ${fontUrl}. Detail: ${error.message}`);
  }
}

function getAdjustedFontSize(ctx, text, maxWidth, maxHeight, fontFamily) {
  let fontSize = Math.min(maxHeight * 0.7, maxWidth * 0.25); // Ukuran awal, bisa disesuaikan
  ctx.font = `${fontSize}px "${fontFamily}"`;

  while (ctx.measureText(text).width > maxWidth * 0.9 && fontSize > 10) {
    fontSize -= 1;
    ctx.font = `${fontSize}px "${fontFamily}"`;
  }
  return fontSize;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const {
        text = 'BRAT',
        bgColor = '#FFFFFF',
        textColor = '#000000',
        blur = 'no', // 'yes' or 'no'
        fontUrl = 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf', // Default font
        width = 600,
        height = 600,
      } = req.query;

      const canvasWidth = parseInt(width, 10);
      const canvasHeight = parseInt(height, 10);

      // Pastikan font sudah terdaftar sebelum membuat canvas
      // Ini akan mengunduh jika belum ada di cache atau file hilang
      try {
          await getFont(fontUrl);
      } catch (fontError) {
          // Jika font gagal dimuat dari URL, kirim error yang jelas
          return res.status(500).json({ error: fontError.message });
      }


      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // 1. Gambar background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 2. Atur properti teks
      // PENTING: Untuk font non-pixel, kita ingin anti-aliasing (smoothing) aktif agar teks halus
      ctx.imageSmoothingEnabled = true;
      ctx.textRendering = 'optimizeLegibility'; // Dapat meningkatkan kualitas render teks

      const cleanText = text.toUpperCase();
      const fontSize = getAdjustedFontSize(ctx, cleanText, canvasWidth, canvasHeight, FONT_FAMILY_NAME);
      ctx.font = `${fontSize}px "${FONT_FAMILY_NAME}"`; // Gunakan nama family yang sudah diregister
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const x = canvasWidth / 2;
      const y = canvasHeight / 2;

      // 3. Efek "Burik" (Blur Sangat Halus) jika diminta
      if (blur === 'yes') {
        ctx.fillStyle = textColor; // Warna utama teks
        // Gambar teks utama sedikit transparan sebagai dasar blur
        ctx.globalAlpha = 0.7; // Bisa disesuaikan
        ctx.fillText(cleanText, x, y);

        // Tambahkan "bayangan" sangat tipis dengan offset minimal untuk efek "burik"
        ctx.globalAlpha = 0.15; // Sangat transparan, sesuaikan untuk kehalusan
        ctx.fillText(cleanText, x + 1, y + 1); // Offset 1px
        // ctx.fillText(cleanText, x - 1, y - 1); // Opsional: offset ke arah lain

        ctx.globalAlpha = 1.0; // Kembalikan alpha normal
        // Gambar teks utama sekali lagi dengan solid untuk ketajaman di atas blur tipis
        // atau biarkan versi 0.7 alpha di atas jika ingin lebih soft. Untuk "burik", mungkin lebih baik sedikit kabur.
        // Untuk kesan lebih "tidak sempurna", kita bisa skip menggambar ulang teks utama dengan solid.
        // Cukup lapisan-lapisan tipis saja.
        // Jika ingin teks utama tetap jelas, gambar ulang dengan alpha 1.0:
        // ctx.fillStyle = textColor;
        // ctx.fillText(cleanText, x, y);

      } else {
        // Gambar teks normal tanpa efek
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 1.0;
        ctx.fillText(cleanText, x, y);
      }

      // 4. Kembalikan sebagai gambar PNG
      const dataUrl = canvas.toDataURL('image/png');
      res.status(200).json({ imageUrl: dataUrl });

    } catch (error) {
      console.error('Error generating image:', error);
      // Pastikan error dari font juga bisa sampai ke sini jika belum ditangani
      if (error.message.startsWith('Gagal memuat font')) {
          res.status(500).json({ error: error.message });
      } else {
          res.status(500).json({ error: 'Gagal membuat gambar.', details: error.message });
      }
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
        }

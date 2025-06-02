// pages/api/generate-cover.js
import { createCanvas, registerFont } from 'canvas';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';

const FONT_FAMILY_NAME = 'CustomDynamicFont'; // Nama keluarga font yang akan diregistrasi
const fontPathCache = new Map(); // Cache sederhana untuk path font yang sudah diunduh

async function ensureFontRegistered(fontUrl) {
  // Jika URL sama dan file masih ada di tmp, anggap sudah teregister (oleh instance yg sama)
  if (fontPathCache.has(fontUrl) && fs.existsSync(fontPathCache.get(fontUrl))) {
    try {
      // Coba register lagi untuk memastikan (beberapa kasus node-canvas butuh ini per request jika tidak global)
      // namun jika sudah teregister dengan nama yg sama, biasanya tidak masalah.
      // Untuk simplisitas, kita anggap jika path ada, sudah ok.
      // registerFont(fontPathCache.get(fontUrl), { family: FONT_FAMILY_NAME });
      return; // Font sudah diunduh dan (kemungkinan) teregister
    } catch (e) { /* Abaikan jika error register ulang */ }
  }

  try {
    const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
    const fontBuffer = Buffer.from(response.data);
    
    // Buat nama file unik di direktori /tmp Vercel
    const tempDir = os.tmpdir();
    const uniqueFileName = `font-${Buffer.from(fontUrl).toString('hex').slice(0,10)}-${Date.now()}.ttf`; // Nama lebih unik
    const localFontPath = path.join(tempDir, uniqueFileName);

    fs.writeFileSync(localFontPath, fontBuffer);
    registerFont(localFontPath, { family: FONT_FAMILY_NAME });
    
    fontPathCache.set(fontUrl, localFontPath); // Simpan path ke cache
    console.log(`Font from ${fontUrl} registered as ${FONT_FAMILY_NAME} at ${localFontPath}`);
  } catch (error) {
    console.error(`Error downloading/registering font from ${fontUrl}: ${error.message}`);
    throw new Error(`Gagal memuat font: ${fontUrl}. ${error.message}`);
  }
}

function getAdjustedFontSize(ctx, text, maxWidth, fontFamily) {
  let fontSize = maxWidth * 0.2; // Ukuran awal
  ctx.font = `${fontSize}px "${fontFamily}"`;
  while (ctx.measureText(text).width > maxWidth * 0.9 && fontSize > 10) {
    fontSize -= 1;
    ctx.font = `${fontSize}px "${fontFamily}"`;
  }
  return fontSize;
}

export default async function handler(req, res) {
  try {
    const {
      text = 'BRAT',
      bgColor = '#FFFFFF',
      textColor = '#000000',
      blur = 'no',
      fontUrl = 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf', // Font default
      width = 600, // Lebar default
      height = 600, // Tinggi default
    } = req.query;

    await ensureFontRegistered(fontUrl); // Pastikan font siap digunakan

    const canvas = createCanvas(parseInt(width), parseInt(height));
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Teks
    ctx.imageSmoothingEnabled = true; // Untuk font non-pixel agar halus
    const cleanText = String(text).toUpperCase();
    const fontSize = getAdjustedFontSize(ctx, cleanText, canvas.width, FONT_FAMILY_NAME);
    ctx.font = `${fontSize}px "${FONT_FAMILY_NAME}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = canvas.width / 2;
    const y = canvas.height / 2;

    if (blur === 'yes') {
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.6; // Teks utama sedikit transparan
      ctx.fillText(cleanText, x, y);
      ctx.globalAlpha = 0.2; // Bayangan "burik" sangat tipis
      ctx.fillText(cleanText, x + 1, y + 1); // Sedikit offset
      ctx.globalAlpha = 1.0; // Reset alpha
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText(cleanText, x, y);
    }

    const dataUrl = canvas.toDataURL('image/png');
    res.status(200).json({ imageUrl: dataUrl });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message || 'Terjadi kesalahan internal.' });
  }
      }

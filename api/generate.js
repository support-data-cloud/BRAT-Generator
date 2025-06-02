const { createCanvas, registerFont, loadImage } = require('canvas'); // loadImage bisa berguna nanti
const axios = require('axios');
const path = require('path');
const fs = require('fs'); // Untuk file system operations
const os = require('os'); // Untuk temporary directory

const FONT_FAMILY_NAME_PREFIX = 'VercelDynamicFont'; // Awalan untuk nama font
const fontRegistry = new Map(); // Menyimpan info font yang sudah diregister: { url: { path: localPath, familyName: dynamicFamilyName } }

// Fungsi untuk memastikan font diunduh, disimpan, dan diregistrasi
async function prepareFont(fontUrl) {
    if (fontRegistry.has(fontUrl)) {
        const existingFont = fontRegistry.get(fontUrl);
        // Cek apakah file masih ada di /tmp, karena /tmp bisa dibersihkan Vercel
        if (fs.existsSync(existingFont.path)) {
            return existingFont.familyName; // Kembalikan nama family yang sudah ada
        } else {
            fontRegistry.delete(fontUrl); // Hapus dari registry jika file hilang
        }
    }

    let localFontPath;
    // Buat nama family yang unik untuk font ini agar tidak bentrok jika ada beberapa font berbeda
    const dynamicFamilyName = `${FONT_FAMILY_NAME_PREFIX}-${Buffer.from(fontUrl).toString('base64url').slice(0, 10)}`;

    try {
        console.log(`Attempting to download font from: ${fontUrl}`);
        const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
        const fontBuffer = Buffer.from(response.data);
        
        const tempDir = os.tmpdir(); // Direktori /tmp di Vercel
        // Nama file unik di /tmp
        const uniqueFileName = `${dynamicFamilyName}-${Date.now()}.ttf`;
        localFontPath = path.join(tempDir, uniqueFileName);

        console.log(`Saving font to temporary path: ${localFontPath}`);
        fs.writeFileSync(localFontPath, fontBuffer);
        
        console.log(`Registering font: ${localFontPath} with family: ${dynamicFamilyName}`);
        registerFont(localFontPath, { family: dynamicFamilyName });
        
        fontRegistry.set(fontUrl, { path: localFontPath, familyName: dynamicFamilyName });
        return dynamicFamilyName; // Kembalikan nama family yang baru diregister

    } catch (error) {
        console.error(`ERROR - Failed to download or register font from ${fontUrl}.`);
        console.error(error.message); // Log error detail
        // Jika font sudah diunduh tapi gagal register, coba bersihkan
        if (localFontPath && fs.existsSync(localFontPath)) {
            try { fs.unlinkSync(localFontPath); } catch (e) { /* ignore cleanup error */ }
        }
        throw new Error(`Gagal memproses font dari ${fontUrl}. Periksa URL dan format font.`);
    }
}

// Fungsi untuk menyesuaikan ukuran font
function getAdjustedFontSize(ctx, text, maxWidth, fontFamilyToUse) {
    let fontSize = Math.max(10, maxWidth * 0.18); // Ukuran awal, jangan terlalu kecil
    ctx.font = `${fontSize}px "${fontFamilyToUse}"`;
    // Terus kecilkan font jika lebar teks masih melebihi batas
    while (ctx.measureText(text).width > maxWidth * 0.90 && fontSize > 10) { // Beri sedikit margin (90%)
        fontSize -= 1;
        ctx.font = `${fontSize}px "${fontFamilyToUse}"`;
    }
    return fontSize;
}

// Handler utama untuk Vercel Serverless Function
module.exports = async (req, res) => {
    console.log(`API /api/generate called with query:`, req.query);
    try {
        const {
            text = 'SAMPLE',
            bgColor = '#FFFFFF',
            textColor = '#000000',
            blur = 'no',
            fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Bold.ttf',
            width: widthStr = '600',
            height: heightStr = '400',
        } = req.query;

        const currentFontFamily = await prepareFont(fontUrl); // Pastikan font siap

        const canvasWidth = parseInt(widthStr, 10);
        const canvasHeight = parseInt(heightStr, 10);

        if (isNaN(canvasWidth) || isNaN(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
            throw new Error('Lebar dan tinggi gambar tidak valid.');
        }

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Teks
        ctx.imageSmoothingEnabled = true; // Penting untuk font non-pixel
        ctx.textRendering = 'optimizeLegibility'; // Coba optimasi render

        const cleanText = String(text).toUpperCase(); // Ambil string dan uppercase
        const fontSize = getAdjustedFontSize(ctx, cleanText, canvas.width, currentFontFamily);
        ctx.font = `${fontSize}px "${currentFontFamily}"`; // Gunakan nama family yang sudah diregister & unik
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const x = canvas.width / 2;
        const y = canvas.height / 2;

        if (blur === 'yes') {
            ctx.fillStyle = textColor;
            // Efek "burik" / sedikit tidak fokus:
            // Gambar utama sedikit transparan
            ctx.globalAlpha = 0.7; 
            ctx.fillText(cleanText, x, y);
            // Tambahkan satu "bayangan" sangat tipis dengan offset kecil
            ctx.globalAlpha = 0.2; 
            ctx.fillText(cleanText, x + 1, y + 1); // offset 1px, bisa disesuaikan
            ctx.globalAlpha = 1.0; // Reset alpha untuk operasi gambar selanjutnya jika ada
        } else {
            ctx.fillStyle = textColor;
            ctx.fillText(cleanText, x, y);
        }

        const dataUrl = canvas.toDataURL('image/png');
        console.log('Image generated successfully.');
        res.setHeader('Access-Control-Allow-Origin', '*'); // Jika diakses dari domain lain (opsional)
        res.status(200).json({ imageUrl: dataUrl });

    } catch (error) {
        console.error("API Handler Error:", error.message, error.stack);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan internal server saat membuat gambar.' });
    }
};

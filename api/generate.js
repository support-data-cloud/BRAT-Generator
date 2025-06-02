// api/generate.js
const { createCanvas, registerFont } = require('canvas');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

const FONT_FAMILY_NAME = 'CustomDynamicFontFromFile';
const fontPathCache = new Map();

async function ensureFontRegistered(fontUrl) {
    if (fontPathCache.has(fontUrl) && fs.existsSync(fontPathCache.get(fontUrl))) {
        // Untuk memastikan font dikenali oleh instance canvas baru, kadang perlu diregister ulang
        // atau pastikan nama family unik per pemanggilan jika ada potensi konflik.
        // Dalam kasus ini, FONT_FAMILY_NAME statis, jadi kita asumsikan registrasi awal cukup.
        try {
            // registerFont(fontPathCache.get(fontUrl), { family: FONT_FAMILY_NAME }); // Coba register lagi
        } catch(e) { /* Jika sudah teregister dengan nama yg sama, bisa error, abaikan */ }
        return;
    }

    let localFontPath;
    try {
        const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
        const fontBuffer = Buffer.from(response.data);
        
        const tempDir = os.tmpdir();
        // Nama file yang lebih mungkin unik dan valid
        const safeFileNameSuffix = Buffer.from(fontUrl).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const uniqueFileName = `font-${safeFileNameSuffix}-${Date.now()}.ttf`;
        localFontPath = path.join(tempDir, uniqueFileName);

        fs.writeFileSync(localFontPath, fontBuffer);
        registerFont(localFontPath, { family: FONT_FAMILY_NAME }); // Register dengan nama keluarga yang konsisten
        
        fontPathCache.set(fontUrl, localFontPath);
        console.log(`Font from ${fontUrl} registered as ${FONT_FAMILY_NAME} at ${localFontPath}`);
    } catch (error) {
        console.error(`Error downloading/registering font from ${fontUrl}: ${error.message}`);
        if (localFontPath && fs.existsSync(localFontPath)) { // Bersihkan jika gagal setelah download
            fs.unlinkSync(localFontPath);
        }
        throw new Error(`Gagal memuat font: ${fontUrl}. Penyebab: ${error.message}`);
    }
}

function getAdjustedFontSize(ctx, text, maxWidth, fontFamily) {
    let fontSize = maxWidth * 0.2; 
    ctx.font = `${fontSize}px "${fontFamily}"`; // Selalu gunakan kutip pada nama font family
    while (ctx.measureText(text).width > maxWidth * 0.9 && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontSize}px "${fontFamily}"`;
    }
    return fontSize;
}

// Handler utama untuk Vercel Serverless Function
module.exports = async (req, res) => {
    try {
        // Vercel mengisi req.query dari URL search params
        const {
            text = 'BRAT',
            bgColor = '#FFFFFF',
            textColor = '#000000',
            blur = 'no',
            fontUrl = 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf',
            width = '600', // Terima sebagai string, parse ke int
            height = '600',
        } = req.query;

        await ensureFontRegistered(fontUrl);

        const canvasWidth = parseInt(width, 10);
        const canvasHeight = parseInt(height, 10);
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = true; // Font non-pixel harus halus
        const cleanText = String(text).toUpperCase();
        const fontSize = getAdjustedFontSize(ctx, cleanText, canvas.width, FONT_FAMILY_NAME);
        ctx.font = `${fontSize}px "${FONT_FAMILY_NAME}"`; // Gunakan nama family yang diregister
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const x = canvas.width / 2;
        const y = canvas.height / 2;

        if (blur === 'yes') {
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.65; // Teks utama sedikit transparan
            ctx.fillText(cleanText, x, y);
            ctx.globalAlpha = 0.18; // Bayangan "burik" sangat tipis
            ctx.fillText(cleanText, x + 1, y + 0.5); // Offset sedikit
            ctx.globalAlpha = 1.0; 
        } else {
            ctx.fillStyle = textColor;
            ctx.fillText(cleanText, x, y);
        }

        const dataUrl = canvas.toDataURL('image/png');
        res.status(200).json({ imageUrl: dataUrl });

    } catch (error) {
        console.error("API Error in /api/generate:", error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan internal server.' });
    }
};

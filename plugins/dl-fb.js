// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 📘 FACEBOOK COMMAND - ERINE STYLE IN ERFAN STRUCTURE
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl"],
    desc: "Download Facebook video",
    category: "download",
    react: "📘",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        // Validasi input dari user
        if (!q) return await reply(`Kirim link Facebook yang mau di-download!\n\n💡 Contoh: *.fb https://www.facebook.com/100044406976954/videos/1091456635297959/*`);
        
        if (!q.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch|fb\.com|fb\.gg)/i)) {
            return await reply('⚠️ Link yang lu kirim bukan link Facebook yang valid cuy!');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        await reply('⏳ *Sedang mengambil video dari Facebook...*');

        let apiUrl = `https://api.ryzumi.net/api/downloader/facebook?url=${encodeURIComponent(q)}`;
        
        // User Agent biar aman dari blokir API
        const fakeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        let response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'User-Agent': fakeUserAgent
            }
        });

        let json = await response.json();

        // Validasi response dari API Ryzumi
        if (!json.success || !json.result) throw 'Gagal mengambil data. Pastikan link tidak di-private atau coba lagi nanti.';

        let result = json.result;
        
        // Ambil array video dari respons JSON (biasanya yang pertama itu kualitas HD)
        let videoData = result.media?.videos?.[0] || result.media?.all?.[0];
        
        if (!videoData || !videoData.url) throw 'Video tidak ditemukan di dalam link tersebut.';

        // Bikin caption yang rapi
        let titleShort = result.title ? result.title.substring(0, 60) + '...' : 'Tidak ada judul';
        
        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";
        
        let captionMsg = `╭─⟡ *F A C E B O O K  D L* ⟡─╮\n`;
        captionMsg += `│ 🎬 *Title:* ${titleShort}\n`;
        captionMsg += `│ 🌟 *Quality:* ${videoData.quality || 'N/A'}\n`;
        captionMsg += `╰─────────────────────────⟡\n\n`;
        captionMsg += `> _Berhasil mendownload video._ 🚀\n`;
        captionMsg += `> © ${BOT_NAME}`;

        // Kirim videonya ke chat
        await conn.sendMessage(from, {
            video: { url: videoData.url },
            caption: captionMsg
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("❌ Error in .facebook:", e);
        await reply(`❌ *Terjadi kesalahan:* ${e.message || e}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

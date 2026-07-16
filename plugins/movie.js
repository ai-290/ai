
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// ============================================
// COMMAND: video (Nanzz /ytmp4 API)
// ============================================
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "oo"],
    desc: "Download YouTube video (name ya link se)",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        if (!text) return reply("🎥 Video ka naam ya link do!\n\nExample:\n`.video pal pal`\n`.video pal pal 720p`");

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        // Quality nikaalo (default 360p)
        const qMatch = text.match(/\b(144|240|360|480|720|1080)p\b/i);
        const quality = qMatch ? qMatch[1] + "p" : "360p";
        const query = text.replace(/\b(144|240|360|480|720|1080)p\b/i, "").trim();

        if (!query) return reply("🎥 Video ka naam bhi do!\n\nExample: `.video pal pal 360p`");

        await reply(`🔍 *Searching:* ${query}\n📺 *Quality:* ${quality}\n\n⏳ Please wait...`);

        // Nanzz ytmp4 API call (search + quality)
        const apiUrl = `https://api-nanzz.my.id/docs/api/downloader/ytmp4.php?q=${encodeURIComponent(query + " , " + quality)}`;
        const { data } = await axios.get(apiUrl, { timeout: 120000 });

        if (data.status && data.result && data.result.download_url) {
            const vid = data.result;

            await conn.sendMessage(from, {
                video: { url: vid.download_url },
                mimetype: "video/mp4",
                caption: `🎬 *${vid.title}*\n📺 *Quality:* ${vid.quality || quality}\n\n> ${DESCRIPTION}`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Video nahi mili! Naam change karke try karo.");
        }

    } catch (e) {
        console.error("Error in .video command:", e);
        reply("❌ Error aa gaya, thodi der baad try karo!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

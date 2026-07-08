// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 📘 FACEBOOK COMMAND - ZIAUL API (FREE, NO KEY)
// ═══════════════════════════════════════════════════════════

const ZIAUL_API = "https://api.ziaul.my.id/api/downloader/fbdownload";

cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl"],
    desc: "Download Facebook video",
    category: "download",
    react: "📘",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        // Validate input
        if (!q) {
            return await reply(
                `📘 *Facebook Downloader*\n\n` +
                `Please provide a Facebook video link!\n\n` +
                `*Example:*\n` +
                `.fb https://www.facebook.com/share/r/1EvyPj6vqs/\n` +
                `.fb https://www.facebook.com/watch/?v=1234567890`
            );
        }

        // Validate Facebook URL
        if (!q.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch|fb\.com)/i)) {
            return await reply('⚠️ Please send a valid Facebook link!');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        await reply('⏳ *Fetching video from Facebook...*');

        // Call ZiaUl API
        const { data } = await axios.get(ZIAUL_API, {
            params: { url: q },
            headers: {
                'accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        // Check API response
        if (!data || !data.status || !data.data) {
            throw new Error('Invalid response from API.');
        }

        const result = data.data;
        const title = result.title || 'Facebook Video';
        const thumbnail = result.thumbnail;
        const duration = result.duration || 'N/A';

        // Get best quality download URL
        let videoUrl = result.best_quality;
        let quality = 'Best';

        // If best_quality not available, use first download option
        if (!videoUrl && result.downloads && result.downloads.length > 0) {
            videoUrl = result.downloads[0].url;
            quality = result.downloads[0].quality || 'HD';
        }

        if (!videoUrl) {
            throw new Error('No download URL found in API response.');
        }

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";

        const caption = `┌˚₊ ๑│ ғ ᴀ ᴄ ᴇ ʙ ᴏ ᴏ ᴋ  ᴅ ʟ │๑˚₊ 📘
┇ 
│ 🎬 *Title:* ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}
│ ⏱️ *Duration:* ${duration}
│ 🌟 *Quality:* ${quality}
┇ 
└˚₊ ๑ ────────────── ๑˚₊
> © ${BOT_NAME}`;

        // Send video
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption,
            ...(thumbnail ? { jpegThumbnail: thumbnail } : {})
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("❌ Error in .facebook:", e);
        
        let errorMsg = e.message || 'Unknown error';
        
        if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
            errorMsg = 'API server is down. Please try again later.';
        } else if (errorMsg.includes('timeout')) {
            errorMsg = 'Request timed out. The video might be too large.';
        }

        await reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Failed to download Facebook video:\n┇ ${errorMsg}\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERFAN-MD`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

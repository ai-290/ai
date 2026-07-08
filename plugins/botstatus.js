// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 🎵 TIKTOK COMMAND - NANZZ API (NEW)
// ═══════════════════════════════════════════════════════════

const TIKTOK_APIS = [
    {
        name: "Nanzz",
        url: (ttUrl) => `https://api-nanzz.my.id/docs/api/downloader/tiktokv2.php?url=${encodeURIComponent(ttUrl)}`,
        checkResponse: (data) => data?.status === true && data?.result?.video_tanpa_watermark,
        getVideoUrl: (data) => data.result.video_tanpa_watermark,
        getAudioUrl: (data) => data.result.audio_mp3,
        getCaption: (data) => data.result.caption,
        getAuthor: (data) => data.result.author
    }
];

cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    desc: "Download TikTok video",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample: `.tt link`");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const apiPromises = TIKTOK_APIS.map(api => 
            axios.get(api.url(q), { 
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            })
            .then(response => ({ 
                success: true, 
                api: api, 
                data: response.data 
            }))
            .catch(error => ({ 
                success: false, 
                api: api, 
                error: error.message 
            }))
        );

        const results = await Promise.all(apiPromises);

        let videoUrl = null;
        let audioUrl = null;
        let caption = "";
        let author = "Unknown";
        let successApi = "";
        let errors = [];

        for (const result of results) {
            if (result.success) {
                const api = result.api;
                const data = result.data;

                console.log(`📊 ${api.name} Response:`, JSON.stringify(data, null, 2));

                if (api.checkResponse(data)) {
                    videoUrl = api.getVideoUrl(data);
                    audioUrl = api.getAudioUrl(data) || null;
                    caption = api.getCaption(data) || "";
                    author = api.getAuthor(data) || "Unknown";
                    successApi = api.name;
                    console.log(`✅ ${api.name} API Success!`);
                    break;
                } else {
                    errors.push(`${api.name}: Invalid response structure`);
                }
            } else {
                errors.push(`${result.api.name}: ${result.error}`);
            }
        }

        if (!videoUrl) {
            return await reply(
                `❌ *Download Failed!*\n\n` +
                `📝 *Errors:*\n${errors.map(e => `• ${e}`).join('\n')}\n\n` +
                `🔧 *Try:* Different link or try again later`
            );
        }

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";

        // ═══════════════════════════════════════════════════════════
        // 🎵 TIKTOK VIDEO SEND
        // ═══════════════════════════════════════════════════════════

        // Build caption
        let videoCaption = `🎵 *TikTok Downloader*\n\n` +
                           `👤 *Author:* ${author}\n\n`;

        if (caption) {
            videoCaption += `📝 *Caption:* ${caption}\n\n`;
        }

        videoCaption += `*Powered by ${BOT_NAME} ✅*`;

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: videoCaption
        }, { quoted: mek });

        // Send audio separately if available
        if (audioUrl) {
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("❌ Error in .tiktok:", e);
        await reply("⚠️ *Error:* " + e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

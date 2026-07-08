// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 🎵 TIKTOK COMMAND - FIXED & OPTIMIZED
// ═══════════════════════════════════════════════════════════

const TIKTOK_APIS = [
    {
        name: "Xemoz",
        url: (ttUrl) => `https://api-xemoz-official.my.id/api/donwloader/tiktok.php?url=${encodeURIComponent(ttUrl)}`,
        checkResponse: (data) => data?.status === true && data?.result?.result?.video?.length > 0,
        getVideoUrl: (data) => data.result.result.video[0],
        getUsername: (data) => data.result.result.username,
        getDuration: (data) => data.result.result.duration,
        getStats: (data) => data.result.result.stats,
        getType: (data) => data.result.result.type,
        getAudioUrl: (data) => data.result.result.audio?.[0] || null
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
        let username = "Unknown";
        let duration = "0:00";
        let stats = { views: "0", likes: "0", comments: "0", shares: "0" };
        let successApi = "";
        let errors = [];

        for (const result of results) {
            if (result.success) {
                const api = result.api;
                const data = result.data;

                console.log(`📊 ${api.name} Response:`, JSON.stringify(data, null, 2));

                if (api.checkResponse(data)) {
                    videoUrl = api.getVideoUrl(data);
                    audioUrl = api.getAudioUrl ? api.getAudioUrl(data) : null;
                    username = api.getUsername(data) || "Unknown";
                    duration = api.getDuration(data) || "0:00";
                    
                    // Handle null stats gracefully
                    const rawStats = api.getStats(data) || {};
                    stats = {
                        views: rawStats.views?.toString() || "0",
                        likes: rawStats.likes?.toString() || "0",
                        comments: rawStats.comments?.toString() || "0",
                        shares: rawStats.shares?.toString() || "0"
                    };
                    
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

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `🎵 *TikTok Downloader*\n\n` +
                     `👤 *Username:* ${username}\n` +
                     `⏱️ *Duration:* ${duration}\n` +
                     `📊 *Stats:*\n` +
                     `   👁️ Views: ${stats.views}\n` +
                     `   ❤️ Likes: ${stats.likes}\n` +
                     `   💬 Comments: ${stats.comments}\n` +
                     `   🔄 Shares: ${stats.shares}\n\n` +
                     `*Powered by ${BOT_NAME} ✅*`
        }, { quoted: mek });

        // Optional: Send audio separately if available
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

import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// ============================================
// COMMAND: ytvideo (NeoDev ytplay API)
// ============================================
cmd({
    pattern: "ytvideo2",
    alias: ["ytvid", "ytdl", "downloadvideo"],
    desc: "Download YouTube video with search",
    category: "download",
    react: "🎥",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        if (!text) return reply("🎥 Please provide a video name or search query!\n\nExample: `.ytvideo Pal pal`");

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        // Show searching message
        await conn.sendMessage(from, { react: { text: '🔍', key: m.key } });

        // Call NeoDev API
        const apiUrl = `https://neotex.my.id/download/ytplay?q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data.status || !response.data.result) {
            return reply("❌ No results found or API error!");
        }

        const videoData = response.data.result;

        // Send video info first
        await conn.sendMessage(from, {
            image: { url: videoData.thumbnail },
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${videoData.title}\n📺 *Channel:* ${videoData.channel}\n🕒 *Duration:* ${videoData.duration}\n👁️ *Views:* ${videoData.views.toLocaleString()}\n🔗 *URL:* ${videoData.url}\n\n*Status:* Downloading Video...\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        // Download and send video
        if (videoData.download && videoData.download.mp4) {
            await conn.sendMessage(from, {
                video: { url: videoData.download.mp4 },
                caption: `🎬 *${videoData.title}*\n⏱️ *Duration:* ${videoData.duration}\n📺 *Channel:* ${videoData.channel}\n\n> ${DESCRIPTION}`,
                mimetype: 'video/mp4'
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            return reply("❌ Video download link not available!");
        }

    } catch (e) {
        console.error("Error in .ytvideo command:", e);
        reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

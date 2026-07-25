import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// Helper to extract YouTube video ID
function getVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
}

// ============================================
// COMMAND: video (EliteProTech /ytmp4 API)
// ============================================
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "vbz"],
    desc: "Download YouTube video",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        if (!text) return reply("🎥 Please provide a video name or link!\n\nExample: `.video https://youtu.be/e9xsmjh_O30`");

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";
        const { default: yts } = await import('yt-search');
        
        let url = text;
        let vid = null;

        // Check if it's a URL
        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            vid = await yts({ videoId: videoId });
        } else {
            const search = await yts(text);
            if (!search.videos || !search.videos.length) {
                return reply("❌ No video results found!");
            }
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) return reply("❌ No results found!");

        // Send initial message with video info
        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title || 'Unknown'}\n📺 *Channel:* ${vid.author?.name || vid.author || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp || vid.duration || 'N/A'}\n👁️ *Views:* ${vid.views?.toLocaleString?.() || 'N/A'}\n\n*Status:* Downloading Video...\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        // Call EliteProTech API
        const apiUrl = `https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!response.data?.status || !response.data?.result?.url) {
            return reply("❌ Failed to get download URL from API!");
        }

        const videoData = response.data.result;
        const sizeMB = videoData.size ? (videoData.size / 1024 / 1024).toFixed(2) : 'Unknown';

        // Download video as buffer (Baileys cannot directly stream googlevideo.com links)
        const videoRes = await axios.get(videoData.url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        if (!videoRes.data || videoRes.data.byteLength === 0) {
            return reply("❌ Downloaded video is empty!");
        }

        // Send the video buffer
        await conn.sendMessage(from, {
            video: Buffer.from(videoRes.data),
            caption: `🎬 *${videoData.title || vid.title || 'Video'}*\n📦 *Size:* ${sizeMB} MB\n📁 *Type:* ${videoData.type || 'mp4'}\n\n> ${DESCRIPTION}`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .video command:", e);
        reply(`❌ Error: ${e.message || "Something went wrong, please try again later!"}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

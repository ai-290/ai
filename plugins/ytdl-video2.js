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
// COMMAND: video (Only EliteProTech API)
// ============================================
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "cc"],
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
            const searchFromUrl = await yts({ videoId: videoId });
            vid = searchFromUrl;
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
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n👁️ *Views:* ${vid.views?.toLocaleString() || 'N/A'}\n\n*Status:* Downloading Video...\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        // Use EliteProTech API
        const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp4`;
        const response = await axios.get(apiUrl);
        
        if (response.data.success && response.data.downloadURL) {
            // Send the video
            await conn.sendMessage(from, {
                video: { url: response.data.downloadURL },
                caption: `🎬 *${vid.title}*\n\n> ${DESCRIPTION}`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            return reply("❌ Failed to get download URL from API!");
        }

    } catch (e) {
        console.error("Error in .video command:", e);
        reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

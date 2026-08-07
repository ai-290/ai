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
// COMMAND: video (JerryCoder API)
// ============================================
cmd({
    pattern: "video5",
    alias: ["ytv", "ytmp4", "vbz"],
    desc: "Download YouTube video",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        if (!text) return reply("🎥 Please provide a video name or link!\n\nExample: `.video Believer` or `.video https://youtu.be/yCUQSto0Bwc`");

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        const { default: yts } = await import('yt-search');
        
        let url = text;
        let vid = null;

        // Check if user provided a URL or search term
        if (text.startsWith('http://') || text.startsWith('https://')) {
            // User provided a YouTube URL
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            
            // Get video info from yt-search
            const searchFromUrl = await yts({ videoId: videoId });
            vid = searchFromUrl;
            url = `https://youtube.com/watch?v=${videoId}`;
        } else {
            // User provided a search term (song name/title)
            const search = await yts(text);
            if (!search.videos || !search.videos.length) {
                return reply("❌ No video results found!");
            }
            vid = search.videos[0];
            url = vid.url;
        }

        if (!vid) return reply("❌ No results found!");

        // Send initial message with video info & thumbnail
        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n👁️ *Views:* ${vid.views?.toLocaleString() || 'N/A'}\n\n*Status:* ⏳ Downloading Video...\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        // Call JerryCoder API
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/ytmp4?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 120000, // 2 minutes timeout for large videos
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = response.data;

        // Check API response
        if (data.status === "success" && data.url) {
            // API returned success with download URL
            await conn.sendMessage(from, {
                video: { url: data.url },
                caption: `🎬 *${data.title || vid.title}*\n📺 *Quality:* ${data.quality || 'Unknown'}\n\n> ${DESCRIPTION}`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            return reply("❌ Failed to download video from API!");
        }

    } catch (e) {
        console.error("Error in .video command:", e);
        reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

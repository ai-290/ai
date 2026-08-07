import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// Helper to extract YouTube video ID
function getVideoId(url) {
    try {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    } catch (e) {
        console.error("getVideoId error:", e);
        return null;
    }
}

// ============================================
// COMMAND: video (JerryCoder API) - FIXED
// ============================================
cmd({
    pattern: "vido",
    alias: ["ytv", "ytmp4", "vbz"],
    desc: "Download YouTube video",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    
    // IMMEDIATE REACTION - to confirm command triggered
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
    } catch (e) {
        console.log("React error:", e);
    }

    try {
        // Check if text exists
        if (!text) {
            await reply("🎥 Please provide a video name or link!\n\nExample: `.video Believer` or `.video https://youtu.be/yCUQSto0Bwc`");
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        // Import yt-search
        let yts;
        try {
            const mod = await import('yt-search');
            yts = mod.default;
        } catch (e) {
            console.error("yt-search import failed:", e);
            await reply("❌ yt-search module not found! Please install it: `npm install yt-search`");
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        let url = text;
        let vid = null;
        let isUrl = false;

        // Check if it's a URL
        if (text.startsWith('http://') || text.startsWith('https://')) {
            isUrl = true;
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                await reply("❌ Please provide a valid YouTube URL!");
                return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            }
            
            const videoId = getVideoId(text);
            if (!videoId) {
                await reply("❌ Invalid YouTube URL!");
                return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            }
            
            // Get video info
            try {
                vid = await yts({ videoId: videoId });
                url = `https://youtube.com/watch?v=${videoId}`;
            } catch (e) {
                console.error("yts videoId search error:", e);
                await reply("❌ Failed to get video info from URL!");
                return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            }
        } else {
            // Search by text
            try {
                const search = await yts(text);
                console.log("Search results count:", search.videos?.length || 0);
                
                if (!search.videos || !search.videos.length) {
                    await reply("❌ No video results found!");
                    return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
                }
                
                vid = search.videos[0];
                url = vid.url;
                console.log("Found video:", vid.title, "| URL:", url);
            } catch (e) {
                console.error("yts text search error:", e);
                await reply("❌ Search failed! Error: " + e.message);
                return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            }
        }

        if (!vid) {
            await reply("❌ No results found!");
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        // Send initial info message
        try {
            await conn.sendMessage(from, {
                image: { url: vid.thumbnail },
                caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n👁️ *Views:* ${vid.views?.toLocaleString() || 'N/A'}\n\n*Status:* ⏳ Downloading Video...\n\n> ${DESCRIPTION}`
            }, { quoted: mek });
        } catch (e) {
            console.error("Send info message error:", e);
            // Continue even if thumbnail fails
        }

        // Call JerryCoder API
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/ytmp4?url=${encodeURIComponent(url)}`;
        console.log("Calling API:", apiUrl);

        let response;
        try {
            response = await axios.get(apiUrl, {
                timeout: 120000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            console.log("API Response status:", response.status);
            console.log("API Response data:", JSON.stringify(response.data, null, 2));
        } catch (e) {
            console.error("API call failed:", e.message);
            await reply("❌ API Error: " + e.message);
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        const data = response.data;

        // Validate response
        if (!data) {
            await reply("❌ API returned empty response!");
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        if (data.status !== "success") {
            await reply(`❌ API Error: ${data.status || 'Unknown error'}`);
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        if (!data.url) {
            await reply("❌ API returned success but no download URL!");
            return await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

        // Send the video
        try {
            await conn.sendMessage(from, {
                video: { url: data.url },
                caption: `🎬 *${data.title || vid.title}*\n📺 *Quality:* ${data.quality || 'Unknown'}\n\n> ${DESCRIPTION}`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } catch (e) {
            console.error("Send video error:", e);
            await reply("❌ Failed to send video! Error: " + e.message);
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("FATAL ERROR in .video command:", e);
        try {
            await reply("❌ Fatal Error: " + e.message);
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        } catch (e2) {
            console.error("Even error handling failed:", e2);
        }
    }
});

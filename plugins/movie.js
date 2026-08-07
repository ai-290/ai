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
// COMMAND: video (PrexzyAPI /ytmp4 API)
// ============================================
cmd({
    pattern: "vide",
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
            
            // Search by videoId to get info
            const searchFromUrl = await yts({ videoId: videoId });
            vid = searchFromUrl;
            url = `https://youtube.com/watch?v=${videoId}`; // Ensure clean URL
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

        // Use PrexzyAPI /ytmp4 API
        const apiUrl = `https://prexzyapis.com/download/ytmp4?url=${encodeURIComponent(url)}`;
        
        console.log("Fetching from API:", apiUrl); // DEBUG
        
        const response = await axios.get(apiUrl, {
            timeout: 60000, // 60 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        console.log("API Response:", JSON.stringify(response.data, null, 2)); // DEBUG
        
        // Check API response - handle both old and new structure
        const data = response.data;
        
        if (data.status === true || data.status === "true") {
            // Try different possible URL locations
            const downloadUrl = data.download_url || data.result?.url || data.url || data.link;
            
            if (!downloadUrl) {
                console.log("No download URL found in response:", data);
                return reply("❌ API returned success but no download URL found!");
            }
            
            // Get video info from API or fallback to search
            const title = data.info?.title || data.title || vid.title;
            const quality = data.quality || data.result?.quality || 'Unknown';
            const filesize = data.filesize || data.size || data.result?.size;
            const sizeInMB = filesize ? (filesize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';
            
            console.log("Download URL:", downloadUrl); // DEBUG
            
            // Send the video
            await conn.sendMessage(from, {
                video: { url: downloadUrl },
                caption: `🎬 *${title}*\n📦 *Size:* ${sizeInMB}\n📺 *Quality:* ${quality}\n\n> ${DESCRIPTION}`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            console.log("API returned error status:", data);
            return reply("❌ API returned error status!");
        }

    } catch (e) {
        console.error("Error in .video command:", e);
        reply(`❌ Error occurred: ${e.message}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

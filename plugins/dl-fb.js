// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ERFAN-MD

cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl", "fbdown"],
    desc: "Download Facebook videos and send them on WhatsApp",
    category: "downloader",
    react: "🎥",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {

        // Check URL
        if (!q) {
            return reply(
                "❌ Please provide a Facebook Video URL.\n\nExample:\n.facebook https://www.facebook.com/share/r/xxxxx/"
            );
        }

        // React loading
        await react("⬇️");

        // New Delirius API URL
        const apiUrl = `https://api.delirius.store/download/facebook?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl);

        // Validate response
        if (!data || !data.status || !data.list || !data.list.length) {
            await react("❌");
            return reply("❌ Failed to fetch Facebook video. Try another link.");
        }

        // Get the Best quality video from 'list' array
        const media = data.list[0];

        // Validate media URL
        if (!media.url) {
            await react("❌");
            return reply("❌ Video download URL not found.");
        }

        // Send info message
        await reply(
            `📘 *FACEBOOK DOWNLOADER*\n\n` +
            `📹 *Quality:* ${media.quality || 'HD'}\n` +
            `👤 *API by:* ${data.creator || 'Delirius'}\n\n` +
            `📥 Downloading video... Please wait.`
        );

        // Download media buffer with proper headers
        const response = await axios.get(media.url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.facebook.com/',
                'Origin': 'https://www.facebook.com'
            },
            timeout: 180000, // 3 minutes
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            maxRedirects: 5
        });

        // Check if download was successful
        if (!response.data || response.data.length === 0) {
            await react("❌");
            return reply("❌ Failed to download video. The file might be empty.");
        }

        // Send video
        await conn.sendMessage(from, {
            video: Buffer.from(response.data),
            mimetype: 'video/mp4',
            caption: `✅ *Video Downloaded Successfully!*\n\n📹 *Quality:* ${media.quality}\n🎬 *Facebook Video*\n\n> *IT'S ERFAN AHMAD*`,
            fileName: `facebook_video_${Date.now()}.mp4`
        }, { quoted: mek });

        // Success reaction
        await react("✅");

    } catch (e) {

        console.log("Facebook Downloader Error:", e.message);
        console.log("Full Error:", e);

        await react("❌");

        // More detailed error message
        if (e.response) {
            reply(`❌ Download Error: ${e.response.status} - ${e.response.statusText}\n\nThe CDN server rejected the request.`);
        } else if (e.code === 'ECONNABORTED') {
            reply("❌ Download timeout! The video is too large or connection is slow.");
        } else if (e.code === 'ERR_BAD_REQUEST') {
            reply("❌ Invalid video URL. Please try another Facebook link.");
        } else {
            reply(
                `❌ An error occurred while downloading Facebook video.\n\nError: ${e.message}\n\nPlease try again later.`
            );
        }
    }
});

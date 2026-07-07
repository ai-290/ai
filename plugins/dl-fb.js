// ERFAN-MD - Facebook Downloader
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // ✅ NEW Ziaul API URL
        const apiUrl = `https://api.ziaul.my.id/api/downloader/fbdownload?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        // ✅ Validate response (New Structure)
        if (!data || !data.status || !data.data || !data.data.downloads || data.data.downloads.length === 0) {
            await react("❌");
            return reply("❌ Failed to fetch Facebook video. Try another link.");
        }

        // ✅ Get best quality video URL
        const videoUrl = data.data.best_quality || data.data.downloads[0].url;

        if (!videoUrl) {
            await react("❌");
            return reply("❌ Video download URL not found.");
        }

        // Download video buffer
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const videoBuffer = Buffer.from(videoResponse.data);

        // Send video
        await conn.sendMessage(from, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: `✅ *Downloaded Successfully!*\n\n📹 *Quality:* ${data.data.downloads[0].quality || 'Best'}\n⏱ *Duration:* ${data.data.duration || 'N/A'}\n\n> *IT'S ERFAN AHMAD*`
        }, { quoted: mek });

        // Success reaction
        await react("✅");

    } catch (e) {
        console.log("Facebook Downloader Error:", e);
        await react("❌");
        reply("❌ An error occurred while downloading Facebook video.\nPlease try again later.");
    }
});

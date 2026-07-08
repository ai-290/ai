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
            `🎬 *Title:* Facebook Video\n` +
            `📹 *Quality:* ${media.quality || 'HD'}\n` +
            `🖼 *Thumbnail:* ${data.thumb ? 'Available' : 'Not Found'}\n` +
            `👤 *API by:* ${data.creator || 'Delirius'}\n\n` +
            `📥 Downloading video... Please wait.`
        );

        // Download media buffer
        const response = await axios.get(media.url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // Send video
        await conn.sendMessage(from, {
            video: Buffer.from(response.data),
            mimetype: 'video/mp4',
            caption: `✅ *Video Downloaded Successfully!*\n\n📹 *Quality:* ${media.quality}\n🎬 *Facebook Video*\n\n> *IT'S ERFAN AHMAD*`
        }, { quoted: mek });

        // Success reaction
        await react("✅");

    } catch (e) {

        console.log("Facebook Downloader Error:", e);

        await react("❌");

        reply(
            "❌ An error occurred while downloading Facebook video.\nPlease try again later."
        );
    }
});

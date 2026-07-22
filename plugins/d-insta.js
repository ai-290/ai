import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "instagram",
    alias: ["ig", "instadl", "instax"],
    desc: "Download Instagram videos and send them on WhatsApp",
    category: "downloader",
    react: "🎥",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {

        // Check URL
        if (!q) {
            return reply(
                "❌ Please provide an Instagram Reel/Post URL.\n\nExample:\n.instagram https://www.instagram.com/reel/xxxxx/"
            );
        }

        // React loading
        await react("⬇️");

        // New API URL
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl);

        // Validate response
        if (!data || data.status !== "success" || !data.data || !data.data.url) {
            await react("❌");
            return reply("❌ Failed to fetch Instagram media. Try another link.");
        }

        // Get media data
        const media = data.data;

        // Send info message
        await reply(
            `🎬 *INSTAGRAM DOWNLOADER*\n\n` +
            `📦 *Type:* ${media.type || 'Unknown'}\n` +
            `🖼 *Thumbnail:* ${media.thumbnail ? 'Available' : 'Not Found'}\n` +
            `⚡ *Response Time:* ${data.ping || 'Fast'}\n` +
            `👤 *Creator:* ${data.creator || 'Unknown'}\n` +
            `🖥 *Server:* ${data.server || 'Unknown'}\n\n` +
            `📥 Downloading media... Please wait.`
        );

        // Download media buffer
        const response = await axios.get(media.url, {
            responseType: 'arraybuffer'
        });

        // Send video
        if (media.type === "video") {

            await conn.sendMessage(from, {
                video: Buffer.from(response.data),
                mimetype: 'video/mp4',
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });

        } else {

            // Send image if image type
            await conn.sendMessage(from, {
                image: Buffer.from(response.data),
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });
        }

        // Success reaction
        await react("✅");

    } catch (e) {

        console.log("Instagram Downloader Error:", e);

        await react("❌");

        reply(
            "❌ An error occurred while downloading Instagram media.\nPlease try again later."
        );
    }
});

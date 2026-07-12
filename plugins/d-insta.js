import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "instagram",
    alias: ["ig", "instadl", "insta"],
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

        // NEW API URL (Delirius)
        const apiUrl = `https://api.delirius.store/download/instagram?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl);

        // Validate response (updated for Delirius API structure)
        if (!data || !data.status || !data.data || !data.data.length) {
            await react("❌");
            return reply("❌ Failed to fetch Instagram media. Try another link.");
        }

        // Get first media
        const media = data.data[0];

        // Validate media URL
        if (!media.url) {
            await react("❌");
            return reply("❌ Media URL not found.");
        }

        // Send info message (adapted to new API response)
        await reply(
            `🎬 *INSTAGRAM DOWNLOADER*\n\n` +
            `📦 *Type:* ${media.type || 'Unknown'}\n` +
            `⚡ *Source:* Delirius API\n\n` +
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

        } else if (media.type === "image") {

            // Send image if image type
            await conn.sendMessage(from, {
                image: Buffer.from(response.data),
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });

        } else {
            // Fallback for unknown types
            await conn.sendMessage(from, {
                document: Buffer.from(response.data),
                mimetype: 'application/octet-stream',
                fileName: `instagram_media.${media.type || 'bin'}`,
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

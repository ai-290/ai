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

        // React loading - FIXED: Use conn.sendMessage for reaction like working command
        await conn.sendMessage(from, { react: { text: '⬇️', key: m.key } });

        // New API URL
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl);

        // Validate response - FIXED: Check exact status string and data structure
        if (!data || data.status !== "success" || !data.data || !data.data.url) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Failed to fetch Instagram media. Try another link.");
        }

        // Get media data - FIXED: Use data.data (not data.result array)
        const media = data.data;

        // Send info message with thumbnail - FIXED: Similar to working YouTube command
        await conn.sendMessage(from, {
            image: { url: media.thumbnail },
            caption: `🎬 *INSTAGRAM DOWNLOADER*\n\n` +
            `📦 *Type:* ${media.type || 'Unknown'}\n` +
            `🖼 *Thumbnail:* ${media.thumbnail ? 'Available' : 'Not Found'}\n` +
            `⚡ *Ping:* ${data.ping || 'Fast'}\n` +
            `👤 *Creator:* ${data.creator || 'Unknown'}\n` +
            `🖥 *Server:* ${data.server || 'Unknown'}\n\n` +
            `*Status:* Downloading media... Please wait.\n\n` +
            `> *IT'S ERFAN AHMAD*`
        }, { quoted: mek });

        // Send the video - FIXED: Stream directly from URL like working YouTube command
        if (media.type === "video") {

            await conn.sendMessage(from, {
                video: { url: media.url },  // FIXED: Use { url: media.url } instead of Buffer
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });

        } else {

            // Send image if image type - FIXED: Same streaming approach
            await conn.sendMessage(from, {
                image: { url: media.url },  // FIXED: Use { url: media.url } instead of Buffer
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });
        }

        // Success reaction - FIXED: Use conn.sendMessage for reaction
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {

        console.error("Instagram Downloader Error:", e.message || e);

        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });

        reply(
            "❌ An error occurred while downloading Instagram media.\nPlease try again later."
        );
    }
});

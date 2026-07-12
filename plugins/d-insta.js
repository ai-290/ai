// ERFAN-MD
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

        // New API URL (Nanzz)
        const apiUrl = `https://api-nanzz.my.id/docs/api/downloader/Instagram.php?url=${encodeURIComponent(q)}`;

        // Fetch API Data
        const { data } = await axios.get(apiUrl);

        // Validate response
        if (!data || !data.debug || !data.debug.status || !data.debug.result || !data.debug.result.download_urls || !data.debug.result.download_urls.length) {
            await react("❌");
            return reply("❌ Failed to fetch Instagram media. Try another link.");
        }

        // Get first media URL
        const mediaUrl = data.debug.result.download_urls[0];

        // Validate media URL
        if (!mediaUrl) {
            await react("❌");
            return reply("❌ Media URL not found.");
        }

        // Send info message
        await reply(
            `🎬 *INSTAGRAM DOWNLOADER*\n\n` +
            `📥 Downloading media... Please wait.`
        );

        // Download media buffer
        const response = await axios.get(mediaUrl, {
            responseType: 'arraybuffer'
        });

        // Detect type from URL (since this API doesn't provide type field)
        const isVideo = /(\.mp4|\.mov|\.m4v|\.webm)/i.test(mediaUrl) || mediaUrl.includes('mp4');

        // Send video
        if (isVideo) {

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

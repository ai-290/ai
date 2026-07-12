// ERFAN-MD — Instagram Downloader (Fixed)
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
        // 1) Check URL
        if (!q || !q.includes("instagram.com")) {
            return reply(
                "❌ Please provide a valid Instagram Reel/Post URL.\n\nExample:\n.instagram https://www.instagram.com/reel/xxxxx/"
            );
        }

        // 2) Loading reaction
        await react("⬇️");

        // 3) API Call (lolhuman — requires free API Key)
        // ⚠️ IMPORTANT: Replace "YOUR_APIKEY" with your real API Key from lolhuman.xyz
        const apiKey = "YOUR_APIKEY"; // <-- Get free API key from lolhuman.xyz
        const apiUrl = `https://api.lolhuman.xyz/api/instagram?apikey=${apiKey}&url=${encodeURIComponent(q)}`;

        // Request with timeout
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        // 4) Check response (flexible handling)
        if (!data || data.status !== 200) {
            await react("❌");
            return reply("❌ Failed to fetch Instagram media. Please check if the link is valid.");
        }

        // 5) Extract media URL (supports different formats)
        let mediaUrl = null;
        let mediaType = "video";

        if (typeof data.result === "string") {
            // Direct URL string
            mediaUrl = data.result;
        } else if (Array.isArray(data.result) && data.result.length > 0) {
            // Array response
            mediaUrl = data.result[0].url || data.result[0];
            mediaType = data.result[0].type || "video";
        } else if (data.result && typeof data.result === "object") {
            // Object response
            mediaUrl = data.result.url || data.result.link || data.result.download;
            mediaType = data.result.type || "video";
        }

        if (!mediaUrl) {
            await react("❌");
            return reply("❌ Media URL not found in API response.");
        }

        // 6) Send info message
        await reply(
            `🎬 *INSTAGRAM DOWNLOADER*\n\n` +
            `📦 *Type:* ${mediaType.toUpperCase()}\n` +
            `⚡ *Status:* Downloading...\n\n` +
            `📥 Downloading media, please wait...`
        );

        // 7) Download media buffer
        const response = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const buffer = Buffer.from(response.data);

        // 8) Send media
        if (mediaType.toLowerCase() === "video" || mediaType.toLowerCase() === "mp4") {
            await conn.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                image: buffer,
                caption: `> *IT'S ERFAN AHMAD*`
            }, { quoted: mek });
        }

        // 9) Success reaction
        await react("✅");

    } catch (e) {
        console.error("Instagram Downloader Error:", e.message);
        await react("❌");
        return reply(
            "❌ An error occurred:\n" +
            `\`\`\`${e.message}\`\`\`\n\n` +
            "Please try again or check your API Key."
        );
    }
});

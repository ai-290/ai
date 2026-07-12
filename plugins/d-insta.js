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

        // New API URL
        const apiUrl = `https://api.nexray.eu.cc/downloader/instagram?url=${encodeURIComponent(q)}`;

        // Fetch API Data (with timeout so it fails fast instead of hanging)
        const { data } = await axios.get(apiUrl, { timeout: 20000 });

        // DEBUG: log the raw response once so you can see the exact shape in Heroku logs
        console.log("IG API raw response:", JSON.stringify(data));

        if (!data || data.status === false) {
            await react("❌");
            return reply("❌ API returned an error status. Try another link.");
        }

        // Normalize result: some responses send an array, some send a single object
        let mediaList = data.result;
        if (mediaList && !Array.isArray(mediaList)) {
            mediaList = [mediaList];
        }

        if (!mediaList || !mediaList.length) {
            await react("❌");
            console.log("IG API: no usable result field. Full response:", JSON.stringify(data));
            return reply("❌ Failed to fetch Instagram media. Try another link.");
        }

        // Get first media
        const media = mediaList[0];

        // Some APIs use media.url, others use media.video_url / media.download_url
        const mediaUrl = media.url || media.video_url || media.download_url || media.videoUrl;

        if (!mediaUrl) {
            await react("❌");
            console.log("IG API: media object had no recognizable URL field:", JSON.stringify(media));
            return reply("❌ Media URL not found in API response.");
        }

        // Send info message
        await reply(
            `🎬 *INSTAGRAM DOWNLOADER*\n\n` +
            `📦 *Type:* ${media.type || 'Unknown'}\n` +
            `🖼 *Thumbnail:* ${media.thumbnail ? 'Available' : 'Not Found'}\n` +
            `⚡ *Response Time:* ${data.response_time || 'Fast'}\n\n` +
            `📥 Downloading media... Please wait.`
        );

        // Download media buffer
        const response = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Send video
        if ((media.type || '').toLowerCase() === "video" || mediaUrl.includes('.mp4')) {
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
        console.log("Instagram Downloader Error:", e?.response?.data || e.message || e);
        await react("❌");
        reply(
            "❌ An error occurred while downloading Instagram media.\nPlease try again later."
        );
    }
});

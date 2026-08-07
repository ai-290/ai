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
// COMMAND: video (Multi-API Fallback)
// ============================================
cmd({
    pattern: "video1",
    alias: ["ytv", "yt", "ytmp4", "vbz"],
    desc: "Download YouTube video (MP4)",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        // ─── Get URL from text or reply ───
        let url = text?.trim() || "";

        if (!url) {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const quotedText =
                    quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    quoted.imageMessage?.caption ||
                    quoted.videoMessage?.caption ||
                    "";
                const match = quotedText.match(/https?:\/\/[^\s]+/);
                if (match) url = match[0];
            }
        }

        if (!url) {
            return reply(`❌ *Missing YouTube URL*\n\n➤ .video <url>\n➤ .video <search query>\n➤ Or reply to a message containing a YouTube link.`);
        }

        await conn.sendMessage(from, {
            react: { text: "⏳", key: m.key }
        });

        let vid = null;
        let searchUrl = url;

        // ─── If not a URL, search YouTube ───
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const { default: yts } = await import('yt-search');
            const search = await yts(url);
            if (!search.videos || !search.videos.length) {
                return reply("❌ No video results found!");
            }
            vid = search.videos[0];
            searchUrl = vid.url;
        } else {
            if (!url.includes("youtu")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(url);
            if (!videoId) return reply("❌ Invalid YouTube URL!");
            const { default: yts } = await import('yt-search');
            const searchFromUrl = await yts({ videoId: videoId });
            vid = searchFromUrl;
        }

        if (!vid) return reply("❌ No results found!");

        // ─── Send initial info message ───
        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${vid.title}\n📺 *Channel:* ${vid.author?.name || 'Unknown'}\n🕒 *Duration:* ${vid.timestamp}\n👁️ *Views:* ${vid.views?.toLocaleString() || 'N/A'}\n\n*Status:* Downloading Video...\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        // ─── Multi-API Fallback Download ───
        const apis = [
            `https://jerrycoder.oggyapi.workers.dev/down/ytmp4-v1?url=${encodeURIComponent(searchUrl)}`,
            `https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(searchUrl)}`
        ];

        let videoUrl = null;
        let videoTitle = vid.title;

        for (const api of apis) {
            try {
                const { data } = await axios.get(api, { timeout: 15000 });
                videoUrl =
                    data?.data?.dl ||
                    data?.data?.url ||
                    data?.result?.url ||
                    data?.result?.video ||
                    data?.url ||
                    data?.download;

                videoTitle =
                    data?.data?.title ||
                    data?.result?.title ||
                    data?.title ||
                    videoTitle;

                if (videoUrl) break;
            } catch (e) {
                console.log("API failed:", api);
            }
        }

        if (!videoUrl) throw new Error("No video URL found from any API");

        // ─── Send the video ───
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: `🎬 *${videoTitle}*\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        await conn.sendMessage(from, {
            react: { text: "✅", key: m.key }
        });

    } catch (err) {
        console.error("Error in .video command:", err);
        reply(`❌ *Download Failed*\n\n${err.message || "Please try again later."}`);
        await conn.sendMessage(from, {
            react: { text: "❌", key: m.key }
        });
    }
});

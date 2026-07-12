import { fileURLToPath } from 'url';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "x"],
    desc: "Download YouTube video",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a YouTube video name or URL!\nExample: `.video alone marshmello`");

        let url = q;
        let videoInfo = null;
        let videoId = null;

        function getVideoId(link) {
            const match = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            return match ? match[1] : null;
        }

        if (q.startsWith('http://') || q.startsWith('https://')) {
            if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
                return await reply("❌ Please provide a valid YouTube URL!");
            }
            videoId = getVideoId(q);
            if (!videoId) return await reply("❌ Invalid YouTube URL!");

            try {
                videoInfo = await yts({ videoId });
            } catch {
                videoInfo = {
                    title: q,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    author: { name: 'YouTube' },
                    duration: { seconds: 0 }
                };
            }
            url = q;
        } else {
            let searchResults = await yts(q).catch(() => null);
            if (!searchResults?.videos?.length) {
                searchResults = await yts(q + " video").catch(() => null);
            }
            if (!searchResults?.videos?.length) {
                return await reply("❌ No video found! Try a different search term.");
            }
            videoInfo = searchResults.videos[0];
            url = videoInfo.url;
            videoId = getVideoId(url);
        }

        // Parse duration properly
        let durationSeconds = 0;
        if (videoInfo.duration) {
            if (typeof videoInfo.duration === 'object' && videoInfo.duration.seconds) {
                durationSeconds = videoInfo.duration.seconds;
            } else if (typeof videoInfo.duration === 'number') {
                durationSeconds = videoInfo.duration;
            } else if (typeof videoInfo.duration === 'string') {
                const parts = videoInfo.duration.split(':').map(Number);
                if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
                else if (parts.length === 1) durationSeconds = parts[0];
            }
        }

        const durationMinutes = Math.floor(durationSeconds / 60);

        function cleanDescription(text) {
            if (!text) return 'N/A';
            return text.replace(/https?:\/\/[^\s]+/g, '').trim() || 'N/A';
        }

        function formatDuration(seconds) {
            if (!seconds) return 'N/A';
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
            if (mins > 0) return `${mins}m ${secs}s`;
            return `${secs}s`;
        }

        const durationDisplay = formatDuration(durationSeconds);
        const caption = `*🎬 VIDEO DOWNLOADER*\n\n` +
                        `📌 *Title:* ${videoInfo.title || 'Unknown'}\n` +
                        `📝 *Description:* ${cleanDescription(videoInfo.description)}\n` +
                        `📺 *Channel:* ${videoInfo.author?.name || 'Unknown'}\n` +
                        `🕒 *Duration:* ${durationDisplay}\n` +
                        `⏳ *Status:* Fetching download link...\n\n` +
                        `*© Powered by ERFAN-MD*`;

        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
            caption
        }, { quoted: mek });

        // EliteProTech API
        const encodedUrl = encodeURIComponent(url);
        let downloadUrl = null;

        try {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp4?url=${encodedUrl}`, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            if (res.data?.status === true && res.data?.result?.url) {
                downloadUrl = res.data.result.url;
            } else {
                throw new Error('API failed');
            }
        } catch (e) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ Failed to fetch download link! Please try again later.");
        }

        // ═══════════════════════════════════════════════════════
        // 🔥 MAIN FIX: Block long videos before downloading
        // Only short videos (songs, clips) to prevent crash
        // ═══════════════════════════════════════════════════════
        if (durationMinutes > 15) {
            await conn.sendMessage(from, { react: { text: '⚠️', key: m.key } });
            return await reply(
                `⚠️ *Video too long!* (${durationMinutes} minutes)\n\n` +
                `Only videos under *15 minutes* are supported.\n` +
                `Try a song or shorter clip. 🎵`
            );
        }

        // Download short video with safe limits
        try {
            console.log(`[VIDEO] Downloading: ${durationMinutes} min video...`);

            const videoBuffer = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,              // 2 minutes timeout
                maxContentLength: 60 * 1024 * 1024,  // 60MB max
                maxBodyLength: 60 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.youtube.com/'
                }
            });

            const sizeMB = (videoBuffer.data.length / (1024 * 1024)).toFixed(2);
            console.log(`[VIDEO] Downloaded: ${sizeMB} MB`);

            // Validate: Not an HTML error page
            const firstBytes = videoBuffer.data.toString('utf-8', 0, 500);
            if (firstBytes.includes('<!DOCTYPE') || firstBytes.includes('<html>')) {
                throw new Error('API returned HTML error page');
            }

            // Validate: At least 50KB (real video)
            if (videoBuffer.data.length < 50000) {
                throw new Error('File too small, invalid video');
            }

            await conn.sendMessage(from, {
                video: Buffer.from(videoBuffer.data),
                caption: `🎬 *${videoInfo.title || 'Video'}*\n\n📥 EliteProTech ✅\n📦 Size: ${sizeMB} MB\n*© Powered by ERFAN-MD*`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            console.log(`[VIDEO] ✅ Sent (${sizeMB} MB)`);

        } catch (dlErr) {
            console.error('[VIDEO] Error:', dlErr.message);

            if (dlErr.code === 'ECONNABORTED') {
                await reply("❌ Download timed out! Try again.");
            } else if (dlErr.response?.status === 404) {
                await reply("❌ Link expired. Try again.");
            } else if (dlErr.message.includes('maxContentLength')) {
                await reply("❌ File too large (over 60MB). Try a shorter video.");
            } else {
                await reply(`❌ Download failed: ${dlErr.message}`);
            }
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("❌ Error in .video command:", e);
        await reply(`⚠️ Error: ${e.message || 'Something went wrong!'}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

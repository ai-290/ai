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
        let isLongVideo = false;

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

        if (Math.floor(durationSeconds / 60) > 15) isLongVideo = true;

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
                        `${isLongVideo ? '⚠️ *Long video detected (>15 min)*\n' : ''}` +
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
        // 🔥 FIX: Stream video instead of buffering in memory
        // This handles 2+ hour videos without crashing
        // ═══════════════════════════════════════════════════════
        try {
            console.log(`[VIDEO] Starting stream download...`);

            // Get video as a readable stream (NOT arraybuffer!)
            const response = await axios.get(downloadUrl, {
                responseType: 'stream',
                timeout: isLongVideo ? 600000 : 180000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    'Referer': 'https://www.youtube.com/'
                }
            });

            // Send stream directly to WhatsApp — zero memory buffer!
            await conn.sendMessage(from, {
                video: { stream: response.data },  // ← STREAM, not Buffer!
                caption: `🎬 *${videoInfo.title}*\n\n📥 Downloaded via: EliteProTech ✅\n*© Powered by ERFAN-MD*`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            console.log(`[VIDEO] ✅ Stream sent successfully`);

        } catch (streamErr) {
            console.error('[VIDEO] Stream error:', streamErr.message);

            // Fallback: Buffer only for short videos (< 15 min)
            if (!isLongVideo) {
                try {
                    console.log(`[VIDEO] Fallback: Buffering short video...`);

                    const videoBuffer = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        maxContentLength: 100 * 1024 * 1024, // 100MB max
                        maxBodyLength: 100 * 1024 * 1024,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://www.youtube.com/'
                        }
                    });

                    const bufferString = videoBuffer.data.toString('utf-8', 0, 500);
                    if (bufferString.includes('<!DOCTYPE') || bufferString.includes('<html>')) {
                        throw new Error('API returned HTML error page');
                    }

                    await conn.sendMessage(from, {
                        video: Buffer.from(videoBuffer.data),
                        caption: `🎬 *${videoInfo.title}*\n\n📥 Downloaded via: EliteProTech ✅\n*© Powered by ERFAN-MD*`
                    }, { quoted: mek });

                    await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                    return;

                } catch (fallbackErr) {
                    console.error('[VIDEO] Fallback error:', fallbackErr.message);
                }
            }

            await reply("❌ Failed to download video. Try again later.");
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("❌ Error in .video command:", e);
        await reply(`⚠️ Error: ${e.message || 'Something went wrong!'}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

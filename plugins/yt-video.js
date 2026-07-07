import { fileURLToPath } from 'url';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ──────────────────────────────────────────────────────────────
// 🎬 VIDEO COMMAND (3 API Fallback System)
// ──────────────────────────────────────────────────────────────
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "vx"],
    desc: "Download YouTube video (MP4) with auto fallback",
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

        // ── Extract Video ID from URL ──
        function getVideoId(url) {
            const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            return match ? match[1] : null;
        }

        // ── Search or extract URL ──
        if (q.startsWith('http://') || q.startsWith('https://')) {
            if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
                return await reply("❌ Please provide a valid YouTube URL!");
            }
            videoId = getVideoId(q);
            if (!videoId) return await reply("❌ Invalid YouTube URL!");

            try {
                const searchFromUrl = await yts({ videoId });
                videoInfo = searchFromUrl;
            } catch (searchErr) {
                console.log('[VIDEO] yts failed, using URL directly:', searchErr.message);
                videoInfo = {
                    title: q,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    author: { name: 'YouTube' },
                    timestamp: 'N/A',
                    description: 'N/A',
                    duration: 0
                };
            }
            url = q;
        } else {
            let searchResults = null;

            try {
                searchResults = await yts(q);
            } catch (e) {
                console.log('[VIDEO] Search failed:', e.message);
            }

            if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
                try {
                    searchResults = await yts(q + " video");
                } catch (e) {
                    console.log('[VIDEO] Second search failed:', e.message);
                }
            }

            if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
                return await reply("❌ No video found! Try a different search term.");
            }

            videoInfo = searchResults.videos[0];
            url = videoInfo.url;
            videoId = getVideoId(url);
        }

        // ── Check if video is long (> 15 minutes) ──
        const durationSeconds = videoInfo.duration || 0;
        const durationMinutes = Math.floor(durationSeconds / 60);
        if (durationMinutes > 15) {
            isLongVideo = true;
            console.log(`[VIDEO] Long video detected: ${durationMinutes} minutes`);
        }

        // ── Clean description ──
        function cleanDescription(text) {
            if (!text) return 'N/A';
            return text.replace(/https?:\/\/[^\s]+/g, '').trim() || 'N/A';
        }

        // ── Format duration ──
        function formatDuration(seconds) {
            if (!seconds) return 'N/A';
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
            if (mins > 0) return `${mins}m ${secs}s`;
            return `${secs}s`;
        }

        // ── Send initial info ──
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

        // ══════════════════════════════════════════════════════
        // 🔥 3 API FALLBACK SYSTEM
        // If one fails → automatically tries the next one
        // ══════════════════════════════════════════════════════
        const encodedUrl = encodeURIComponent(url);
        let downloadUrl = null;
        let usedApi = '';

        const apis = [
            {
                name: 'Ryzumi',
                fn: async () => {
                    const res = await axios.get(
                        `https://api.ryzumi.net/api/downloader/ytmp4?url=${encodedUrl}&quality=360`,
                        { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
                    );
                    if (res.data?.url) {
                        return res.data.url;
                    }
                    throw new Error('Ryzumi: No download URL in response');
                }
            },
            {
                name: 'Xemoz',
                fn: async () => {
                    const res = await axios.get(
                        `https://api-xemoz-official.my.id/api/donwloader/ytmp4.php?url=${encodedUrl}`,
                        { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
                    );
                    if (res.data?.status && res.data?.result?.download) {
                        return res.data.result.download;
                    }
                    throw new Error('Xemoz: No download URL in response');
                }
            },
            {
                name: 'ZiaUl',
                fn: async () => {
                    const res = await axios.get(
                        `https://api.ziaul.my.id/api/downloader/ytmp4?url=${encodedUrl}`,
                        { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
                    );
                    if (res.data?.status && res.data?.result?.downloadUrl) {
                        return res.data.result.downloadUrl;
                    }
                    throw new Error('ZiaUl: No download URL in response');
                }
            }
        ];

        // ── Try each API one by one ──
        for (const api of apis) {
            try {
                console.log(`[VIDEO] Trying ${api.name}...`);
                const link = await api.fn();

                if (link) {
                    downloadUrl = link;
                    usedApi = api.name;
                    console.log(`[VIDEO] ✅ ${api.name} returned a link`);
                    break;
                }
            } catch (e) {
                console.log(`[VIDEO] ❌ ${api.name} failed: ${e.message}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!downloadUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ All 3 APIs failed! Please try again later.\n\n💡 Tip: Try with a direct YouTube URL.");
        }

        // ── Download & Send Video ──
        try {
            console.log(`[VIDEO] Downloading from ${usedApi}...`);

            const downloadTimeout = isLongVideo ? 600000 : 180000;

            const videoBuffer = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: downloadTimeout,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
            });

            const fileSizeMB = (videoBuffer.data.length / (1024 * 1024)).toFixed(2);
            console.log(`[VIDEO] Downloaded ${fileSizeMB} MB from ${usedApi}`);

            // ── Check if response is HTML (error page) instead of video ──
            const bufferString = videoBuffer.data.toString('utf-8', 0, 500);
            if (bufferString.includes('<!DOCTYPE') || bufferString.includes('<html>')) {
                console.log(`[VIDEO] ⚠️ ${usedApi} returned HTML instead of video`);

                // Try remaining APIs
                const remainingApis = apis.filter(a => a.name !== usedApi);
                for (const api of remainingApis) {
                    try {
                        console.log(`[VIDEO] Retry with ${api.name}...`);
                        const link = await api.fn();
                        if (link) {
                            const retryBuffer = await axios.get(link, {
                                responseType: 'arraybuffer',
                                timeout: downloadTimeout,
                                maxContentLength: Infinity,
                                maxBodyLength: Infinity,
                                headers: { 'User-Agent': 'Mozilla/5.0' }
                            });

                            const retryStr = retryBuffer.data.toString('utf-8', 0, 500);
                            if (retryBuffer.data.length > 100000 && !retryStr.includes('<!DOCTYPE') && !retryStr.includes('<html>')) {
                                const retrySizeMB = (retryBuffer.data.length / (1024 * 1024)).toFixed(2);
                                await conn.sendMessage(from, {
                                    video: Buffer.from(retryBuffer.data),
                                    caption: `🎬 *${videoInfo.title || 'Video'}*\n\n📥 Downloaded via: ${api.name} ✅\n📦 Size: ${retrySizeMB} MB\n*© Powered by ERFAN-MD*`
                                }, { quoted: mek });
                                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                                return;
                            }
                        }
                    } catch (retryErr) {
                        console.log(`[VIDEO] ❌ ${api.name} retry failed: ${retryErr.message}`);
                    }
                }
                await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
                return await reply("❌ All APIs returned error pages. Try again later.");
            }

            // ── Send the video ──
            await conn.sendMessage(from, {
                video: Buffer.from(videoBuffer.data),
                caption: `🎬 *${videoInfo.title || 'Video'}*\n\n📥 Downloaded via: ${usedApi} ✅\n📦 Size: ${fileSizeMB} MB\n*© Powered by ERFAN-MD*`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            console.log(`[VIDEO] ✅ Successfully sent video (${fileSizeMB} MB)`);

        } catch (dlErr) {
            console.error('[VIDEO] Download error:', dlErr.message);

            if (dlErr.code === 'ECONNABORTED') {
                await reply(`❌ Download timed out! The video might be too long.\n\n💡 Try a shorter video.`);
            } else if (dlErr.response?.status === 404) {
                await reply(`❌ ${usedApi} link expired. Try again.`);
            } else {
                await reply(`❌ Failed to download video from ${usedApi}. Try again later.`);
            }
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("❌ Error in .video command:", e);
        await reply(`⚠️ Error: ${e.message || 'Something went wrong!'}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

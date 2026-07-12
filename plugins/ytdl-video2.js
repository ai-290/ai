import { fileURLToPath } from 'url';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ──────────────────────────────────────────────────────────────
// 🎬 VIDEO COMMAND (Fixed with New Working APIs)
// ──────────────────────────────────────────────────────────────
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "vz"],
    desc: "Download YouTube video (MP4) with new working APIs",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a YouTube video name or URL!\nExample: `.video alone marshmello`");

        let url = q;
        let videoInfo = null;
        let videoId = null;

        // Helper: Extract YouTube Video ID
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

        // ── Format helpers ──
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

        const durationSeconds = videoInfo.duration || 0;
        const durationDisplay = formatDuration(durationSeconds);

        // ── Send initial info ──
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

        // ── NEW API Priority List (Old broken APIs removed) ──
        const encodedUrl = encodeURIComponent(url);
        let downloadUrl = null;
        let usedApi = '';

        const apis = [
            { 
                name: 'EliteProTech', 
                fn: async () => {
                    const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp4?url=${encodedUrl}`, { 
                        timeout: 30000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (res.data?.status === true && res.data?.result?.url) {
                        return res.data.result.url;
                    }
                    throw new Error('EliteProTech failed');
                }
            },
            { 
                name: 'GiftedTech', 
                fn: async () => {
                    const res = await axios.get(`https://api.giftedtech.co.ke/api/download/ytmp4?apikey=gifted&url=${encodedUrl}&quality=720p`, { 
                        timeout: 30000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (res.data?.success === true && res.data?.result?.download_url) {
                        return res.data.result.download_url;
                    }
                    throw new Error('GiftedTech failed');
                }
            }
        ];

        // ── Try each API ──
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
                console.log(`[VIDEO] ❌ ${api.name} failed:`, e.message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!downloadUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ All APIs failed! Please try again later.\n\n💡 Try using a direct YouTube URL.");
        }

        // ── Send video directly via URL (No buffer download = No timeout!) ──
        try {
            console.log(`[VIDEO] Sending video via ${usedApi}...`);
            
            await conn.sendMessage(from, {
                video: { url: downloadUrl },
                caption: `🎬 *${videoInfo.title || 'Video'}*\n\n📥 Downloaded via: ${usedApi} ✅\n*© Powered by ERFAN-MD*`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            console.log(`[VIDEO] ✅ Successfully sent video via ${usedApi}`);

        } catch (sendErr) {
            console.error('[VIDEO] Direct URL send failed:', sendErr.message);
            
            // Fallback: Try downloading as buffer if direct URL fails
            try {
                console.log(`[VIDEO] Fallback: Downloading as buffer...`);
                const videoBuffer = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    timeout: 300000, // 5 minutes
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                const fileSizeMB = (videoBuffer.data.length / (1024 * 1024)).toFixed(2);
                
                await conn.sendMessage(from, {
                    video: Buffer.from(videoBuffer.data),
                    caption: `🎬 *${videoInfo.title || 'Video'}*\n\n📥 Downloaded via: ${usedApi} ✅\n📦 Size: ${fileSizeMB} MB\n*© Powered by ERFAN-MD*`
                }, { quoted: mek });

                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                console.log(`[VIDEO] ✅ Successfully sent video (${fileSizeMB} MB)`);
                
            } catch (dlErr) {
                console.error('[VIDEO] Buffer download also failed:', dlErr.message);
                await reply(`❌ Failed to send video from ${usedApi}. The link may have expired. Try again.`);
                await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            }
        }

    } catch (e) {
        console.error("❌ Error in .video command:", e);
        await reply(`⚠️ Error: ${e.message || 'Something went wrong!'}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

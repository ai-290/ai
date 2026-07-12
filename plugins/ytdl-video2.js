import { fileURLToPath } from 'url';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ──────────────────────────────────────────────────────────────
// 🎬 VIDEO COMMAND — Sirf Delirius API
// ──────────────────────────────────────────────────────────────

cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "az"],
    desc: "YouTube video download karein",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Bhai kuch likho toh sahi!\nExample: `.video alone marshmello`");

        let url = q;
        let videoInfo = null;
        let videoId = null;

        // ── URL hai ya search query? ──
        if (q.startsWith('http://') || q.startsWith('https://')) {
            if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
                return await reply("❌ Bhai valid YouTube URL do!");
            }
            videoId = getVideoId(q);
            if (!videoId) return await reply("❌ URL sahi nahi hai!");
            
            try {
                const searchFromUrl = await yts({ videoId });
                videoInfo = searchFromUrl;
            } catch (searchErr) {
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
                return await reply("❌ Koi video nahi mili! Koi aur naam try karo.");
            }
            
            videoInfo = searchResults.videos[0];
            url = videoInfo.url;
            videoId = getVideoId(url);
        }

        function getVideoId(url) {
            const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            return match ? match[1] : null;
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

        const durationSeconds = videoInfo.duration || 0;
        const durationDisplay = formatDuration(durationSeconds);

        // ── Pehle thumbnail aur info bhejo ──
        const caption = `*🎬 VIDEO DOWNLOADER*\n\n` +
                        `📌 *Title:* ${videoInfo.title || 'Unknown'}\n` +
                        `📺 *Channel:* ${videoInfo.author?.name || 'Unknown'}\n` +
                        `🕒 *Duration:* ${durationDisplay}\n` +
                        `⏳ *Status:* Download link le raha hoon...\n\n` +
                        `*© Powered by ERFAN-MD*`;

        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
            caption
        }, { quoted: mek });

        // ── Sirf Delirius API ──
        const encodedUrl = encodeURIComponent(url);
        let downloadUrl = null;

        try {
            console.log(`[VIDEO] Delirius API call...`);
            const res = await axios.get(`https://api.delirius.store/download/ytmp4?url=${encodedUrl}&format=360p`, { 
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (res.data?.status && res.data?.data?.download) {
                downloadUrl = res.data.data.download;
                console.log(`[VIDEO] ✅ Delirius se link mil gaya`);
            } else {
                throw new Error('Delirius se link nahi mila');
            }
        } catch (e) {
            console.log(`[VIDEO] ❌ Delirius failed:`, e.message);
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ Delirius API fail ho gayi! Thori der baad try karo.");
        }

        if (!downloadUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ Download link nahi mila! Dobara try karo.");
        }

        // ── Video download karo ──
        try {
            console.log(`[VIDEO] Delirius se download ho rahi hai...`);
            
            const videoBuffer = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 180000,
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
            console.log(`[VIDEO] Downloaded ${fileSizeMB} MB`);

            // Check karo ke video hai ya error page
            const bufferString = videoBuffer.data.toString('utf-8', 0, 500);
            if (bufferString.includes('<!DOCTYPE') || bufferString.includes('<html>')) {
                console.log(`[VIDEO] ⚠️ Delirius ne HTML bheja video ki jagah`);
                return await reply("❌ API ne error page bheja! Dobara try karo.");
            }

            // ── Video bhejo ──
            await conn.sendMessage(from, {
                video: Buffer.from(videoBuffer.data),
                caption: `🎬 *${videoInfo.title || 'Video'}*\n\n📦 Size: ${fileSizeMB} MB\n*© Powered by ERFAN-MD*`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            console.log(`[VIDEO] ✅ Video bhej di gayi (${fileSizeMB} MB)`);

        } catch (dlErr) {
            console.error('[VIDEO] Download error:', dlErr.message);
            
            if (dlErr.code === 'ECONNABORTED') {
                await reply(`❌ Download time khatam ho gaya! Video bohat lambi hai.`);
            } else if (dlErr.response?.status === 404) {
                await reply(`❌ Download link expire ho gaya. Dobara try karo.`);
            } else {
                await reply(`❌ Video download nahi ho saki. Dobara try karo.`);
            }
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (e) {
        console.error("❌ Error in .video command:", e);
        await reply(`⚠️ Error aa gaya: ${e.message || 'Kuch galt ho gaya!'}`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

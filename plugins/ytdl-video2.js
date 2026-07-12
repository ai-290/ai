import { fileURLToPath } from 'url';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ──────────────────────────────────────────────────────────────
// 🎬 VIDEO COMMAND — GTech API
// ──────────────────────────────────────────────────────────────

const DL_API = 'https://gtech-api-xtp1.onrender.com/api/video/yt';
const API_KEY = 'xbps-install-Syu'; // ⚠️ Apni asli API key yahan daalein

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const downloadWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: { apikey: API_KEY, url },
                timeout: 120000
            });
            if (data?.status && data?.code === 200 && data?.result?.media?.video_url)
                return data.result.media;
            throw new Error('No download URL');
        }
        catch (err) {
            if (i === retries - 1)
                throw err;
            console.log(`Download attempt ${i + 1} failed, retrying in 5s...`);
            await wait(5000);
        }
    }
    throw new Error('All download attempts failed');
};

cmd({
    pattern: "video",
    alias: ["ytmp4", "ytvideo", "ytdl"],
    desc: "YouTube video download karein",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q)
        return await reply('🎥 *Konsa video download karna hai?*\nExample:\n.video Alan Walker Faded');

    try {
        let videoUrl;
        let videoTitle;
        let videoThumbnail;

        if (q.startsWith('http://') || q.startsWith('https://')) {
            videoUrl = q;
        }
        else {
            const { videos } = await yts(q);
            if (!videos?.length)
                return await reply('❌ Koi video nahi mili!');
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        const validYT = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
        if (!validYT)
            return await reply('❌ Ye valid YouTube link nahi hai!');

        const ytId = validYT[1];
        const thumb = videoThumbnail || `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;

        await conn.sendMessage(from, {
            image: { url: thumb },
            caption: `🎬 *${videoTitle || q}*\n⬇️ Download ho rahi hai... *(thora wait karo)*`
        }, { quoted: mek });

        const videoData = await downloadWithRetry(videoUrl);

        await conn.sendMessage(from, {
            video: { url: videoData.video_url },
            mimetype: 'video/mp4',
            fileName: `${videoData.title || videoTitle || 'video'}.mp4`,
            caption: `🎬 *${videoData.title || videoTitle || 'Video'}*\n\n> *_Downloaded by ERFAN-MD_*`
        }, { quoted: mek });

    }
    catch (err) {
        console.error('[VIDEO] Error:', err.message);
        const reason = err.response?.status === 408
            ? 'Download time khatam ho gaya. Dobara try karo.'
            : err.message;
        await reply(`❌ Download fail ho gaya!\nReason: ${reason}`);
    }
});

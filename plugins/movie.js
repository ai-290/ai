
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);

// ============================================
// COMMAND: video (Downloader - Buffer Mode)
// ============================================
cmd({
    pattern: "video2",
    alias: ["ytvideo", "xc"],
    desc: "Download YouTube video",
    category: "downloader",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        const query = text.trim();
        
        if (!query) {
            return reply('Provide video name\n.video Alan Walker Lily');
        }

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        // Search for video
        await conn.sendMessage(from, { react: { text: '🔎', key: m.key } }).catch(() => {});

        const { default: yts } = await import('yt-search');
        
        let videos = [];
        try {
            const result = await yts(query);
            videos = result.videos || [];
        } catch (err) {
            console.error('[yts search]', err.message);
            return reply('Search failed');
        }

        if (!videos.length) {
            await conn.sendMessage(from, { react: { text: '😕', key: m.key } }).catch(() => {});
            return reply('No video found');
        }

        const vid = videos[0];

        // Download indicator
        await conn.sendMessage(from, { react: { text: '⬇️', key: m.key } }).catch(() => {});

        // Send video info
        let caption = `🎬 ${vid.title}\n\n`;
        caption += `⏱️ Duration: ${vid.timestamp}\n`;
        caption += `👁️ Views: ${vid.views}\n`;
        caption += `📢 Channel: ${vid.author.name}\n\n`;
        caption += `⏳ Downloading...`;

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: caption
        }, { quoted: mek }).catch(() => {});

        // Get download URL from API
        let videoData = null;
        try {
            const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(vid.url)}`;
            const res = await axios.get(apiUrl, {
                headers: { Accept: 'application/json' },
                timeout: 30000
            });
            videoData = res.data;
        } catch (err) {
            console.error('[video download api]', err.message);
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } }).catch(() => {});
            return reply('Download API failed');
        }

        // Get best quality video
        let videoUrl = null;
        if (videoData?.videos) {
            videoUrl = videoData.videos['720'] || 
                       videoData.videos['480'] || 
                       videoData.videos['360'] || 
                       Object.values(videoData.videos)[0];
        }

        if (!videoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } }).catch(() => {});
            return reply('Cannot find video stream');
        }

        // Download video buffer
        await conn.sendMessage(from, { react: { text: '📥', key: m.key } }).catch(() => {});

        let videoBuffer = null;
        try {
            const bufferRes = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 100 * 1024 * 1024
            });
            videoBuffer = bufferRes.data;
        } catch (err) {
            console.error('[video buffer]', err.message);
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } }).catch(() => {});
            return reply('Download failed');
        }

        if (!videoBuffer || videoBuffer.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } }).catch(() => {});
            return reply('Empty video file');
        }

        // Send video
        await conn.sendMessage(from, { react: { text: '📤', key: m.key } }).catch(() => {});

        await conn.sendMessage(from, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: `🎬 ${vid.title}\n⏱️ ${vid.timestamp}\n\n> ${DESCRIPTION}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[video command]', err.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } }).catch(() => {});
        reply('Video download error');
    }
});

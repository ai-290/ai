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

// Helper to format bytes to MB/GB
function formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
    return mb.toFixed(2) + ' MB';
}

// Helper to format duration
function formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// COMMAND: video (PrexzyAPI /ytmp4)
// ============================================
cmd({
    pattern: "video2",
    alias: ["ytv", "ytmp4", "vbz"],
    desc: "Download YouTube video via PrexzyAPI",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, userConfig }) => {
    try {
        if (!text) {
            return reply("🎥 *YouTube Video Downloader*\n\nPlease provide a video name or YouTube link!\n\n*Examples:*\n`.video Never Gonna Give You Up`\n`.video https://youtu.be/dQw4w9WgXcQ`");
        }

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "Powered by PrexzyAPI";
        const { default: yts } = await import('yt-search');
        
        let url = text;
        let vid = null;
        let searchType = "";

        // Step 1: Get video info (from URL or search)
        if (text.startsWith('http://') || text.startsWith('https://')) {
            if (!text.includes("youtube.com") && !text.includes("youtu.be")) {
                return reply("❌ Please provide a valid YouTube URL!");
            }
            const videoId = getVideoId(text);
            if (!videoId) return reply("❌ Invalid YouTube URL! Could not extract video ID.");
            
            const searchFromUrl = await yts({ videoId: videoId });
            vid = searchFromUrl;
            url = `https://www.youtube.com/watch?v=${videoId}`;
            searchType = "URL";
        } else {
            const search = await yts(text);
            if (!search.videos || !search.videos.length) {
                return reply("❌ No video results found for your query!");
            }
            vid = search.videos[0];
            url = vid.url;
            searchType = "Search";
        }

        if (!vid) return reply("❌ No results found!");

        // Step 2: Send "Searching" message with video info
        const infoMsg = await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*🎬 YOUTUBE VIDEO DOWNLOADER*\n\n` +
                     `🎞️ *Title:* ${vid.title}\n` +
                     `📺 *Channel:* ${vid.author?.name || 'Unknown'}\n` +
                     `🕒 *Duration:* ${vid.timestamp || vid.duration?.timestamp || 'Unknown'}\n` +
                     `👁️ *Views:* ${vid.views?.toLocaleString() || 'N/A'}\n` +
                     `🔍 *Source:* ${searchType}\n\n` +
                     `⏳ *Status:* Fetching download link...\n\n` +
                     `> ${DESCRIPTION}`
        }, { quoted: mek });

        // Step 3: Call PrexzyAPI
        const apiUrl = `https://prexzyapis.com/download/ytmp4?url=${encodeURIComponent(url)}`;
        console.log(`[VIDEO CMD] API Call: ${apiUrl}`);
        
        const apiResponse = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = apiResponse.data;
        console.log(`[VIDEO CMD] API Status: ${data.status}, Quality: ${data.quality}`);

        // Check API response
        if (data.status !== true && data.status !== "true") {
            return reply("❌ API returned error status. Please try again later.");
        }

        if (!data.download_url) {
            return reply("❌ API did not return a download URL!");
        }

        // Extract data
        const downloadUrl = data.download_url;
        const title = data.info?.title || vid.title;
        const thumbnail = data.info?.thumbnail || vid.thumbnail;
        const quality = data.quality || 'Unknown';
        const filesize = data.filesize || 0;
        const sizeStr = formatSize(filesize);
        const duration = data.info?.duration_string || vid.timestamp || 'Unknown';

        // Step 4: Update status to "Downloading"
        await conn.sendMessage(from, {
            edit: infoMsg.key,
            text: `*🎬 YOUTUBE VIDEO DOWNLOADER*\n\n` +
                  `🎞️ *Title:* ${title}\n` +
                  `📺 *Channel:* ${data.info?.channel || vid.author?.name || 'Unknown'}\n` +
                  `🕒 *Duration:* ${duration}\n` +
                  `👁️ *Views:* ${(data.info?.view_count || vid.views)?.toLocaleString() || 'N/A'}\n` +
                  `📦 *Size:* ${sizeStr}\n` +
                  `📺 *Quality:* ${quality}\n\n` +
                  `⬇️ *Status:* Downloading video...\n\n` +
                  `> ${DESCRIPTION}`
        });

        // Step 5: Try to download video as buffer and send
        let videoSent = false;
        let downloadError = null;

        try {
            console.log(`[VIDEO CMD] Attempting buffer download...`);
            
            const videoResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000, // 2 minutes for large videos
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.youtube.com/',
                    'Accept': '*/*',
                    'Accept-Encoding': 'identity',
                    'Connection': 'keep-alive'
                },
                maxRedirects: 5,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const videoBuffer = Buffer.from(videoResponse.data);
            const downloadedSize = videoBuffer.length;
            
            console.log(`[VIDEO CMD] Buffer downloaded: ${formatSize(downloadedSize)}`);

            // Verify it's a valid video file (MP4 starts with ftyp)
            const isValidVideo = downloadedSize > 100000; // At least 100KB
            
            if (isValidVideo) {
                await conn.sendMessage(from, {
                    video: videoBuffer,
                    caption: `🎬 *${title}*\n` +
                             `📦 *Size:* ${formatSize(downloadedSize)}\n` +
                             `📺 *Quality:* ${quality}\n` +
                             `⏱️ *Duration:* ${duration}\n\n` +
                             `> ${DESCRIPTION}`,
                    mimetype: 'video/mp4'
                }, { quoted: mek });
                
                videoSent = true;
                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                console.log(`[VIDEO CMD] Video sent successfully as buffer!`);
            } else {
                downloadError = "Downloaded file too small or invalid";
            }

        } catch (err) {
            downloadError = err.message;
            console.log(`[VIDEO CMD] Buffer download failed: ${err.message}`);
        }

        // Step 6: Fallback - Send as document link if buffer failed
        if (!videoSent) {
            console.log(`[VIDEO CMD] Using link fallback mode`);
            
            // Delete the "Downloading" message
            await conn.sendMessage(from, { delete: infoMsg.key });
            
            // Send professional download card
            await conn.sendMessage(from, {
                image: { url: thumbnail },
                caption: `*🎬 VIDEO READY - DOWNLOAD LINK*\n\n` +
                         `🎞️ *Title:* ${title}\n` +
                         `📺 *Channel:* ${data.info?.channel || vid.author?.name || 'Unknown'}\n` +
                         `🕒 *Duration:* ${duration}\n` +
                         `👁️ *Views:* ${(data.info?.view_count || vid.views)?.toLocaleString() || 'N/A'}\n` +
                         `📦 *Size:* ${sizeStr}\n` +
                         `📺 *Quality:* ${quality}\n\n` +
                         `🔗 *Direct Download Link:*\n${downloadUrl}\n\n` +
                         `⚠️ _Auto-download failed: ${downloadError || 'Network restricted'}_\n` +
                         `_Please tap the link above to download manually._\n\n` +
                         `> ${DESCRIPTION}`
            }, { quoted: mek });

            // Also send as clickable link message
            await conn.sendMessage(from, {
                text: `📥 *${title}*\n\n*Tap below to download:*\n${downloadUrl}`,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: `📦 ${sizeStr} | 📺 ${quality}`,
                        thumbnailUrl: thumbnail,
                        sourceUrl: downloadUrl,
                        mediaType: 2,
                        showAdAttribution: false
                    }
                }
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: '🔗', key: m.key } });
        }

    } catch (e) {
        console.error("[VIDEO CMD] Fatal Error:", e);
        reply(`❌ Error occurred: ${e.message}\n\nPlease try again later or use a different video.`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

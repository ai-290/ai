// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import config from '../config.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// plugins/autodl.js

// Global variable to track auto-downloader status - starts DISABLED
let autoDownloaderEnabled = false;

// Platform URLs and their APIs
const platforms = {
    youtube: {
        pattern: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})(?:\S+)?/gi,
        api: "https://api.deline.web.id/downloader/youtube",
        method: "video"
    },
    facebook: {
        pattern: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch|fb\.com)\/[^\s]+/gi,
        api: "https://api.nexray.eu.cc/downloader/facebook",
        method: "video"
    },
    instagram: {
        pattern: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv|reels)\/[^\s\/]+/gi,
        api: "https://jerrycoder.oggyapi.workers.dev/down/insta",
        method: "media"
    },
    tiktok: {
        pattern: /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/[^\s]+/gi,
        api: "https://tikwm.com/api",
        method: "video"
    },
    github: {
        pattern: /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s]+/gi,
        api: "https://api.nexray.eu.cc/downloader/github",
        method: "file"
    },
    mediafire: {
        pattern: /(?:https?:\/\/)?(?:www\.)?mediafire\.com\/[^\s]+/gi,
        api: "https://api.nexray.eu.cc/downloader/mediafire",
        method: "file"
    },
    mega: {
        pattern: /(?:https?:\/\/)?mega\.nz\/[^\s]+/gi,
        api: "https://api.nexray.eu.cc/downloader/mega",
        method: "file"
    }
};

// ---------- COMMAND TO TOGGLE AUTO-DOWNLOADER ----------

cmd({
    pattern: "autodownload",
    alias: ["autodl", "ad"],
    desc: "Toggle auto downloader on/off",
    category: "download",
    filename: __filename
}, async (client, message, store, {
    from,
    reply,
    args,
    isCreator,
    isGroup
}) => {
    try {
        if (!isCreator) {
            return reply("❌ *Only bot owner can use this command!*");
        }

        if (args[0]) {
            const action = args[0].toLowerCase();
            
            if (action === "on" || action === "enable" || action === "true") {
                autoDownloaderEnabled = true;
                return reply("✅ *Auto Downloader has been ENABLED!*\n\n📱 Now bot will automatically download from:\n• YouTube\n• Instagram\n• TikTok\n• Facebook\n• GitHub\n• MediaFire\n• Mega");
            }
            else if (action === "off" || action === "disable" || action === "false") {
                autoDownloaderEnabled = false;
                return reply("❌ *Auto Downloader has been DISABLED!*\n\n🚫 Bot will no longer auto-download links.");
            }
            else {
                return reply("❓ *Invalid option!*\n\nUsage:\n• `autodl on` - Enable auto downloader\n• `autodl off` - Disable auto downloader\n• `autodl` - Check current status");
            }
        } else {
            const status = autoDownloaderEnabled ? "✅ ENABLED" : "❌ DISABLED";
            const platforms_list = autoDownloaderEnabled ? 
                "\n\n📱 *Supported Platforms:*\n• YouTube\n• Instagram\n• TikTok\n• Facebook\n• GitHub\n• MediaFire\n• Mega" : 
                "\n\n🚫 *No platforms active*";
            
            return reply(`🤖 *Auto Downloader Status:* ${status}${platforms_list}\n\n*Usage:*\n• \`autodl on\` - Enable\n• \`autodl off\` - Disable`);
        }
    } catch (error) {
        console.error("[AUTODL-CMD] Error:", error);
        reply("❌ *Error occurred while toggling auto downloader!*");
    }
});

// ---------- HELPER FUNCTIONS ----------

const createCaption = () => {
    return `> *© ${config.BOT_NAME} Auto Downloader*`;
};

const extractUrl = (text, pattern) => {
    if (!text) return null;
    const match = text.match(pattern);
    if (match && match[0]) {
        let url = match[0].trim();
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        return url;
    }
    return null;
};

// ---------- MAIN AUTO-DOWNLOAD HANDLER (BODY LISTENER) ----------

cmd({
    'on': "body"
}, async (client, message, store, {
    from,
    body,
    isGroup,
    isAdmins,
    isBotAdmins,
    isCreator,
    reply,
    sender
}) => {
    try {
        if (!autoDownloaderEnabled) return;
        if (!body || typeof body !== 'string' || body.length < 10) return;

        let matchedPlatform = null;
        let matchedUrl = null;
        
        for (const [platform, data] of Object.entries(platforms)) {
            const url = extractUrl(body, data.pattern);
            if (url) {
                matchedPlatform = platform;
                matchedUrl = url;
                console.log(`[AUTO-DL] Detected ${platform} URL: ${url}`);
                break;
            }
        }
        
        if (!matchedPlatform || !matchedUrl) return;

        const caption = createCaption();
        
        await client.sendMessage(from, { react: { text: '⏳', key: message.key } });

        try {
            await handleApiDownload(client, from, matchedUrl, matchedPlatform, caption, message);
            await client.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (apiError) {
            console.error(`[AUTO-DL] Error for ${matchedPlatform}:`, apiError.message);
            await client.sendMessage(from, { react: { text: '❌', key: message.key } });
        }

    } catch (error) {
        console.error("[AUTO-DL] Main error:", error);
    }
});

// ---------- API DISPATCHER ----------

async function handleApiDownload(client, from, url, platformType, caption, message) {
    try {
        switch (platformType) {
            case "instagram":
                return await handleInstagram(client, from, url, caption, message);
            case "tiktok":
                return await handleTikTok(client, from, url, caption, message);
            case "youtube":
                return await handleYouTube(client, from, url, caption, message);
            case "facebook":
                return await handleFacebook(client, from, url, caption, message);
            case "github":
                return await handleGitHub(client, from, url, caption, message);
            case "mediafire":
                return await handleMediaFire(client, from, url, caption, message);
            case "mega":
                return await handleMega(client, from, url, caption, message);
            default:
                throw new Error("Unsupported platform");
        }
    } catch (error) {
        console.error(`[AUTO-DL] API error for ${platformType}:`, error.message);
        throw error;
    }
}

// ---------- YOUTUBE HANDLER ----------

async function handleYouTube(client, from, url, caption, message) {
    try {
        const apiUrl = `https://api.deline.web.id/downloader/youtube?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        
        if (!response.data?.status || !response.data?.result) {
            throw new Error("Failed to fetch YouTube video");
        }

        const result = response.data.result;
        const medias = result.medias || [];
        
        if (medias.length === 0) {
            throw new Error("No media streams found");
        }

        let selectedMedia = null;
        selectedMedia = medias.find(m => m.formatId === 18 && m.url);
        if (!selectedMedia) {
            selectedMedia = medias.find(m => m.type === 'video' && m.ext === 'mp4' && m.audioQuality && m.url);
        }
        if (!selectedMedia) {
            selectedMedia = medias.find(m => m.type === 'video' && m.url);
        }
        if (!selectedMedia) {
            selectedMedia = medias.find(m => m.url);
        }
        
        if (!selectedMedia || !selectedMedia.url) {
            throw new Error("No downloadable URL found");
        }

        const videoUrl = selectedMedia.url;
        const qualityLabel = selectedMedia.label || selectedMedia.quality || 'default';
        const title = result.title || 'YouTube Video';
        const finalCaption = `*${title}*\n*Quality:* ${qualityLabel}\n\n${caption}`;

        await client.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: finalCaption
        }, { quoted: message });

    } catch (error) {
        console.error("[AUTO-DL] YouTube error:", error);
        throw error;
    }
}

// ---------- INSTAGRAM HANDLER (FIXED - Using Working API) ----------

async function handleInstagram(client, from, url, caption, message) {
    try {
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!data || data.status !== "success" || !data.data || !data.data.url) {
            throw new Error("Failed to fetch Instagram media");
        }

        const media = data.data;
        const finalCaption = `🎬 *INSTAGRAM DOWNLOADER*\n📦 *Type:* ${media.type || 'Unknown'}\n\n${caption}`;

        if (media.type === "video") {
            await client.sendMessage(from, {
                video: { url: media.url },
                caption: finalCaption,
                mimetype: 'video/mp4'
            }, { quoted: message });
        } else {
            await client.sendMessage(from, {
                image: { url: media.url },
                caption: finalCaption,
                mimetype: 'image/jpeg'
            }, { quoted: message });
        }
    } catch (error) {
        console.error("[AUTO-DL] Instagram error:", error.message);
        throw error;
    }
}

// ---------- TIKTOK HANDLER (FIXED - Using Working API) ----------

async function handleTikTok(client, from, url, caption, message) {
    try {
        const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
        const { data } = await axios.get(apiUrl, { timeout: 20000 });
        
        if (!data || data.code !== 0 || !data.data) {
            throw new Error("Failed to fetch TikTok video");
        }

        const res = data.data;
        const title = res.title || 'TikTok Video';
        const uploader = res.author?.nickname || res.author?.unique_id || 'Unknown';
        const finalCaption = `🎵 *TIKTOK DOWNLOADER*\n📝 *Title:* ${title}\n👤 *Author:* ${uploader}\n\n${caption}`;

        // If it's a slideshow (images)
        if (Array.isArray(res.images) && res.images.length > 0) {
            let total = res.images.length;
            let index = 1;

            for (const img of res.images) {
                await client.sendMessage(from, {
                    image: { url: img },
                    caption: `🖼️ *Slide ${index} / ${total}*\n\n${finalCaption}`
                }, { quoted: message });
                index++;
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            return;
        }

        // If it's a video
        if (res.play) {
            await client.sendMessage(from, {
                video: { url: res.play },
                mimetype: 'video/mp4',
                caption: finalCaption
            }, { quoted: message });
        } else {
            throw new Error("No video or images found");
        }
    } catch (error) {
        console.error("[AUTO-DL] TikTok error:", error.message);
        throw error;
    }
}

// ---------- FACEBOOK HANDLER ----------

async function handleFacebook(client, from, url, caption, message) {
    try {
        const apiUrl = `https://api.nexray.eu.cc/downloader/facebook?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!response.data?.status || !response.data.result) {
            throw new Error("Failed to fetch Facebook video");
        }

        const result = response.data.result;
        const videoUrl = result.video_hd || result.video_sd || result.url || result.download_url;
        
        if (!videoUrl) {
            throw new Error("No video URL found");
        }

        const finalCaption = result.title ? `*${result.title}*\n\n${caption}` : caption;
        
        await client.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: finalCaption
        }, { quoted: message });
    } catch (error) {
        console.error("[AUTO-DL] Facebook error:", error);
        throw error;
    }
}

// ---------- GITHUB HANDLER ----------

async function handleGitHub(client, from, url, caption, message) {
    try {
        const apiUrl = `https://api.nexray.eu.cc/downloader/github?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!response.data?.status || !response.data.result) {
            throw new Error("Failed to fetch GitHub repository");
        }

        const result = response.data.result;
        const downloadUrl = result.url || result.download_url;
        const filename = result.filename || 'github-repo.zip';
        
        if (!downloadUrl) {
            throw new Error("No download URL found");
        }

        const finalCaption = `*📁 ${result.repo || 'Repository'}*\n*Branch:* ${result.branch || 'main'}\n*File:* ${filename}\n\n${caption}`;
        
        await client.sendMessage(from, {
            document: { url: downloadUrl },
            fileName: filename,
            mimetype: 'application/zip',
            caption: finalCaption
        }, { quoted: message });
    } catch (error) {
        console.error("[AUTO-DL] GitHub error:", error);
        throw error;
    }
}

// ---------- MEDIAFIRE HANDLER ----------

async function handleMediaFire(client, from, url, caption, message) {
    try {
        const apiUrl = `https://api.nexray.eu.cc/downloader/mediafire?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!response.data?.status || !response.data.result) {
            throw new Error("Failed to fetch MediaFire file");
        }

        const result = response.data.result;
        const downloadUrl = result.download_url || result.url;
        const filename = result.filename || 'mediafire-file';
        const mimetype = result.mimetype || 'application/octet-stream';
        
        if (!downloadUrl) {
            throw new Error("No download URL found");
        }

        const finalCaption = `*📎 ${filename}*\n*Size:* ${result.filesize || 'Unknown'}\n*Type:* ${mimetype}\n\n${caption}`;
        
        if (mimetype.startsWith('image/')) {
            await client.sendMessage(from, {
                image: { url: downloadUrl },
                caption: finalCaption
            }, { quoted: message });
        } else if (mimetype.startsWith('video/')) {
            await client.sendMessage(from, {
                video: { url: downloadUrl },
                caption: finalCaption
            }, { quoted: message });
        } else {
            await client.sendMessage(from, {
                document: { url: downloadUrl },
                fileName: filename,
                mimetype: mimetype,
                caption: finalCaption
            }, { quoted: message });
        }
    } catch (error) {
        console.error("[AUTO-DL] MediaFire error:", error);
        throw error;
    }
}

// ---------- MEGA HANDLER ----------

async function handleMega(client, from, url, caption, message) {
    try {
        const apiUrl = `https://api.nexray.eu.cc/downloader/mega?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!response.data?.status || !response.data.result) {
            throw new Error("Failed to fetch Mega file");
        }

        const result = response.data.result;
        const downloadUrl = result.download_url || result.url;
        const filename = result.filename || 'mega-file';
        const mimetype = result.mimetype || 'application/octet-stream';
        
        if (!downloadUrl) {
            throw new Error("No download URL found");
        }

        const finalCaption = `*☁️ ${filename}*\n*Size:* ${result.filesize || 'Unknown'}\n*Type:* ${mimetype}\n\n${caption}`;
        
        if (mimetype.startsWith('image/')) {
            await client.sendMessage(from, {
                image: { url: downloadUrl },
                caption: finalCaption
            }, { quoted: message });
        } else if (mimetype.startsWith('video/')) {
            await client.sendMessage(from, {
                video: { url: downloadUrl },
                caption: finalCaption
            }, { quoted: message });
        } else {
            await client.sendMessage(from, {
                document: { url: downloadUrl },
                fileName: filename,
                mimetype: mimetype,
                caption: finalCaption
            }, { quoted: message });
        }
    } catch (error) {
        console.error("[AUTO-DL] Mega error:", error);
        throw error;
    }
}

console.log("[AUTO-DL] Auto Downloader Plugin Loaded - DISABLED by default (use .autodl on to enable) ✓");

// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 📘 FACEBOOK COMMAND - SNAPSAVE SCRAPER (NO API KEY)
// ═══════════════════════════════════════════════════════════

const SNAPSAVE_API = "https://snapsave.app/action.php";

function normalizeFacebookURL(url) {
    // Fix common Facebook URL variations
    if (url.includes('fb.watch')) {
        return url;
    }
    if (!url.includes('www.') && url.includes('facebook.com')) {
        url = url.replace('facebook.com', 'www.facebook.com');
    }
    return url;
}

async function getFacebookVideo(url) {
    const normalizedUrl = normalizeFacebookURL(url);
    
    // SnapSave uses form-data style request
    const formData = new URLSearchParams();
    formData.append('url', normalizedUrl);
    
    const { data } = await axios.post(SNAPSAVE_API, formData.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://snapsave.app',
            'Referer': 'https://snapsave.app/'
        },
        timeout: 30000
    });

    // SnapSave returns HTML with embedded JSON or direct JSON
    // Try to extract JSON from response
    let result;
    try {
        // Sometimes it's wrapped in a callback or HTML
        if (typeof data === 'string') {
            // Try to find JSON in the response
            const jsonMatch = data.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Invalid response format');
            }
        } else {
            result = data;
        }
    } catch (e) {
        throw new Error('Failed to parse SnapSave response');
    }

    return result;
}

// Alternative: Use the snapsaver-downloader package approach directly
async function getFacebookVideoDirect(url) {
    const normalizedUrl = normalizeFacebookURL(url);
    
    const { data } = await axios.post('https://snapsave.app/action.php', 
        `url=${encodeURIComponent(normalizedUrl)}`, 
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://snapsave.app',
                'Referer': 'https://snapsave.app/'
            },
            timeout: 30000
        }
    );
    
    return data;
}

cmd({
    pattern: "facebook",
    alias: ["fb", "fbdl"],
    desc: "Download Facebook video using SnapSave scraper",
    category: "download",
    react: "📘",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        // Validate input
        if (!q) {
            return await reply(
                `📘 *Facebook Downloader*\n\n` +
                `Please provide a Facebook video link!\n\n` +
                `*Example:*\n` +
                `.fb https://www.facebook.com/watch/?v=1234567890\n` +
                `.fb https://fb.watch/abcdef123/`
            );
        }

        // Validate Facebook URL
        if (!q.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch|fb\.com)/i)) {
            return await reply('⚠️ Please send a valid Facebook link!');
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        await reply('⏳ *Fetching video from Facebook...*');

        const result = await getFacebookVideo(q);

        // Parse SnapSave response format
        let videoUrl = null;
        let title = 'Facebook Video';
        let thumbnail = null;
        let duration = 'N/A';
        let quality = 'HD';

        // Handle different response formats from SnapSave
        if (result && typeof result === 'object') {
            // Format 1: Direct data object
            if (result.data && Array.isArray(result.data)) {
                const video = result.data.find(item => item.type === 'video') || result.data[0];
                if (video) {
                    videoUrl = video.url;
                    title = video.title || title;
                    thumbnail = video.thumbnail;
                    quality = video.resolution || quality;
                }
            }
            // Format 2: Nested media array
            else if (result.media && Array.isArray(result.media)) {
                const video = result.media.find(item => item.type === 'video') || result.media[0];
                if (video) {
                    videoUrl = video.url;
                    title = result.description || title;
                    thumbnail = video.thumbnail;
                    quality = video.resolution || quality;
                }
            }
            // Format 3: Direct url field
            else if (result.url) {
                videoUrl = result.url;
                title = result.title || title;
            }
            // Format 4: Array of download links
            else if (Array.isArray(result)) {
                const video = result.find(item => item.type === 'video') || result[0];
                if (video) {
                    videoUrl = video.url;
                    title = video.title || title;
                }
            }
        }

        if (!videoUrl) {
            throw new Error('Could not extract video URL. The video might be private or unavailable.');
        }

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";

        const caption = `┌˚₊ ๑│ ғ ᴀ ᴄ ᴇ ʙ ᴏ ᴏ ᴋ  ᴅ ʟ │๑˚₊ 📘
┇ 
│ 🎬 *Title:* ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}
│ 🌟 *Quality:* ${quality}
│ ⏱️ *Duration:* ${duration}
┇ 
└˚₊ ๑ ────────────── ๑˚₊
> © ${BOT_NAME}`;

        // Send video
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption,
            ...(thumbnail ? { jpegThumbnail: thumbnail } : {})
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("❌ Error in .facebook:", e);
        await reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Failed to download Facebook video:\n┇ ${e.message || e}\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERFAN-MD`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

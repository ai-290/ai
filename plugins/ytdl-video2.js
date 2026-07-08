
// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import youtubesearchapi from 'youtube-search-api';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 📺 YOUTUBE VIDEO COMMAND - SEARCH + DOWNLOAD (NO API KEY)
// ═══════════════════════════════════════════════════════════

const YT_CONVERTER_API = "https://cnv.cx";

const ytConverter = {
  static: Object.freeze({
    baseUrl: YT_CONVERTER_API,
    headers: {
      'accept-encoding': 'gzip, deflate, br, zstd',
      'origin': 'https://frame.y2meta-uk.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
    }
  }),
  resolveConverterPayload(link, f = '128k') {
    const a = ['128k', '320k', '144p', '240p', '360p', '720p', '1080p']
    if (!a.includes(f)) throw Error(`invalid format. available: ${a.join(', ')}`)
    const t = f.endsWith('k') ? 'mp3' : 'mp4'
    const b = t === 'mp3' ? parseInt(f) + '' : '128'
    const v = t === 'mp4' ? parseInt(f) + '' : '720'
    return { link, format: t, audioBitrate: b, videoQuality: v, filenameStyle: 'pretty', vCodec: 'h264' }
  },
  sanitizeFileName(n) {
    const e = n.match(/\.[^.]+$/)[0]
    const f = n.replace(new RegExp(`\\${e}$`), '').replaceAll(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').toLowerCase()
    return f + e
  },
  async getBuffer(u) {
    const h = structuredClone(this.static.headers)
    h.referer = 'https://v6.www-y2mate.com/'
    h.range = 'bytes=0-'
    delete h.origin
    const r = await fetch(u, { headers: h })
    if (!r.ok) throw Error(`${r.status} ${r.statusText}`)
    const ab = await r.arrayBuffer()
    return Buffer.from(ab)
  },
  async getKey() {
    const r = await fetch(this.static.baseUrl + '/v2/sanity/key', { headers: this.static.headers })
    if (!r.ok) throw Error(`${r.status} ${r.statusText}`)
    return await r.json()
  },
  async convert(u, f) {
    const { key } = await this.getKey()
    const p = this.resolveConverterPayload(u, f)
    const h = { key, ...this.static.headers }
    const r = await fetch(this.static.baseUrl + '/v2/converter', { headers: h, method: 'post', body: new URLSearchParams(p) })
    if (!r.ok) throw Error(`${r.status} ${r.statusText}`)
    return await r.json()
  },
  async download(u, f) {
    const { url, filename } = await this.convert(u, f)
    const buffer = await this.getBuffer(url)
    return { fileName: this.sanitizeFileName(filename), buffer }
  }
};

async function searchYouTube(query) {
  const result = await youtubesearchapi.GetListByKeyword(query, false, 5, [{ type: 'video' }]);
  
  if (!result || !result.items || result.items.length === 0) {
    throw new Error('No videos found for your search query.');
  }

  // Pick the first video result
  const video = result.items[0];
  
  return {
    id: video.id,
    title: video.title,
    thumbnail: video.thumbnail?.url,
    channel: video.channelTitle,
    duration: video.length?.simpleText || 'N/A',
    url: `https://www.youtube.com/watch?v=${video.id}`
  };
}

cmd({
    pattern: "ytv2",
    alias: ["ytvid", "ytvideo2", "ytv"],
    desc: "Download YouTube video by link or search",
    category: "downloader",
    react: "📺",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        if (!q) {
            return await reply(
                `📺 *YouTube Video Downloader*\n\n` +
                `Search by name or use direct link!\n\n` +
                `*Search Example:*\n` +
                `.ytv2 Alan Walker Faded\n` +
                `.ytv2 PewDiePie funny moments\n\n` +
                `*Link Example:*\n` +
                `.ytv2 https://youtu.be/JiEW1agPqNY\n` +
                `.ytv2 https://youtube.com/watch?v=JiEW1agPqNY 720p`
            );
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let videoUrl = q;
        let videoInfo = null;
        let quality = '1080p';

        // Check if input is a URL or search query
        const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/i.test(q);

        if (!isUrl) {
            // It's a search query
            await reply(`🔍 *Searching YouTube for:* ${q}`);
            
            const searchResult = await searchYouTube(q);
            
            videoUrl = searchResult.url;
            videoInfo = searchResult;
            quality = '1080p'; // Default quality for search
            
            await reply(
                `✅ *Video Found!*\n\n` +
                `🎬 *Title:* ${searchResult.title}\n` +
                `👤 *Channel:* ${searchResult.channel}\n` +
                `⏱️ *Duration:* ${searchResult.duration}\n\n` +
                `⏳ *Downloading...*`
            );
        } else {
            // It's a URL - extract quality if provided
            const parts = q.trim().split(/\s+/);
            videoUrl = parts[0];
            if (parts[1] && /^\d+p$/.test(parts[1])) {
                quality = parts[1];
            }
            
            await reply(`⏳ *Downloading video in ${quality}...*`);
        }

        // Download video
        let { buffer, fileName } = await ytConverter.download(videoUrl, quality);

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";

        const caption = videoInfo 
            ? `┌˚₊ ๑│ ʏ ᴏ ᴜ ᴛ ᴜ ʙ ᴇ  ᴅ ʟ │๑˚₊ 📺\n┇ \n│ 🎬 *Title:* ${videoInfo.title}\n│ 👤 *Channel:* ${videoInfo.channel}\n│ ⏱️ *Duration:* ${videoInfo.duration}\n│ 🌟 *Quality:* ${quality}\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ${BOT_NAME}`
            : `┌˚₊ ๑│ ʏ ᴏ ᴜ ᴛ ᴜ ʙ ᴇ  ᴅ ʟ │๑˚₊ 📺\n┇ \n│ 🎬 *Quality:* ${quality}\n┇ \n└˚₊ ๑ ────────────── ๑˚₊\n> © ${BOT_NAME}`;

        // Send video
        await conn.sendMessage(from, {
            video: buffer,
            mimetype: 'video/mp4',
            fileName: fileName,
            caption: caption
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("❌ Error in .ytv2:", e);
        
        let errorMsg = e.message || 'Unknown error';
        
        if (errorMsg.includes('invalid format')) {
            errorMsg = 'Invalid quality! Available: 144p, 240p, 360p, 720p, 1080p';
        } else if (errorMsg.includes('No videos found')) {
            errorMsg = 'No videos found for your search. Try different keywords.';
        } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
            errorMsg = 'Download server is down. Please try again later.';
        }

        await reply(`┌˚₊ ๑│ s ʏ s ᴛ ᴇ ᴍ  ᴇ ʀ ʀ ᴏ ʀ │๑˚₊ ❌\n┇ Failed to download YouTube video:\n┇ ${errorMsg}\n└˚₊ ๑ ────────────── ๑˚₊\n> © ERFAN-MD`);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

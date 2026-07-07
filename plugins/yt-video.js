// ERFAN-MD
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ═══════════════════════════════════════════════════════════
// 🎬 YOUTUBE DOWNLOADER - FIXED VERSION
// ═══════════════════════════════════════════════════════════

const VIDEO_APIS = [
    {
        name: "Xemoz",
        url: (videoUrl) => `https://api-xemoz-official.my.id/api/donwloader/ytmp4.php?url=${encodeURIComponent(videoUrl)}`,
        checkResponse: (data) => data?.status === true && data?.result?.download,
        getDownloadUrl: (data) => data.result.download,
        getTitle: (data) => data.result.title,
        getQuality: (data) => data.result.quality
    },
    {
        name: "Delirius",
        url: (videoUrl) => `https://api.delirius.store/download/ytmp4?url=${encodeURIComponent(videoUrl)}&format=360p`,
        checkResponse: (data) => data?.status === true && data?.data?.download,
        getDownloadUrl: (data) => data.data.download,
        getTitle: (data) => data.data.title,
        getQuality: (data) => data.data.format
    }
];

const yt = {
  static: Object.freeze({
    baseUrl: 'https://cnv.cx',
    headers: {
      'accept-encoding': 'gzip, deflate, br, zstd',
      'origin': 'https://frame.y2meta-uk.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
    }
  }),
  log(m) { console.log(`[yt-skrep] ${m}`) },
  resolveConverterPayload(link, f = '128k') {
    const a = ['128k', '320k']
    if (!a.includes(f)) throw Error(`invalid format. available: ${a.join(', ')}`)
    return { link, format: 'mp3', audioBitrate: parseInt(f) + '', videoQuality: '720', filenameStyle: 'pretty', vCodec: 'h264' }
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
}

async function convertToFast(buffer) {
  const tempIn = './temp_in.mp4'
  const tempOut = './temp_out.mp4'
  fs.writeFileSync(tempIn, buffer)
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-i', tempIn, '-c', 'copy', '-movflags', 'faststart', tempOut])
    ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg convert error')))
  })
  const newBuffer = fs.readFileSync(tempOut)
  fs.unlinkSync(tempIn)
  fs.unlinkSync(tempOut)
  return newBuffer
}

// ═══════════════════════════════════════════════════════════
// 🎬 VIDEO COMMAND - FIXED (Search + Download Working)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "ytv2",
    alias: ["videox", "ytmp42"],
    desc: "Download YouTube video with search support",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply(`*Example :*.ytv2 Alan Walker Faded`)

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } })

        let url = q;
        let videoInfo = null;
        let format = '360p';

        // ═══════════════════════════════════════════════════════════
        // 🔧 FIX: Extract format FIRST before any URL processing
        // ═══════════════════════════════════════════════════════════
        const parts = q.trim().split(/\s+/);
        const lastPart = parts[parts.length - 1];

        // Check if last part is a quality format
        if (['128k', '320k', '144p', '240p', '360p', '720p', '1080p'].includes(lastPart)) {
            format = lastPart;
            // Remove format from query
            url = parts.slice(0, -1).join(' ');
        }

        // Check if it's a URL or search query
        if (!url.match(/(youtube\.com|youtu\.be)/gi)) {
            // ═══════════════════════════════════════════════════════════
            // 🔍 SEARCH MODE
            // ═══════════════════════════════════════════════════════════
            const search = await yts(url);
            videoInfo = search.videos[0];
            if (!videoInfo) return await reply("❌ No video results found!");
            url = videoInfo.url;

            await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${videoInfo.title}\n📺 *Channel:* ${videoInfo.author.name}\n🕒 *Duration:* ${videoInfo.timestamp}\n📊 *Quality:* ${format}\n\n*Status:* ⏳ Downloading...\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
            }, { quoted: mek });
        } else {
            // ═══════════════════════════════════════════════════════════
            // 🔗 DIRECT URL MODE
            // ═══════════════════════════════════════════════════════════
            await conn.sendMessage(from, {
                text: `*🎬 VIDEO DOWNLOADER*\n\n🔗 *URL:* ${url}\n📊 *Quality:* ${format}\n\n*Status:* ⏳ Downloading...\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 🚀 PARALLEL API CALLS for Video
        // ═══════════════════════════════════════════════════════════

        const apiPromises = VIDEO_APIS.map(api => 
            axios.get(api.url(url), { 
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            })
            .then(response => ({ success: true, api: api, data: response.data }))
            .catch(error => ({ success: false, api: api, error: error.message }))
        );

        const results = await Promise.all(apiPromises);

        let downloadUrl = null;
        let apiTitle = videoInfo?.title || "Video";
        let apiQuality = format;
        let errors = [];

        for (const result of results) {
            if (result.success) {
                const api = result.api;
                const data = result.data;

                console.log(`📊 ${api.name} Response:`, JSON.stringify(data, null, 2));

                if (api.checkResponse(data)) {
                    downloadUrl = api.getDownloadUrl(data);
                    apiTitle = api.getTitle(data) || apiTitle;
                    apiQuality = api.getQuality(data) || format;
                    console.log(`✅ ${api.name} API Success!`);
                    break;
                } else {
                    errors.push(`${api.name}: Invalid response`);
                }
            } else {
                errors.push(`${result.api.name}: ${result.error}`);
            }
        }

        if (!downloadUrl) {
            return await reply(
                `❌ *Video Download Failed!*\n\n` +
                `📝 *Errors:*\n${errors.map(e => `• ${e}`).join('\n')}\n\n` +
                `🔧 *Try:* Different video ya baad mein try karo`
            );
        }

        await conn.sendMessage(from, {
            video: { url: downloadUrl },
            caption: `🎬 *${apiTitle}*\n\n📊 *Quality:* ${apiQuality}\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '🔥', key: m.key } });

    } catch (e) {
        console.error(e)
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
        await reply(`❌ *Error:* ${e.message}`)
    }
});

// ═══════════════════════════════════════════════════════════
// 🎵 AUDIO COMMAND - FIXED (Search + Download Working)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "yta2",
    alias: ["ytaudioa", "ytmp32"],
    desc: "Download YouTube audio with search support",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply(`*Example :* .yta2 https://youtu.be/JiEW1agPqNY\nOr: .yta2 Alan Walker Faded`)

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } })

        let url = q;
        let videoInfo = null;
        let format = '128k';

        // ═══════════════════════════════════════════════════════════
        // 🔧 FIX: Extract format FIRST before any URL processing
        // ═══════════════════════════════════════════════════════════
        const parts = q.trim().split(/\s+/);
        const lastPart = parts[parts.length - 1];

        // Check if last part is a quality format
        if (['128k', '320k'].includes(lastPart)) {
            format = lastPart;
            // Remove format from query
            url = parts.slice(0, -1).join(' ');
        }

        // Check if it's a URL or search query
        if (!url.match(/(youtube\.com|youtu\.be)/gi)) {
            // ═══════════════════════════════════════════════════════════
            // 🔍 SEARCH MODE
            // ═══════════════════════════════════════════════════════════
            const search = await yts(url);
            videoInfo = search.videos[0];
            if (!videoInfo) return await reply("❌ No video results found!");
            url = videoInfo.url;

            await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: `*🎵 AUDIO DOWNLOADER*\n\n🎞️ *Title:* ${videoInfo.title}\n📺 *Channel:* ${videoInfo.author.name}\n🕒 *Duration:* ${videoInfo.timestamp}\n📊 *Quality:* ${format}\n\n*Status:* ⏳ Downloading...\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
            }, { quoted: mek });
        } else {
            // ═══════════════════════════════════════════════════════════
            // 🔗 DIRECT URL MODE
            // ═══════════════════════════════════════════════════════════
            await conn.sendMessage(from, {
                text: `*🎵 AUDIO DOWNLOADER*\n\n🔗 *URL:* ${url}\n📊 *Quality:* ${format}\n\n*Status:* ⏳ Downloading...\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
            }, { quoted: mek });
        }

        yt.log(`Downloading audio: ${url} | Format: ${format}`)
        let { buffer, fileName } = await yt.download(url, format)

        await conn.sendMessage(from, { 
            audio: buffer, 
            mimetype: 'audio/mpeg', 
            fileName,
            caption: `🎵 *Audio Downloaded*\n\n📊 *Quality:* ${format}\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
        }, { quoted: mek })

        await conn.sendMessage(from, { react: { text: '🔥', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
        await reply(`❌ *Error:* ${e.message}`)
    }
});

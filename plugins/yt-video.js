// ERFAN-MD
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ═══════════════════════════════════════════════════════════
// 🎬 YOUTUBE DOWNLOADER - cnv.cx API (Converted to ERFAN-MD)
// ═══════════════════════════════════════════════════════════

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
// 🎬 VIDEO COMMAND - With Search Support
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "ytv2",
    alias: ["ytvideoo", "ytmp42"],
    desc: "Download YouTube video with search support",
    category: "download",
    react: "📹",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply(`*Example :* .ytv2 https://youtu.be/JiEW1agPqNY\nOr: .ytv2 Alan Walker Faded`)

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } })

        let url = q;
        let videoInfo = null;
        let format = '1080p';

        // Check if it's a URL or search query
        if (!q.match(/(youtube\.com|youtu\.be)/gi)) {
            // Search mode
            const search = await yts(q);
            videoInfo = search.videos[0];
            if (!videoInfo) return await reply("❌ No video results found!");
            url = videoInfo.url;

            // Send thumbnail with info
            await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: `*🎬 VIDEO DOWNLOADER*\n\n🎞️ *Title:* ${videoInfo.title}\n📺 *Channel:* ${videoInfo.author.name}\n🕒 *Duration:* ${videoInfo.timestamp}\n\n*Status:* ⏳ Downloading...\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
            }, { quoted: mek });
        }

        // Check for quality argument (e.g., .ytv2 link 720p)
        const parts = q.split(' ');
        const lastPart = parts[parts.length - 1];
        if (['128k', '320k', '144p', '240p', '360p', '720p', '1080p'].includes(lastPart)) {
            format = lastPart;
            url = parts.slice(0, -1).join(' ');
        }

        yt.log(`Downloading video: ${url} | Format: ${format}`)
        let { buffer, fileName } = await yt.download(url, format)
        buffer = await convertToFast(buffer)

        await conn.sendMessage(from, { 
            video: buffer, 
            mimetype: 'video/mp4', 
            fileName,
            caption: `🎬 *Video Downloaded*\n\n📊 *Quality:* ${format}\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
        }, { quoted: mek })

        await conn.sendMessage(from, { react: { text: '🔥', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
        await reply(`❌ *Error:* ${e.message}`)
    }
});

// ═══════════════════════════════════════════════════════════
// 🎵 AUDIO COMMAND - With Search Support
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "yta2",
    alias: ["ytaudio2", "ytmp32"],
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

        // Check if it's a URL or search query
        if (!q.match(/(youtube\.com|youtu\.be)/gi)) {
            // Search mode
            const search = await yts(q);
            videoInfo = search.videos[0];
            if (!videoInfo) return await reply("❌ No video results found!");
            url = videoInfo.url;

            // Send thumbnail with info
            await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: `*🎵 AUDIO DOWNLOADER*\n\n🎞️ *Title:* ${videoInfo.title}\n📺 *Channel:* ${videoInfo.author.name}\n🕒 *Duration:* ${videoInfo.timestamp}\n\n*Status:* ⏳ Downloading...\n\n*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʀғᴀɴ-ᴍᴅ*`
            }, { quoted: mek });
        }

        // Check for quality argument (e.g., .yta2 link 320k)
        const parts = q.split(' ');
        const lastPart = parts[parts.length - 1];
        if (['128k', '320k'].includes(lastPart)) {
            format = lastPart;
            url = parts.slice(0, -1).join(' ');
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

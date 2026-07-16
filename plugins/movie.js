// ERFAN-MD
import { fileURLToPath } from 'url';
import axios from 'axios';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ERFAN-MD

// ═══════════════════════════════════════════════════════════
// 🎵 SONG COMMAND — NeoTex ytplay API (no yt-search needed)
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "song",
    alias: ["play3", "music", "audio", "mhh"],
    desc: "Download YouTube song via NeoTex API",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        if (!text) {
            return reply("❌ Please provide a song name\nExample: .song Shape of You")
        }

        // ⏳ Instant react — proves the command loaded and is running
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } })

        // ═══ STEP 1: Call NeoTex API (it searches YouTube itself) ═══
        let result = null
        try {
            const apiUrl = `https://neotex.my.id/download/ytplay?q=${encodeURIComponent(text)}`
            const res = await axios.get(apiUrl, { timeout: 30000 })

            if (res.data?.status === true && res.data?.result?.download?.audio) {
                result = res.data.result
            }
        } catch (e) {
            console.log("❌ NeoTex API failed:", e.message)
        }

        if (!result) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
            return reply("❌ Song not found or API is down. Please try again later.")
        }

        // ═══ STEP 2: Send info card ═══
        const safeTitle = (result.title || "song").replace(/[\\/:*?"<>|]/g, "").slice(0, 60)

        const caption = `🎵 *ERFAN-MD SONG*

*Title:* ${result.title || "N/A"}
*Channel:* ${result.channel || "N/A"}
*Duration:* ${result.duration || "N/A"}
*Views:* ${result.views ? Number(result.views).toLocaleString() : "N/A"}
*Format:* mp3 (128kbps)

> powered by ERFAN-MD`

        try {
            await conn.sendMessage(from, {
                image: { url: result.thumbnail },
                caption: caption
            }, { quoted: mek })
        } catch (e) {
            console.log("⚠️ Thumbnail failed, sending text only:", e.message)
            await reply(caption)
        }

        // ═══ STEP 3: Download the mp3 ═══
        const audioRes = await axios.get(result.download.audio, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        })
        const audioBuffer = Buffer.from(audioRes.data)

        if (!audioBuffer || audioBuffer.length < 50000) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
            return reply("❌ Audio file is empty or broken. Please try again.")
        }

        // ═══ STEP 4: Send the audio ═══
        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${safeTitle}.mp3`,
            ptt: false
        }, { quoted: mek })

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } })
        console.log("✅ Song sent:", result.title)

    } catch (err) {
        console.error("❌ SONG ERROR:", err)
        try {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
        } catch (e) {}
        reply("❌ Error: " + err.message)
    }
})

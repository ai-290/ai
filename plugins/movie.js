
// ERFAN-MD
import { fileURLToPath } from 'url';
import axios from 'axios';
import yts from 'yt-search';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ERFAN-MD

// ═══════════════════════════════════════════════════════════
// 🎵 SONG COMMAND — MULTI-API FALLBACK CHAIN
// ═══════════════════════════════════════════════════════════
cmd({
    pattern: "song",
    alias: ["play11", "music", "audio", "oo"],
    desc: "Download YouTube song with multi-API fallback",
    category: "download",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, reply, text }) => {
    try {
        if (!text) {
            return reply("❌ Please provide song name\nExample: .song Shape of You")
        }

        // 🔍 YouTube search
        const search = await yts(text)
        if (!search.videos || !search.videos.length) {
            return reply("❌ No song found!")
        }

        const vid = search.videos[0]
        const query = vid.title
        const videoUrl = vid.url

        const caption = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰  ERFAN-MD ⊱┈─̇─̣╌*
*│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣*
*│❀ 🎵 𝐓𝐢𝐭𝐥𝐞:* ${vid.title}
*│❀ ⏱️ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧:* ${vid.timestamp || "N/A"}
*│❀ 👀 𝐕𝐢𝐞𝐰𝐬:* ${vid.views ? vid.views.toLocaleString() : "N/A"}
*│❀ 📀 𝐐𝐮𝐚𝐥𝐢𝐭𝐲:* 128kbps
*│❀ 📁 𝐅𝐨𝐫𝐦𝐚𝐭:* mp3
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Downloading...
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ERFAN-MD`

        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption
        }, { quoted: mek })

        let audioBuffer = null
        let downloadSuccess = false
        let lastError = ""

        // ╔══════════════════════════════════════════════════════════╗
        // ║  API 1: NeoTex ytplay (PRIMARY — query-based)            ║
        // ╚══════════════════════════════════════════════════════════╝
        if (!downloadSuccess) {
            try {
                const apiUrl = `https://neotex.my.id/download/ytplay?q=${encodeURIComponent(query)}`
                const res = await axios.get(apiUrl, { timeout: 30000 })

                if (res.data?.status === true && res.data?.result?.download?.audio) {
                    const audioUrl = res.data.result.download.audio
                    const audioRes = await axios.get(audioUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000
                    })
                    audioBuffer = Buffer.from(audioRes.data)
                    downloadSuccess = true
                    console.log("✅ API 1 (NeoTex ytplay) Success!")
                } else {
                    lastError = "NeoTex: No audio URL in response"
                }
            } catch (e) {
                lastError = `NeoTex: ${e.message}`
                console.log("❌ API 1 (NeoTex ytplay) Failed:", e.message)
            }
        }

        // ╔══════════════════════════════════════════════════════════╗
        // ║  API 2: NeoTex ytplay with video URL (FALLBACK 1)        ║
        // ╚══════════════════════════════════════════════════════════╝
        if (!downloadSuccess) {
            try {
                const apiUrl = `https://neotex.my.id/download/ytplay?q=${encodeURIComponent(videoUrl)}`
                const res = await axios.get(apiUrl, { timeout: 30000 })

                if (res.data?.status === true && res.data?.result?.download?.audio) {
                    const audioUrl = res.data.result.download.audio
                    const audioRes = await axios.get(audioUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000
                    })
                    audioBuffer = Buffer.from(audioRes.data)
                    downloadSuccess = true
                    console.log("✅ API 2 (NeoTex ytplay URL) Success!")
                } else {
                    lastError = "NeoTex URL: No audio URL"
                }
            } catch (e) {
                lastError = `NeoTex URL: ${e.message}`
                console.log("❌ API 2 (NeoTex ytplay URL) Failed:", e.message)
            }
        }

        // ╔══════════════════════════════════════════════════════════╗
        // ║  API 3: LexCode ytdl (LAST RESORT — URL-based)           ║
        // ╚══════════════════════════════════════════════════════════╝
        if (!downloadSuccess) {
            try {
                const apiUrl = `https://api.lexcode.biz.id/api/dwn/ytdl?url=${encodeURIComponent(videoUrl)}`
                const res = await axios.get(apiUrl, { timeout: 30000 })

                if (res.data?.success === true && res.data?.result?.download_url) {
                    const audioUrl = res.data.result.download_url
                    const audioRes = await axios.get(audioUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000
                    })
                    audioBuffer = Buffer.from(audioRes.data)
                    downloadSuccess = true
                    console.log("✅ API 3 (LexCode ytdl) Success!")
                } else {
                    lastError = "LexCode ytdl: No download URL"
                }
            } catch (e) {
                lastError = `LexCode ytdl: ${e.message}`
                console.log("❌ API 3 (LexCode ytdl) Failed:", e.message)
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 📤 Send Audio or Error Message
        // ═══════════════════════════════════════════════════════════
        if (downloadSuccess && audioBuffer) {
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${vid.title}.mp3`,
                ptt: false
            }, { quoted: mek })

            await conn.sendMessage(from, { react: { text: '✅', key: m.key } })
            console.log(`✅ Song sent successfully!`)
        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
            console.log("❌ All APIs failed. Last error:", lastError)
            return reply("❌ Download failed! All APIs are busy. Please try again later.")
        }

    } catch (err) {
        console.error("❌ SONG ERROR:", err)
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } })
        reply("❌ Error processing request. Please try again.")
    }
})

// ERFAN-MD
import { fileURLToPath } from 'url';
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ERFAN-MD

// ═══════════════════════════════════════════════════════════
// 🎭 REACTION COMMANDS
// Primary : nekos.best  (https://nekos.best/api/v2/{endpoint})
// Fallback: purrbot.site (https://purrbot.site/api/img/sfw/{endpoint}/gif)
// 18+ commands intentionally removed.
//
// NOTE: nekos.best / purrbot.site return raw .gif files, not mp4.
// WhatsApp's gifPlayback:true on a videoMessage requires an actual
// mp4 stream to render/download correctly - a raw gif container will
// just show a broken/empty player. So every gif is downloaded and
// transcoded to mp4 with ffmpeg before being sent.
//
// REQUIRES ffmpeg. Run: npm install ffmpeg-static
// (falls back to a system "ffmpeg" binary on PATH if that package
// isn't installed, in case you already have ffmpeg via a buildpack)
// ═══════════════════════════════════════════════════════════

let ffmpegPath = "ffmpeg";
try {
    const ffmpegStatic = await import("ffmpeg-static");
    if (ffmpegStatic?.default) ffmpegPath = ffmpegStatic.default;
} catch (e) {
    // ffmpeg-static not installed, will try system ffmpeg on PATH
}

/**
 * Converts a GIF buffer to an MP4 buffer (h264/yuv420p, even dimensions)
 * so WhatsApp can actually decode it as a gifPlayback video message.
 */
async function gifToMp4(gifBuffer) {
    const tmpDir = os.tmpdir();
    const id = crypto.randomBytes(6).toString("hex");
    const inPath = path.join(tmpDir, `${id}.gif`);
    const outPath = path.join(tmpDir, `${id}.mp4`);

    fs.writeFileSync(inPath, gifBuffer);

    await new Promise((resolve, reject) => {
        const ff = spawn(ffmpegPath, [
            "-y",
            "-i", inPath,
            "-movflags", "faststart",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            outPath,
        ]);
        let stderr = "";
        ff.stderr.on("data", (d) => (stderr += d));
        ff.on("error", (err) => reject(new Error(`ffmpeg not found/failed to start: ${err.message}`)));
        ff.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-300)}`));
        });
    });

    const mp4Buffer = fs.readFileSync(outPath);
    fs.unlink(inPath, () => {});
    fs.unlink(outPath, () => {});
    return mp4Buffer;
}

/**
 * Gets a reaction GIF url from nekos.best, falling back to purrbot.site.
 */
async function getReactionGifUrl(nbEndpoint, pbEndpoint) {
    if (nbEndpoint) {
        try {
            const res = await axios.get(`https://nekos.best/api/v2/${nbEndpoint}`);
            const url = res.data?.results?.[0]?.url;
            if (url) return url;
        } catch (e) {
            // fall through to purrbot
        }
    }

    if (pbEndpoint) {
        try {
            const res = await axios.get(`https://purrbot.site/api/img/sfw/${pbEndpoint}/gif`);
            if (res.data && res.data.error === false && res.data.link) {
                return res.data.link;
            }
        } catch (e) {
            // fall through to throw below
        }
    }

    throw new Error("No reaction GIF source available for this command.");
}

/**
 * Full pipeline: fetch gif url -> download gif bytes -> convert to mp4 buffer.
 */
async function getReactionVideo(nbEndpoint, pbEndpoint) {
    const gifUrl = await getReactionGifUrl(nbEndpoint, pbEndpoint);
    const gifRes = await axios.get(gifUrl, { responseType: "arraybuffer" });
    const gifBuffer = Buffer.from(gifRes.data);
    return await gifToMp4(gifBuffer);
}


// ═══════════════════════════════════════════════════════════
// CRY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "crw",
        desc: "Send a cry reaction GIF.",
        category: "fun",
        react: "😢",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is crying over @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is crying everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("cry", "cry");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .cry command:", error);
            reply("❌ *Error in .cry command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// CUDDLE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "cuddle",
        desc: "Send a cuddle reaction GIF.",
        category: "fun",
        react: "🤗",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} cuddled @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is cuddling everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("cuddle", "cuddle");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .cuddle command:", error);
            reply("❌ *Error in .cuddle command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// BULLY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "bully",
        desc: "Send a bully reaction GIF.",
        category: "fun",
        react: "😈",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is bullying @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is bullying everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .bully command:", error);
            reply("❌ *Error in .bully command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// HUG
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "hug",
        desc: "Send a hug reaction GIF.",
        category: "fun",
        react: "🤗",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} hugged @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is hugging everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("hug", "hug");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .hug command:", error);
            reply("❌ *Error in .hug command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// AWOO
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "awoo",
        desc: "Send a awoo reaction GIF.",
        category: "fun",
        react: "🐺",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} awoos at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is awooing everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .awoo command:", error);
            reply("❌ *Error in .awoo command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// LICK
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "lick",
        desc: "Send a lick reaction GIF.",
        category: "fun",
        react: "👅",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} licked @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is licking everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "lick");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .lick command:", error);
            reply("❌ *Error in .lick command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// PAT
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "pat",
        desc: "Send a pat reaction GIF.",
        category: "fun",
        react: "🫂",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} patted @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is patting everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("pat", "pat");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .pat command:", error);
            reply("❌ *Error in .pat command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// SMUG
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "smug",
        desc: "Send a smug reaction GIF.",
        category: "fun",
        react: "😏",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is smug at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is feeling smug everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("smug", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .smug command:", error);
            reply("❌ *Error in .smug command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// BONK
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "bonk",
        desc: "Send a bonk reaction GIF.",
        category: "fun",
        react: "🔨",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} bonked @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is bonking everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .bonk command:", error);
            reply("❌ *Error in .bonk command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// YEET
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "yeet",
        desc: "Send a yeet reaction GIF.",
        category: "fun",
        react: "💨",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} yeeted @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is yeeting everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("yeet", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .yeet command:", error);
            reply("❌ *Error in .yeet command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// BLUSH
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "blush",
        desc: "Send a blush reaction GIF.",
        category: "fun",
        react: "😊",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is blushing at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is blushing everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("blush", "blush");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .blush command:", error);
            reply("❌ *Error in .blush command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// HANDHOLD
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "handhold",
        desc: "Send a handhold reaction GIF.",
        category: "fun",
        react: "🤝",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is holding hands with @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} wants to hold hands with everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("handhold", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .handhold command:", error);
            reply("❌ *Error in .handhold command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// HIGHFIVE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "highfive",
        desc: "Send a highfive reaction GIF.",
        category: "fun",
        react: "✋",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} gave a high-five to @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is high-fiving everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("highfive", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .highfive command:", error);
            reply("❌ *Error in .highfive command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// NOM
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "nom",
        desc: "Send a nom reaction GIF.",
        category: "fun",
        react: "🍽️",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is nomming @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is nomming everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .nom command:", error);
            reply("❌ *Error in .nom command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// WAVE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "wave",
        desc: "Send a wave reaction GIF.",
        category: "fun",
        react: "👋",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} waved at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is waving at everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("wave", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .wave command:", error);
            reply("❌ *Error in .wave command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// SMILE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "smile",
        desc: "Send a smile reaction GIF.",
        category: "fun",
        react: "😁",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} smiled at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is smiling at everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("smile", "smile");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .smile command:", error);
            reply("❌ *Error in .smile command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// WINK
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "wink",
        desc: "Send a wink reaction GIF.",
        category: "fun",
        react: "😉",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} winked at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is winking at everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("wink", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .wink command:", error);
            reply("❌ *Error in .wink command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// HAPPY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "happy",
        desc: "Send a happy reaction GIF.",
        category: "fun",
        react: "😊",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is happy with @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is happy with everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("happy", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .happy command:", error);
            reply("❌ *Error in .happy command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// GLOMP
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "glomp",
        desc: "Send a glomp reaction GIF.",
        category: "fun",
        react: "🤗",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} glomped @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is glomping everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .glomp command:", error);
            reply("❌ *Error in .glomp command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// BITE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "bite",
        desc: "Send a bite reaction GIF.",
        category: "fun",
        react: "🦷",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} bit @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is biting everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("bite", "bite");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .bite command:", error);
            reply("❌ *Error in .bite command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// POKE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "poke",
        desc: "Send a poke reaction GIF.",
        category: "fun",
        react: "👉",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} poked @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} poked everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("poke", "poke");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .poke command:", error);
            reply("❌ *Error in .poke command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// CRINGE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "cringe",
        desc: "Send a cringe reaction GIF.",
        category: "fun",
        react: "😬",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} thinks @${mentionedUser.split("@")[0]} is cringe`
                : isGroup
                ? `${sender} finds everyone cringe`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .cringe command:", error);
            reply("❌ *Error in .cringe command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// DANCE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "dance",
        desc: "Send a dance reaction GIF.",
        category: "fun",
        react: "💃",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} danced with @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is dancing with everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("dance", "dance");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .dance command:", error);
            reply("❌ *Error in .dance command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// KILL
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "kill",
        desc: "Send a kill reaction GIF.",
        category: "fun",
        react: "🔪",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} killed @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} killed everyone`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "kill");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .kill command:", error);
            reply("❌ *Error in .kill command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// SLAP
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "slap",
        desc: "Send a slap reaction GIF.",
        category: "fun",
        react: "✊",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} slapped @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} slapped everyone`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("slap", "slap");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .slap command:", error);
            reply("❌ *Error in .slap command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// KISS
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "kiss",
        desc: "Send a kiss reaction GIF.",
        category: "fun",
        react: "💋",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} kissed @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} kissed everyone`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("kiss", "kiss");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .kiss command:", error);
            reply("❌ *Error in .kiss command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// ANGRY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "angry",
        desc: "Send a angry reaction GIF.",
        category: "fun",
        react: "😠",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is angry at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is angry at everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "angry");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .angry command:", error);
            reply("❌ *Error in .angry command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// CONFY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "confy",
        desc: "Send a confy reaction GIF.",
        category: "fun",
        react: "😌",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} is comfy with @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is comfy with everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "comfy");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .confy command:", error);
            reply("❌ *Error in .confy command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// EEVEE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "eevee",
        desc: "Send a eevee reaction GIF.",
        category: "fun",
        react: "🦊",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} eevees at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is eeveeing everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .eevee command:", error);
            reply("❌ *Error in .eevee command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// FLUFF
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "fluff",
        desc: "Send a fluff reaction GIF.",
        category: "fun",
        react: "🐾",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} fluffed @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is fluffing everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "fluff");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .fluff command:", error);
            reply("❌ *Error in .fluff command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// KICK
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "kick",
        desc: "Send a kick reaction GIF.",
        category: "fun",
        react: "🦶",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} kicked @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is kicking everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("kick", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .kick command:", error);
            reply("❌ *Error in .kick command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// LAY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "lay",
        desc: "Send a lay reaction GIF.",
        category: "fun",
        react: "🛌",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} laid with @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is laying with everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "lay");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .lay command:", error);
            reply("❌ *Error in .lay command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// POUT
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "pout",
        desc: "Send a pout reaction GIF.",
        category: "fun",
        react: "😡",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} pouted at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is pouting at everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("pout", null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .pout command:", error);
            reply("❌ *Error in .pout command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// TAIL
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "tail",
        desc: "Send a tail reaction GIF.",
        category: "fun",
        react: "🐕",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} wagged tail at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is wagging tail at everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, null);

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .tail command:", error);
            reply("❌ *Error in .tail command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// TICKLE
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "tickle",
        desc: "Send a tickle reaction GIF.",
        category: "fun",
        react: "🤣",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} tickled @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is tickling everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo("tickle", "tickle");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .tickle command:", error);
            reply("❌ *Error in .tickle command:*\n" + error.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// NEKO
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "neko",
        desc: "Send a neko reaction GIF.",
        category: "fun",
        react: "🐱",
        filename: __filename,
        use: "@tag (optional)",
    },
    async (conn, mek, m, { args, q, reply }) => {
        try {
            let sender = `@${mek.sender.split("@")[0]}`;
            let mentionedUser = m.mentionedJid[0] || (mek.quoted && mek.quoted.sender);
            let isGroup = m.isGroup;

            let message = mentionedUser
                ? `${sender} nekoed at @${mentionedUser.split("@")[0]}`
                : isGroup
                ? `${sender} is nekoing everyone!`
                : `> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 🖤`;

            let videoBuffer = await getReactionVideo(null, "neko");

            await conn.sendMessage(
                mek.chat,
                { 
                    video: videoBuffer, 
                    caption: message, 
                    gifPlayback: true, 
                    mentions: [mek.sender, mentionedUser].filter(Boolean) 
                },
                { quoted: mek }
            );
        } catch (error) {
            console.error("❌ Error in .neko command:", error);
            reply("❌ *Error in .neko command:*\n" + error.message);
        }
    }
);

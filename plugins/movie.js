// ERFAN-MD
import { fileURLToPath } from 'url';
import axios from 'axios';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ═══════════════════════════════════════════════════════════
// CRY
// ═══════════════════════════════════════════════════════════
cmd(
    {
        pattern: "crya",
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

            // Static last-resort GIFs, only used if BOTH APIs below fail
            const fallbacks = [
                "https://media.tenor.com/9SkU1IzkLG0AAAAC/anime-cry.gif",
                "https://media.tenor.com/IZmh-3VLCY8AAAAC/anime-sad.gif",
            ];

            let videoUrl = null;

            // 1) otakugifs.xyz - primary
            try {
                let res = await axios.get("https://api.otakugifs.xyz/gif?reaction=cry", { timeout: 10000 });
                if (res.data?.url) videoUrl = res.data.url;
            } catch (e) {
                console.error("⚠️ otakugifs.xyz failed for .cry:", e.message);
            }

            // 2) purrbot.site - secondary (only if #1 failed)
            if (!videoUrl) {
                try {
                    let res = await axios.get("https://api.purrbot.site/v2/img/sfw/cry/gif", { timeout: 10000 });
                    if (res.data?.link && !res.data?.error) videoUrl = res.data.link;
                } catch (e) {
                    console.error("⚠️ purrbot.site failed for .cry:", e.message);
                }
            }

            // 3) static fallback - only if both APIs failed
            if (!videoUrl) {
                videoUrl = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            }

            await conn.sendMessage(
                mek.chat,
                {
                    video: { url: videoUrl },
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

// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ERFAN-MD

cmd({
    pattern: "gcxy",
    alias: ["togstatus", "swgc", "gs"],
    desc: "Post a text, image, or video status to the current group.",
    category: "admin",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {

    // ── Owner only ──────────────────────────────────────────────────────────
    if (!isCreator) {
        return reply("❌ This command is only for the *bot owner*!");
    }

    // ── Group only ──────────────────────────────────────────────────────────
    if (!from.endsWith("@g.us")) {
        return reply("❌ This command can only be used in *group chats*!");
    }

    try {
        const caption = text?.trim() || "";
        const quotedMsg = m.quoted;
        const quoted = quotedMsg?.msg || quotedMsg;
        const mimeType = quoted?.mimetype || "";
        const quotedType = Object.keys(quotedMsg?.message || {})[0] || "";

        // ── Must have text or quoted media ──────────────────────────────────
        if (!quotedMsg && !caption) {
            return reply(
                `📢 *Group Status — Usage:*\n\n` +
                `*Text status:*\n` +
                `  \`.groupstatus Hello everyone!\`\n\n` +
                `*Image/video status:*\n` +
                `  Reply to an image/video with \`.groupstatus Your caption here\`\n\n` +
                `*Media without caption:*\n` +
                `  Reply to an image/video with \`.groupstatus\`\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `~ *ERFAN-MD*`
            );
        }

        // ── Download media once, if any ─────────────────────────────────────
        let mediaBuffer = null;
        if (quotedMsg) {
            mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) {
                return reply("❌ Failed to download the media. Please try again.");
            }
        }

        const header = "📢 *GROUP STATUS*";
        const finalCaption = caption
            ? `${header}\n\n${caption}`
            : header;

        // ── Text status ─────────────────────────────────────────────────────
        if (!mediaBuffer) {
            await conn.sendMessage(from, {
                text: `${header}\n\n${caption}\n\n— ${new Date().toLocaleString()}`
            }, { quoted: mek });

            return reply("✅ Text group status posted!");
        }

        // ── Image status ────────────────────────────────────────────────────
        if (mimeType.startsWith("image/") || quotedType === "imageMessage") {
            await conn.sendMessage(from, {
                image: mediaBuffer,
                caption: finalCaption
            }, { quoted: mek });

            return reply("✅ Image group status posted!");
        }

        // ── Video status ────────────────────────────────────────────────────
        if (mimeType.startsWith("video/") || quotedType === "videoMessage") {
            await conn.sendMessage(from, {
                video: mediaBuffer,
                caption: finalCaption
            }, { quoted: mek });

            return reply("✅ Video group status posted!");
        }

        // ── Audio not supported ─────────────────────────────────────────────
        if (
            mimeType.startsWith("audio/") ||
            quotedType === "audioMessage" ||
            quotedType === "pttMessage"
        ) {
            return reply("❌ Audio status is not supported in this version. Please use text, image, or video.");
        }

        return reply("❌ Unsupported media type. Please reply to an image or video.");

    } catch (error) {
        console.error("GroupStatus Error:", error);
        return reply(`❌ *Error:* ${error.message}`);
    }
});

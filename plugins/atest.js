// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== GROUPSTATUS COMMAND ====================
cmd({
    pattern: "malikxy",
    desc: "Post group status with media or text (mentions all members)",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {

    // --- Robust checks (don't rely only on handler-provided values) ---
    const isGroup = from.endsWith('@g.us');
    const senderNumber = (m.sender || '').split('@')[0];
    const botNumber = (conn.user?.id || '').split(':')[0];
    const isOwner = isCreator || senderNumber === botNumber;

    if (!isOwner) return reply("❌ This command is only for owners!");
    if (!isGroup) return reply("❌ This command can only be used in groups!");

    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        const caption = text?.trim() || "";

        if (!quotedMsg && !caption) {
            return reply(`⚠️ Reply to media or provide text!\n\nExamples:\n• .malikxy Hello everyone\n• Reply to an image with: .malikxy`);
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const groupMetadata = await conn.groupMetadata(from);
        const mentionedJid = groupMetadata.participants.map(p => p.id);

        const contextInfo = { isGroupStatus: true, mentionedJid };
        let messageContent = {};

        if (quotedMsg && /image|video|audio/.test(mimeType)) {
            const mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) throw new Error("Failed to download media");

            if (mimeType.startsWith('image/')) {
                messageContent = { image: mediaBuffer, caption, mimetype: mimeType, contextInfo };
            } else if (mimeType.startsWith('video/')) {
                messageContent = { video: mediaBuffer, caption, mimetype: mimeType, contextInfo };
            } else {
                // audio is NOT supported in group status — send as text instead
                messageContent = { text: caption || "🎵 (audio can't be posted as group status)", contextInfo };
            }
        } else {
            // quoted text OR plain text
            const quotedText = quotedMsg ? (quotedMsg.msg || quotedMsg).text || '' : '';
            messageContent = { text: caption || quotedText, contextInfo };
        }

        await conn.sendMessage(from, messageContent, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Group Status Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});

// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== REMOTE GROUP STATUS COMMAND ====================
cmd({
    pattern: "malikx",
    alias: ["gcstatus2", "poststatus"],
    desc: "Post a status to any group using its invite link",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {

    // --- Owner check (works even if handler doesn't pass isCreator) ---
    const senderNumber = (m.sender || '').split('@')[0];
    const botNumber = (conn.user?.id || '').split(':')[0];
    const isOwner = isCreator || senderNumber === botNumber;
    if (!isOwner) return reply("❌ This command is only for owners!");

    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        const args = (text || '').trim();

        // --- Extract group link + caption ---
        const linkMatch = args.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]+)/);
        if (!linkMatch) {
            return reply(
                `⚠️ *Usage:*\n\n` +
                `• .gcpost <group link> <text>\n` +
                `• Reply to image/video: .gcpost <group link> <caption>\n\n` +
                `*Example:*\n.gcpost https://chat.whatsapp.com/AbCdEfGh Hello everyone`
            );
        }

        const inviteCode = linkMatch[1];
        const caption = args.replace(linkMatch[0], '').trim();

        if (!quotedMsg && !caption) {
            return reply("⚠️ Provide text or reply to an image/video!");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // --- Resolve group JID from invite link ---
        let groupJid;
        try {
            const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
            groupJid = inviteInfo.id;
        } catch {
            return reply("❌ Invalid group link, or the bot is not a member of that group!");
        }

        // --- Get participants for mentions ---
        const groupMetadata = await conn.groupMetadata(groupJid);
        const mentionedJid = groupMetadata.participants.map(p => p.id);
        const groupName = groupMetadata.subject;

        const contextInfo = { isGroupStatus: true, mentionedJid };
        let messageContent = {};

        if (quotedMsg && /image|video/.test(mimeType)) {
            const mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) throw new Error("Failed to download media");

            if (mimeType.startsWith('image/')) {
                messageContent = { image: mediaBuffer, caption, mimetype: mimeType, contextInfo };
            } else {
                messageContent = { video: mediaBuffer, caption, mimetype: mimeType, contextInfo };
            }
        } else {
            const quotedText = quotedMsg ? (quotedMsg.msg || quotedMsg).text || '' : '';
            messageContent = { text: caption || quotedText, contextInfo };
        }

        // --- Post the status to the target group ---
        await conn.sendMessage(groupJid, messageContent);

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        reply(`✅ *Status posted successfully!*\n\n📌 *Group:* ${groupName}\n📝 *Content:* ${caption || mimeType || 'media'}`);

    } catch (error) {
        console.error("GC Post Error:", error);
        reply(`❌ Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Delay helper (anti-ban protection) ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== MASS GROUP STATUS COMMAND ====================
cmd({
    pattern: "gcspam",
    alias: ["multistatus", "bulkstatus"],
    desc: "Post multiple statuses to a group via link (use responsibly!)",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {

    // --- Owner check ---
    const senderNumber = (m.sender || '').split('@')[0];
    const botNumber = (conn.user?.id || '').split(':')[0];
    const isOwner = isCreator || senderNumber === botNumber;
    if (!isOwner) return reply("❌ This command is only for owners!");

    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        const args = (text || '').trim();

        // --- Extract group link ---
        const linkMatch = args.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]+)/);
        if (!linkMatch) {
            return reply(
                `⚠️ *Usage:*\n\n` +
                `• .gcspam <group link> <text>, <count>\n` +
                `• Reply to media: .gcspam <group link> <caption>, <count>\n\n` +
                `*Example:*\n.gcspam https://chat.whatsapp.com/AbCdEfGh hello, 20`
            );
        }

        const inviteCode = linkMatch[1];
        let remaining = args.replace(linkMatch[0], '').trim();

        // --- Extract count from the LAST comma (e.g. "hello, 20") ---
        let count = 1;
        const countMatch = remaining.match(/,\s*(\d+)\s*$/);
        if (countMatch) {
            count = parseInt(countMatch[1]);
            remaining = remaining.replace(/,\s*\d+\s*$/, '').trim();
        }

        const caption = remaining;

        // --- Safety limits ---
        const MAX_COUNT = 100;
        if (count < 1) return reply("❌ Count must be at least 1!");
        if (count > MAX_COUNT) return reply(`❌ Maximum ${MAX_COUNT} statuses per command (anti-ban protection)!`);
        if (!quotedMsg && !caption) return reply("⚠️ Provide text or reply to an image/video!");

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // --- Resolve group from link ---
        let groupJid;
        try {
            const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
            groupJid = inviteInfo.id;
        } catch {
            return reply("❌ Invalid group link, or the bot is not a member of that group!");
        }

        const groupMetadata = await conn.groupMetadata(groupJid);
        const mentionedJid = groupMetadata.participants.map(p => p.id);
        const groupName = groupMetadata.subject;

        // --- Prepare media once (don't re-download in the loop) ---
        let mediaBuffer = null;
        if (quotedMsg && /image|video/.test(mimeType)) {
            mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) throw new Error("Failed to download media");
        }

        reply(`🚀 *Posting ${count} statuses to:* ${groupName}\n⏱️ Please wait, this takes ~${Math.ceil(count * 2 / 60) || 1} min with anti-ban delay...`);

        // --- Post loop ---
        let success = 0;
        let failed = 0;

        for (let i = 0; i < count; i++) {
            try {
                const contextInfo = { isGroupStatus: true, mentionedJid };
                let messageContent = {};

                if (mediaBuffer) {
                    if (mimeType.startsWith('image/')) {
                        messageContent = { image: mediaBuffer, caption, mimetype: mimeType, contextInfo };
                    } else {
                        messageContent = { video: mediaBuffer, caption, mimetype: mimeType, contextInfo };
                    }
                } else {
                    messageContent = { text: caption, contextInfo };
                }

                await conn.sendMessage(groupJid, messageContent);
                success++;

                // Anti-ban delay: 2 seconds between each status
                if (i < count - 1) await sleep(2000);

            } catch (err) {
                failed++;
                console.error(`Status ${i + 1} failed:`, err.message);
                // If too many failures in a row, stop (possible rate limit)
                if (failed >= 5) {
                    reply(`⚠️ Stopped early — WhatsApp may be rate-limiting the bot.\n✅ Posted: ${success}\n❌ Failed: ${failed}`);
                    return;
                }
                await sleep(3000);
            }
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        reply(
            `✅ *Mass status complete!*\n\n` +
            `📌 *Group:* ${groupName}\n` +
            `✅ *Posted:* ${success}\n` +
            `❌ *Failed:* ${failed}\n` +
            `📝 *Content:* ${caption || mimeType}`
        );

    } catch (error) {
        console.error("GC Spam Error:", error);
        reply(`❌ Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

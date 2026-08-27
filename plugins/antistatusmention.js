// ERFAN-MD — Anti-Status-Mention toggle command
// Blocks forwarded WhatsApp Status mentions being dropped into a group.
// Enforcement logic lives in index.js (messages.upsert handler); this file
// only lets admins flip the setting via chat.
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "antistatusmention",
    alias: ["asm", "antistatustag"],
    use: '.antistatusmention on/off/kick',
    desc: "Block forwarded Status-mention messages in this group",
    category: "admin",
    react: "🚫",
    filename: __filename
},
async (conn, mek, m, { isGroup, isAdmins, isOwner, reply, args, userConfig, updateUserConfig, sanitizedNumber }) => {
    try {
        if (!isGroup) return reply("This command only works inside a group.");
        if (!isAdmins && !isOwner) return reply("Only group admins can use *.antistatusmention*.");

        const opt = (args[0] || '').toLowerCase();
        const current = userConfig?.ANTI_STATUS_MENTION && userConfig.ANTI_STATUS_MENTION !== 'false'
            ? userConfig.ANTI_STATUS_MENTION.toUpperCase()
            : 'OFF';

        if (!opt) {
            return reply(
                `📛 Anti-status-mention is currently: *${current}*\n\n` +
                `Usage:\n` +
                `.antistatusmention on   — delete forwarded status-mention messages\n` +
                `.antistatusmention kick — delete + remove the sender\n` +
                `.antistatusmention off  — disable`
            );
        }

        if (!['on', 'off', 'kick'].includes(opt)) {
            return reply("Usage: .antistatusmention on / off / kick");
        }

        const value = opt === 'on' ? 'delete' : opt;
        await updateUserConfig(sanitizedNumber, { ANTI_STATUS_MENTION: value });
        return reply(value === 'false' ? "✅ Anti-status-mention turned *OFF*." : `✅ Anti-status-mention set to *${value.toUpperCase()}*.`);
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
});

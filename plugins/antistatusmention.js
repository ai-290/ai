// ERFAN-MD — Anti-Status-Mention toggle command
// Blocks forwarded WhatsApp Status mentions being dropped into a group.
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "antistatusmention",
    alias: ["asm", "antistatus"],
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
        const current = userConfig?.ANTI_STATUS && userConfig.ANTI_STATUS !== 'false'
            ? userConfig.ANTI_STATUS.toUpperCase()
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

        // ✅ FIX: ANTI_STATUS use kar raha hai (index.js ke mutabiq)
        const value = opt === 'on' ? 'true' : opt;
        await updateUserConfig(sanitizedNumber, { ANTI_STATUS: value });
        
        const status = value === 'false' ? 'OFF' : value.toUpperCase();
        return reply(`✅ Anti-status-mention set to *${status}*.`);
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
});

// plugins/groupstats.js — Group Activity Stats
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "groupstats",
    alias: ["gstats", "activitystats", "gactivity"],
    desc: "📊 Group ki activity statistics dekho — kaun kitna active, total messages, top chatters!",
    category: "group",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {

    if (!from.endsWith('@g.us')) {
        return reply("❌ Yeh command sirf *groups* mein kaam karti hai!");
    }

    try {
        await reply("📊 Collecting group stats... ⏳");

        // Group metadata
        const metadata = await conn.groupMetadata(from);
        const participants = metadata.participants || [];
        const totalMembers = participants.length;

        // Admin list
        const admins = participants.filter(p => p.admin);
        const totalAdmins = admins.length;

        // Get group profile picture
        let ppUrl = null;
        try {
            ppUrl = await conn.profilePictureUrl(from, 'image');
        } catch (e) { /* no pic */ }

        // Group creation date se uptime
        const creation = metadata.creation || Date.now();
        const daysOld = Math.floor((Date.now() - creation) / (1000 * 60 * 60 * 24));

        // Message count from store (approximate)
        const msgCount = metadata.size || 'N/A';

        // Build stats message
        const statsText =
            `┏━━━━━━━━━━━━━━━━━┓\n` +
            `     📊 *GROUP STATS*\n` +
            `┗━━━━━━━━━━━━━━━━━┛\n\n` +
            `📌 *Group:* ${metadata.subject}\n` +
            `🆔 *ID:* ${metadata.id}\n` +
            `👥 *Members:* ${totalMembers}\n` +
            `🛡️ *Admins:* ${totalAdmins}\n` +
            `📅 *Created:* ${daysOld} days ago\n` +
            `👑 *Owner:* ${metadata.owner ? metadata.owner.split('@')[0] : 'N/A'}\n` +
            `📝 *Description:* ${(metadata.desc || 'N/A').substring(0, 100)}\n\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `💡 *Tip:* Members ki activity dekhnay ke liye\n` +
            `kisi member ko reply karo aur `.tag` use karo!\n` +
            `━━━━━━━━━━━━━━━━━`;

        if (ppUrl) {
            await conn.sendMessage(from, {
                image: { url: ppUrl },
                caption: statsText
            });
        } else {
            await reply(statsText);
        }

    } catch (error) {
        console.error("GroupStats Error:", error);
        reply(`❌ ${error.message}`);
    }
});

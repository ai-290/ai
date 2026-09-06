// ERFAN-MD - BLOCK/UNBLOCK/BLOCKLIST COMMANDS
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// HELPER: Get bot owner JID
// ============================================
function getBotNumber(sock) {
    try {
        if (!sock.user?.id) return null;
        return sock.user.id.includes(':') 
            ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
            : sock.user.id;
    } catch {
        return null;
    }
}

function normalizeJid(input) {
    if (!input) return null;
    if (input.endsWith('@s.whatsapp.net') || input.endsWith('@g.us')) return input;
    const digits = input.toString().replace(/\D/g, '');
    if (digits.length < 7) return null;
    return digits + '@s.whatsapp.net';
}

// ============================================
// BLOCK COMMAND
// ============================================
cmd({
    pattern: "blocka",
    desc: "Block a user",
    category: "owner",
    react: "🚫",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args, isOwner, quoted }) => {
    try {
        console.log("BLOCK COMMAND DEBUG:");
        console.log("Sender:", sender);
        console.log("isOwner:", isOwner);
        console.log("Args:", args);
        console.log("Quoted sender:", quoted?.sender);
        console.log("Mentions:", m.mentions);
        
        const botNumber = getBotNumber(conn);
        console.log("Bot Number:", botNumber);
        
        // Owner check - check if sender is in config owner list or matches bot number
        const ownerNumbers = config.OWNER_NUMBER || [];
        const isBotOwner = isOwner || 
                          sender === botNumber || 
                          ownerNumbers.includes(sender) || 
                          ownerNumbers.includes(sender?.split('@')[0]);
        
        console.log("Is Bot Owner:", isBotOwner);
        
        if (!isBotOwner) {
            return reply("*❌ Only bot owner can use this!*");
        }

        let jid = null;

        // Check if replying to a message
        if (quoted?.sender) {
            jid = quoted.sender;
            console.log("Got JID from quoted:", jid);
        } 
        // Check if mentioning someone
        else if (m.mentions?.[0]) {
            jid = m.mentions[0];
            console.log("Got JID from mention:", jid);
        }
        // Check if number provided as argument
        else if (args?.[0]) {
            jid = normalizeJid(args[0]);
            console.log("Got JID from args:", jid);
        }

        if (!jid) {
            return reply(
                "*🚫 Block User*\n\n" +
                "*Usage:*\n" +
                "• Reply to message: `.block`\n" +
                "• Mention: `.block @user`\n" +
                "• Number: `.block 923001234567`"
            );
        }

        if (jid === botNumber) {
            return reply("*❌ You can't block the bot itself!*");
        }

        if (jid === sender) {
            return reply("*❌ You can't block yourself!*");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        try {
            await conn.updateBlockStatus(jid, 'block');
            console.log("Block successful for:", jid);
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            
            const blockMsg = `*🚫 Blocked!*\n\n@${jid.split('@')[0]} has been blocked.\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`;
            
            await conn.sendMessage(from, { 
                text: blockMsg,
                mentions: [jid]
            }, { quoted: mek });
            
        } catch (error) {
            console.error("Block Error:", error);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            await reply(`*❌ Failed to block!*\n\n_${error.message || error}_`);
        }
        
    } catch (error) {
        console.error("Block Command Error:", error);
        reply(`*❌ Command error!*\n\n_${error.message}_`);
    }
});

// ============================================
// UNBLOCK COMMAND
// ============================================
cmd({
    pattern: "unblock",
    desc: "Unblock a user",
    category: "owner",
    react: "🔓",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args, isOwner, quoted }) => {
    try {
        console.log("UNBLOCK COMMAND DEBUG:");
        console.log("Sender:", sender);
        console.log("isOwner:", isOwner);
        
        const botNumber = getBotNumber(conn);
        
        const ownerNumbers = config.OWNER_NUMBER || [];
        const isBotOwner = isOwner || 
                          sender === botNumber || 
                          ownerNumbers.includes(sender) || 
                          ownerNumbers.includes(sender?.split('@')[0]);
        
        if (!isBotOwner) {
            return reply("*❌ Only bot owner can use this!*");
        }

        let jid = null;

        if (quoted?.sender) {
            jid = quoted.sender;
        } 
        else if (m.mentions?.[0]) {
            jid = m.mentions[0];
        }
        else if (args?.[0]) {
            jid = normalizeJid(args[0]);
        }

        if (!jid) {
            return reply(
                "*🔓 Unblock User*\n\n" +
                "*Usage:*\n" +
                "• Reply to message: `.unblock`\n" +
                "• Mention: `.unblock @user`\n" +
                "• Number: `.unblock 923001234567`"
            );
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        try {
            await conn.updateBlockStatus(jid, 'unblock');
            console.log("Unblock successful for:", jid);
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            
            const unblockMsg = `*🔓 Unblocked!*\n\n@${jid.split('@')[0]} has been unblocked.\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`;
            
            await conn.sendMessage(from, { 
                text: unblockMsg,
                mentions: [jid]
            }, { quoted: mek });
            
        } catch (error) {
            console.error("Unblock Error:", error);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            await reply(`*❌ Failed to unblock!*\n\n_${error.message || error}_`);
        }
        
    } catch (error) {
        console.error("Unblock Command Error:", error);
        reply(`*❌ Command error!*\n\n_${error.message}_`);
    }
});

// ============================================
// BLOCKLIST COMMAND
// ============================================
cmd({
    pattern: "blocklist",
    alias: ["listblock", "blocked", "blocks"],
    desc: "Show blocked users",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, isOwner }) => {
    try {
        console.log("BLOCKLIST COMMAND DEBUG:");
        console.log("Sender:", sender);
        console.log("isOwner:", isOwner);
        
        const botNumber = getBotNumber(conn);
        
        const ownerNumbers = config.OWNER_NUMBER || [];
        const isBotOwner = isOwner || 
                          sender === botNumber || 
                          ownerNumbers.includes(sender) || 
                          ownerNumbers.includes(sender?.split('@')[0]);
        
        if (!isBotOwner) {
            return reply("*❌ Only bot owner can use this!*");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        try {
            const list = await conn.fetchBlocklist();
            console.log("Blocklist fetched:", list);

            if (!list || list.length === 0) {
                await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
                return reply("*📋 Blocked List*\n\n_No users blocked._");
            }

            let text = `*📋 Blocked Users: ${list.length}*\n\n`;
            list.forEach((jid, i) => {
                text += `${i + 1}. @${jid.split('@')[0]}\n`;
            });
            text += `\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`;

            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            
            await conn.sendMessage(from, { 
                text: text,
                mentions: list
            }, { quoted: mek });

        } catch (error) {
            console.error("Blocklist Error:", error);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            await reply(`*❌ Failed to fetch blocklist!*\n\n_${error.message || error}_`);
        }
        
    } catch (error) {
        console.error("Blocklist Command Error:", error);
        reply(`*❌ Command error!*\n\n_${error.message}_`);
    }
});

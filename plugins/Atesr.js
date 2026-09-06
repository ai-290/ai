// ERFAN-MD - BROADCAST & STATUS COMMANDS
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// SEND BROADCAST COMMAND
// ============================================
cmd({
    pattern: "broadcast",
    alias: ["bcast", "bclist"],
    desc: "Send message to broadcast list",
    category: "owner",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args, isOwner, quoted }) => {
    try {
        console.log("=== BROADCAST COMMAND CALLED ===");
        
        // Owner check
        const botNumber = conn.user?.id?.includes(':') 
            ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
            : conn.user?.id;
            
        if (!isOwner && sender !== botNumber) {
            return reply("*❌ Only bot owner can use this!*");
        }
        
        // Check if broadcast ID provided
        if (!args[0]) {
            return reply(
                "*📢 Broadcast Command*\n\n" +
                "*Usage:*\n" +
                "• `.broadcast <broadcast_id> <message>`\n" +
                "• `.broadcast 12345678@broadcast Hello everyone!`\n" +
                "• Reply to image: `.broadcast <broadcast_id>`\n\n" +
                "*Example:*\n" +
                "`.broadcast 12345678@broadcast Assalam o Alaikum`"
            );
        }
        
        const broadcastId = args[0];
        const messageText = args.slice(1).join(' ');
        
        // Validate broadcast ID
        if (!broadcastId.endsWith('@broadcast')) {
            return reply("*❌ Invalid broadcast ID!*\n\n*Format:* `12345678@broadcast`");
        }
        
        // Send loading reaction
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        
        // Check if replying to an image/video
        if (m.quoted?.message?.imageMessage) {
            // Send image broadcast
            const imageBuffer = await conn.downloadMediaMessage(m.quoted);
            
            await conn.sendMessage(broadcastId, {
                image: imageBuffer,
                caption: messageText || m.quoted.message.imageMessage.caption || ''
            }, {
                broadcast: true
            });
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Broadcast sent!*\n\n📢 *To:* ${broadcastId}\n📸 *Type:* Image\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`);
        }
        else if (m.quoted?.message?.videoMessage) {
            // Send video broadcast
            const videoBuffer = await conn.downloadMediaMessage(m.quoted);
            
            await conn.sendMessage(broadcastId, {
                video: videoBuffer,
                caption: messageText || m.quoted.message.videoMessage.caption || ''
            }, {
                broadcast: true
            });
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Broadcast sent!*\n\n📢 *To:* ${broadcastId}\n🎥 *Type:* Video\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`);
        }
        else if (messageText) {
            // Send text broadcast
            await conn.sendMessage(broadcastId, {
                text: messageText
            }, {
                broadcast: true
            });
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Broadcast sent!*\n\n📢 *To:* ${broadcastId}\n📝 *Type:* Text\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`);
        }
        else {
            return reply("*❌ Please provide message text or reply to an image/video!*");
        }
        
    } catch (error) {
        console.error("Broadcast Error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`*❌ Broadcast failed!*\n\n_${error.message}_`);
    }
});

// ============================================
// BROADCAST LIST INFO COMMAND
// ============================================
cmd({
    pattern: "broadcastinfo",
    alias: ["bcinfo", "bclistinfo"],
    desc: "Get broadcast list info",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args, isOwner }) => {
    try {
        console.log("=== BROADCAST INFO COMMAND CALLED ===");
        
        const botNumber = conn.user?.id?.includes(':') 
            ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
            : conn.user?.id;
            
        if (!isOwner && sender !== botNumber) {
            return reply("*❌ Only bot owner can use this!*");
        }
        
        if (!args[0]) {
            return reply("*📋 Broadcast Info*\n\n*Usage:* `.broadcastinfo <broadcast_id>`\n*Example:* `.broadcastinfo 12345678@broadcast`");
        }
        
        const broadcastId = args[0];
        
        if (!broadcastId.endsWith('@broadcast')) {
            return reply("*❌ Invalid broadcast ID!*\n\n*Format:* `12345678@broadcast`");
        }
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        
        const bList = await conn.getBroadcastListInfo(broadcastId);
        
        if (!bList) {
            return reply("*❌ Broadcast list not found!*");
        }
        
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
        
        let infoMsg = `*📋 Broadcast List Info*\n\n`;
        infoMsg += `📢 *Name:* ${bList.name || 'N/A'}\n`;
        infoMsg += `🆔 *ID:* ${broadcastId}\n`;
        infoMsg += `👥 *Recipients:* ${bList.recipients?.length || 0}\n\n`;
        
        if (bList.recipients?.length > 0) {
            infoMsg += `*Recipients List:*\n`;
            bList.recipients.forEach((jid, i) => {
                infoMsg += `${i + 1}. @${jid.split('@')[0]}\n`;
            });
        }
        
        infoMsg += `\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`;
        
        await conn.sendMessage(from, { 
            text: infoMsg,
            mentions: bList.recipients || []
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Broadcast Info Error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`*❌ Failed to get info!*\n\n_${error.message}_`);
    }
});

// ============================================
// SEND STATUS/STORY COMMAND
// ============================================
cmd({
    pattern: "sx",
    alias: ["story", "poststatus"],
    desc: "Post a status/story",
    category: "owner",
    react: "📱",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, args, isOwner, quoted }) => {
    try {
        console.log("=== STATUS COMMAND CALLED ===");
        
        const botNumber = conn.user?.id?.includes(':') 
            ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
            : conn.user?.id;
            
        if (!isOwner && sender !== botNumber) {
            return reply("*❌ Only bot owner can use this!*");
        }
        
        const statusJid = 'status@broadcast';
        
        // Check for image status
        if (m.quoted?.message?.imageMessage) {
            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
            
            const imageBuffer = await conn.downloadMediaMessage(m.quoted);
            const caption = args.join(' ') || m.quoted.message.imageMessage.caption || '';
            
            await conn.sendMessage(statusJid, {
                image: imageBuffer,
                caption: caption
            }, {
                backgroundColor: '#000000',
                font: 1,
                statusJidList: [],
                broadcast: true
            });
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Status posted!*\n\n📸 *Type:* Image\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`);
        }
        // Check for video status
        else if (m.quoted?.message?.videoMessage) {
            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
            
            const videoBuffer = await conn.downloadMediaMessage(m.quoted);
            const caption = args.join(' ') || m.quoted.message.videoMessage.caption || '';
            
            await conn.sendMessage(statusJid, {
                video: videoBuffer,
                caption: caption
            }, {
                backgroundColor: '#000000',
                font: 1,
                statusJidList: [],
                broadcast: true
            });
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Status posted!*\n\n🎥 *Type:* Video\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`);
        }
        // Text status
        else if (args.length > 0) {
            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
            
            const statusText = args.join(' ');
            
            await conn.sendMessage(statusJid, {
                text: statusText
            }, {
                backgroundColor: '#000000',
                font: 1,
                statusJidList: [],
                broadcast: true
            });
            
            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`*✅ Status posted!*\n\n📝 *Type:* Text\n\n> *📌 ᴘᴏᴡᴇʀ ʙʏ erfan*`);
        }
        else {
            return reply(
                "*📱 Status Command*\n\n" +
                "*Usage:*\n" +
                "• Reply to image: `.status`\n" +
                "• Reply to video: `.status`\n" +
                "• Text status: `.status Your status text here`"
            );
        }
        
    } catch (error) {
        console.error("Status Error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`*❌ Status failed!*\n\n_${error.message}_`);
    }
});

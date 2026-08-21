// plugins/group.js - ESM Version
import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd } from '../command.js';
import converter from '../lib/converter.js';
import crypto from 'crypto';
import { generateWAMessageContent, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);

// ==================== V2 RELAY FUNCTION (PURE STATUS - NO CHAT MESSAGE FOR TEXT) ====================
async function relayGroupStatusV2(conn, jid, text) {
    const messageSecret = crypto.randomBytes(32);
    
    const mediaObject = { text: text };
    
    const inside = await generateWAMessageContent(mediaObject, { 
        upload: conn.waUploadToServer 
    });
    
    const messageStructure = {
        groupStatusMessageV2: {
            message: {
                ...inside,
                messageContextInfo: { messageSecret }
            }
        }
    };
    
    const msg = generateWAMessageFromContent(jid, messageStructure, { 
        userJid: conn.user.id 
    });
    
    await conn.relayMessage(jid, msg.message, { 
        messageId: msg.key.id 
    });
    
    return msg;
}

// ==================== MEDIA STATUS FUNCTION (SENDS TO ALL GROUPS WITH isGroupStatus) ====================
async function sendMediaStatusToAllGroups(conn, mediaBuffer, mimeType, caption, onProgress) {
    const groups = await conn.groupFetchAllParticipating();
    const groupIds = Object.keys(groups);
    const total = groupIds.length;
    
    if (!total) throw new Error("No groups found");
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < groupIds.length; i++) {
        try {
            const groupMetadata = await conn.groupMetadata(groupIds[i]);
            const participants = groupMetadata.participants;
            const mentionedJid = participants.map(p => p.id);
            const contextInfo = { isGroupStatus: true, mentionedJid: mentionedJid };
            
            let messageContent = {};
            
            if (mimeType.startsWith('image/')) {
                messageContent = { 
                    image: mediaBuffer, 
                    caption: caption || "", 
                    mimetype: mimeType, 
                    contextInfo: contextInfo 
                };
            } 
            else if (mimeType.startsWith('video/')) {
                messageContent = { 
                    video: mediaBuffer, 
                    caption: caption || "", 
                    mimetype: mimeType, 
                    contextInfo: contextInfo 
                };
            } 
            else if (mimeType.startsWith('audio/')) {
                const isPTT = true;
                messageContent = { 
                    audio: mediaBuffer, 
                    mimetype: 'audio/ogg; codecs=opus', 
                    ptt: isPTT, 
                    contextInfo: contextInfo 
                };
            }
            
            await conn.sendMessage(groupIds[i], messageContent);
            success++;
            
            if (onProgress && (i + 1) % 10 === 0) {
                onProgress(i + 1, total, success, failed);
            }
            
            // Anti-ban delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
        } catch (err) {
            failed++;
            console.error(`Failed to send to ${groupIds[i]}:`, err.message);
        }
    }
    
    return { total, success, failed };
}

// ==================== MAIN .gcstatus COMMAND ====================

// ==================== GROUPSTATUS COMMAND ====================
cmd({
    pattern: "malikxt",
    desc: "Post group status with media or text (mentions all members). Use: .gcstatus <text>, <count> to post multiple times automatically.",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator, isGroup }) => {
    if (!isCreator) return reply("❌ This command is only for owners!");
    if (!isGroup) return reply("❌ This command can only be used in groups!");
    
    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        
        // Parse text and optional count from ".gcstatus text, 20"
        let statusText = text?.trim() || "";
        let repeatCount = 1; // Default: post once

        if (statusText.includes(',')) {
            const commaIndex = statusText.lastIndexOf(',');
            const possibleCount = statusText.slice(commaIndex + 1).trim();
            const parsedCount = parseInt(possibleCount, 10);

            if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount <= 100) {
                repeatCount = parsedCount;
                statusText = statusText.slice(0, commaIndex).trim();
            }
            // If parsing fails, treat the whole thing as text (no count extracted)
        }
        
        if (!quotedMsg && !statusText) {
            return reply(`⚠️ Reply to media or provide text!\n\nExamples:\n• .gcstatus Hello everyone\n• .gcstatus Hello everyone, 20\n• Reply to an image with: .gcstatus`);
        }
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        const groupMetadata = await conn.groupMetadata(from);
        const participants = groupMetadata.participants;
        const mentionedJid = participants.map(p => p.id);
        
        if (repeatCount > 1) {
            await conn.sendMessage(from, { react: { text: "🔄", key: mek.key } });
        }
        
        for (let i = 0; i < repeatCount; i++) {
            let messageContent = {};
            
            if (quotedMsg) {
                const mediaBuffer = await quotedMsg.download();
                if (!mediaBuffer) throw new Error("Failed to download media");
                
                const contextInfo = { isGroupStatus: true, mentionedJid: mentionedJid };
                
                if (mimeType.startsWith('image/')) {
                    messageContent = { image: mediaBuffer, caption: statusText || "", mimetype: mimeType, contextInfo: contextInfo };
                } else if (mimeType.startsWith('video/')) {
                    messageContent = { video: mediaBuffer, caption: statusText || "", mimetype: mimeType, contextInfo: contextInfo };
                } else if (mimeType.startsWith('audio/')) {
                    const isPTT = quotedMsg.message?.audioMessage?.ptt || false;
                    messageContent = { audio: mediaBuffer, mimetype: isPTT ? 'audio/ogg; codecs=opus' : 'audio/mp4', ptt: isPTT, contextInfo: contextInfo };
                } else {
                    return reply("❌ Unsupported media type! Please reply to an image, video, or audio file.");
                }
            } else if (statusText) {
                messageContent = { text: statusText, contextInfo: { isGroupStatus: true, mentionedJid: mentionedJid } };
            }
            
            await conn.sendMessage(from, messageContent, { quoted: mek });
            
            // Small delay between repeats to avoid rate-limiting
            if (repeatCount > 1 && i < repeatCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        const doneReact = repeatCount > 1 ? `✅ (${repeatCount}x)` : "✅";
        await conn.sendMessage(from, { react: { text: doneReact, key: mek.key } });

    } catch (error) {
        console.error("Group Status Error:", error);
        reply(`❌ Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

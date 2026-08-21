// plugins/group.js - ESM Version
import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd } from '../command.js';
import converter from '../lib/converter.js';
import crypto from 'crypto';
import { generateWAMessageContent, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);

// ==================== PARSE GROUP LIMIT FROM COMMAND TEXT ====================
function parseGroupLimit(inputText) {
    if (!inputText) return { limit: null, message: "" };
    const trimmed = inputText.trim();
    const match = trimmed.match(/^(\d+)\s*(.*)$/);
    if (match) {
        let limit = parseInt(match[1]);
        if (isNaN(limit) || limit <= 0) return { limit: null, message: trimmed };
        if (limit > 10) limit = 10; // Hard cap at 10
        return { limit, message: match[2].trim() };
    }
    return { limit: null, message: trimmed };
}

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

// ==================== MEDIA STATUS FUNCTION (SENDS TO TARGET GROUPS WITH isGroupStatus) ====================
async function sendMediaStatusToGroups(conn, targetGroupIds, mediaBuffer, mimeType, caption, onProgress) {
    const total = targetGroupIds.length;
    
    if (!total) throw new Error("No target groups found");
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < total; i++) {
        try {
            const groupMetadata = await conn.groupMetadata(targetGroupIds[i]);
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
            
            await conn.sendMessage(targetGroupIds[i], messageContent);
            success++;
            
            if (onProgress && (i + 1) % 10 === 0) {
                onProgress(i + 1, total, success, failed);
            }
            
            // Anti-ban delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
        } catch (err) {
            failed++;
            console.error(`Failed to send to ${targetGroupIds[i]}:`, err.message);
        }
    }
    
    return { total, success, failed };
}


cmd({
    pattern: "malikxc",
    alias: ["statusgc", "swgc"],
    desc: "Text or Media → N groups (Text: pure status | Media: chat + status). Max 10 groups limit.",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {
    if (!isCreator) return reply("❌ Only for owners!");
    
    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        
        // Parse number limit from beginning of text
        const { limit: groupLimit, message: actualText } = parseGroupLimit(text);
        const caption = actualText;
        
        // ==================== CASE 1: MEDIA (IMAGE/VIDEO/AUDIO) ====================
        if (quotedMsg && mimeType) {
            if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')) {
                return reply("❌ Unsupported! Reply to image, video, or audio.");
            }
            
            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
            
            const mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) throw new Error("Failed to download media");
            
            // Get all groups first to show count
            const groups = await conn.groupFetchAllParticipating();
            const allGroupIds = Object.keys(groups);
            const totalAll = allGroupIds.length;
            
            if (!totalAll) return reply("❌ You are not in any groups!");
            
            // Apply limit if specified
            const targetGroupIds = groupLimit ? allGroupIds.slice(0, Math.min(groupLimit, totalAll)) : allGroupIds;
            const total = targetGroupIds.length;
            
            const limitMsg = groupLimit ? ` (limited to ${total} group${total !== 1 ? 's' : ''})` : '';
            await reply(`🚀 Sending ${mimeType.split('/')[0].toUpperCase()} to ${total} groups${limitMsg}...`);
            
            let lastProgress = "";
            
            const result = await sendMediaStatusToGroups(conn, targetGroupIds, mediaBuffer, mimeType, caption, (current, total, success, failed) => {
                const progressMsg = `📊 ${current}/${total} | ✅ ${success} | ❌ ${failed}`;
                if (progressMsg !== lastProgress) {
                    reply(progressMsg).catch(() => {});
                    lastProgress = progressMsg;
                }
            });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            await reply(`🎉 Media Broadcast Complete!\n📊 Total: ${result.total}\n✅ Success: ${result.success}\n❌ Failed: ${result.failed}`);
            return;
        }
        
        // ==================== CASE 2: TEXT ONLY ====================
        const statusText = caption;
        
        if (!statusText) {
            return reply(`⚠️ Provide text or reply to media!\n\nExamples:\n• .gcstatus Hello everyone (text to ALL groups)\n• .gcstatus 5 Hello everyone (text to 5 groups)\n• .gcstatus 10 (text to 10 groups)\n• Reply to image/video with .gcstatus 3 (media to 3 groups)\n\nℹ️ Max group limit is 10.`);
        }
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        // Get all groups
        const groups = await conn.groupFetchAllParticipating();
        const allGroupIds = Object.keys(groups);
        const totalAll = allGroupIds.length;
        
        if (!totalAll) return reply("❌ You are not in any groups!");
        
        // Apply limit if specified
        const targetGroupIds = groupLimit ? allGroupIds.slice(0, Math.min(groupLimit, totalAll)) : allGroupIds;
        const total = targetGroupIds.length;
        
        const limitMsg = groupLimit ? ` (limited to ${total} group${total !== 1 ? 's' : ''})` : '';
        await reply(`🚀 Broadcasting "${statusText}" to ${total} groups${limitMsg} (pure status)...`);
        
        let success = 0;
        let failed = 0;
        let lastProgress = "";
        
        for (let i = 0; i < total; i++) {
            try {
                await relayGroupStatusV2(conn, targetGroupIds[i], statusText);
                success++;
                
                if ((i + 1) % 10 === 0) {
                    const progressMsg = `📊 ${i + 1}/${total} | ✅ ${success} | ❌ ${failed}`;
                    if (progressMsg !== lastProgress) {
                        await reply(progressMsg).catch(() => {});
                        lastProgress = progressMsg;
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 800));
                
            } catch (err) {
                failed++;
                console.error(`Failed: ${targetGroupIds[i]}`, err.message);
            }
        }
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        await reply(`🎉 Text Broadcast Complete!\n📊 Total: ${total}\n✅ Success: ${success}\n❌ Failed: ${failed}`);
        
    } catch (error) {
        console.error("Error:", error);
        await reply(`❌ Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
    }
});

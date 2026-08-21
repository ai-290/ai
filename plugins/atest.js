// plugins/group.js - ESM Version
import { fileURLToPath } from 'url';
import config from '../config.js';
import { cmd } from '../command.js';
import converter from '../lib/converter.js';
import crypto from 'crypto';
import { generateWAMessageContent, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);

// ==================== PARSE COUNT FROM COMMAND TEXT ====================
// Supports: "Hello, 5" | "5 Hello"
// Number at the END must be preceded by a comma (as you requested).
// Returns count capped at 10. If no number found, returns null.
function parseStatusCount(inputText) {
    if (!inputText) return { count: null, message: "" };
    const trimmed = inputText.trim();
    
    // Pattern 1: Text followed by COMMA and number at the end
    // Example: "Hello world, 5"  |  "Hello, 10"
    const endMatch = trimmed.match(/^(.*),\s*(\d+)\s*$/);
    if (endMatch) {
        const count = parseInt(endMatch[2]);
        if (!isNaN(count) && count > 0) {
            return { count: Math.min(count, 10), message: endMatch[1].trim() };
        }
    }
    
    // Pattern 2: Number at the start followed by text
    // Example: "5 Hello world"
    const startMatch = trimmed.match(/^(\d+)\s+(.*)$/);
    if (startMatch) {
        const count = parseInt(startMatch[1]);
        if (!isNaN(count) && count > 0) {
            return { count: Math.min(count, 10), message: startMatch[2].trim() };
        }
    }
    
    return { count: null, message: trimmed };
}

// ==================== V2 RELAY FUNCTION (PURE STATUS - NO CHAT MESSAGE FOR TEXT) ====================
async function relayGroupStatusV2(conn, jid, text) {
    const messageSecret = crypto.randomBytes(32);
    const mediaObject = { text: text };
    const inside = await generateWAMessageContent(mediaObject, { upload: conn.waUploadToServer });
    const messageStructure = {
        groupStatusMessageV2: {
            message: {
                ...inside,
                messageContextInfo: { messageSecret }
            }
        }
    };
    const msg = generateWAMessageFromContent(jid, messageStructure, { userJid: conn.user.id });
    await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
    return msg;
}

// ==================== MEDIA STATUS FUNCTION ====================
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
                messageContent = { image: mediaBuffer, caption: caption || "", mimetype: mimeType, contextInfo: contextInfo };
            } else if (mimeType.startsWith('video/')) {
                messageContent = { video: mediaBuffer, caption: caption || "", mimetype: mimeType, contextInfo: contextInfo };
            } else if (mimeType.startsWith('audio/')) {
                messageContent = { audio: mediaBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true, contextInfo: contextInfo };
            }
            
            await conn.sendMessage(targetGroupIds[i], messageContent);
            success++;
            
            if (onProgress && (i + 1) % 5 === 0) {
                onProgress(i + 1, total, success, failed);
            }
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (err) {
            failed++;
            console.error(`Failed to send to ${targetGroupIds[i]}:`, err.message);
        }
    }
    return { total, success, failed };
}

cmd({
    pattern: "malikxz",
    alias: ["statusgc", "swgc"],
    desc: "Text or Media → N groups. Max 10 limit.",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {
    if (!isCreator) return reply("❌ Only for owners!");
    
    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        
        // Parse number from text (e.g., "Hello, 5" or "5 Hello")
        const { count: userCount, message: actualText } = parseStatusCount(text);
        const caption = actualText;
        
        // ==================== CASE 1: MEDIA (IMAGE/VIDEO/AUDIO) ====================
        if (quotedMsg && mimeType) {
            if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')) {
                return reply("❌ Unsupported! Reply to image, video, or audio.");
            }
            
            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
            
            const mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) throw new Error("Failed to download media");
            
            const groups = await conn.groupFetchAllParticipating();
            const allGroupIds = Object.keys(groups);
            const totalGroups = allGroupIds.length;
            
            if (!totalGroups) return reply("❌ You are not in any groups!");
            
            // Build target list: if count given, post that many times cycling through groups
            // If no count, post to all groups once (original behavior)
            const targetCount = userCount || totalGroups;
            const targetGroupIds = [];
            for (let i = 0; i < targetCount; i++) {
                targetGroupIds.push(allGroupIds[i % totalGroups]);
            }
            
            const limitMsg = userCount ? ` (limit: ${userCount})` : ` (all ${totalGroups} groups)`;
            await reply(`🚀 Sending ${mimeType.split('/')[0].toUpperCase()} to ${targetCount} groups${limitMsg}...`);
            
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
            return reply(`⚠️ Provide text or reply to media!\n\nExamples:\n• .gcstatus Hello everyone (all groups)\n• .gcstatus Hello, 5 (5 groups)\n• .gcstatus 5 Hello (5 groups)\n• Reply to image with .gcstatus, 3 (3 groups)\n\nℹ️ Max group limit is 10.`);
        }
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        const groups = await conn.groupFetchAllParticipating();
        const allGroupIds = Object.keys(groups);
        const totalGroups = allGroupIds.length;
        
        if (!totalGroups) return reply("❌ You are not in any groups!");
        
        // Build target list: cycle through groups to reach exact count
        const targetCount = userCount || totalGroups;
        const targetGroupIds = [];
        for (let i = 0; i < targetCount; i++) {
            targetGroupIds.push(allGroupIds[i % totalGroups]);
        }
        
        const limitMsg = userCount ? ` (limit: ${userCount})` : ` (all ${totalGroups} groups)`;
        await reply(`🚀 Broadcasting "${statusText}" to ${targetCount} groups${limitMsg}...`);
        
        let success = 0;
        let failed = 0;
        let lastProgress = "";
        
        for (let i = 0; i < targetCount; i++) {
            try {
                await relayGroupStatusV2(conn, targetGroupIds[i], statusText);
                success++;
                
                if ((i + 1) % 5 === 0) {
                    const progressMsg = `📊 ${i + 1}/${targetCount} | ✅ ${success} | ❌ ${failed}`;
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
        await reply(`🎉 Text Broadcast Complete!\n📊 Total: ${targetCount}\n✅ Success: ${success}\n❌ Failed: ${failed}`);
        
    } catch (error) {
        console.error("Error:", error);
        await reply(`❌ Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
    }
});

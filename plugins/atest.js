// ==================== MAIN .gcstatus COMMAND ====================

// ==================== GROUPSTATUS COMMAND ====================
cmd({
    pattern: "malikxy",
    desc: "Post group status with media or text (mentions all members)",
    category: "group",
    react: "📢",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator, isGroup }) => {
    if (!isCreator) return reply("❌ This command is only for owners!");
    if (!isGroup) return reply("❌ This command can only be used in groups!");
    
    try {
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg ? (quotedMsg.msg || quotedMsg).mimetype || '' : '';
        const caption = text?.trim() || "";
        
        if (!quotedMsg && !caption) {
            return reply(`⚠️ Reply to media or provide text!\n\nExamples:\n• .gcstatus Hello everyone\n• Reply to an image with: .gcstatus`);
        }
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        const groupMetadata = await conn.groupMetadata(from);
        const participants = groupMetadata.participants;
        const mentionedJid = participants.map(p => p.id);
        
        let messageContent = {};
        
        if (quotedMsg) {
            const mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) throw new Error("Failed to download media");
            
            const contextInfo = { isGroupStatus: true, mentionedJid: mentionedJid };
            
            if (mimeType.startsWith('image/')) {
                messageContent = { image: mediaBuffer, caption: caption || "", mimetype: mimeType, contextInfo: contextInfo };
            } else if (mimeType.startsWith('video/')) {
                messageContent = { video: mediaBuffer, caption: caption || "", mimetype: mimeType, contextInfo: contextInfo };
            } else if (mimeType.startsWith('audio/')) {
                const isPTT = quotedMsg.message?.audioMessage?.ptt || false;
                messageContent = { audio: mediaBuffer, mimetype: isPTT ? 'audio/ogg; codecs=opus' : 'audio/mp4', ptt: isPTT, contextInfo: contextInfo };
            } else {
                return reply("❌ Unsupported media type! Please reply to an image, video, or audio file.");
            }
        } else if (caption) {
            messageContent = { text: caption, contextInfo: { isGroupStatus: true, mentionedJid: mentionedJid } };
        }
        
        await conn.sendMessage(from, messageContent, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Group Status Error:", error);
        reply(`❌ Error: ${error.message}`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// plugins/gstatus.js — Silent Group Status
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "malikxc",
    alias: ["groupstatus", "gstory", "silentstatus"],
    desc: "🌟 Group mein status post karo — bina group message ke! Text ya media (image/video/audio) ke sath use karo.",
    category: "group",
    react: "📡",
    filename: __filename
}, async (conn, mek, m, { from, text, reply, isCreator }) => {

    if (!from.endsWith('@g.us')) {
        return reply("❌ Yeh command sirf *group chats* mein kaam karti hai!");
    }

    try {
        const caption = text?.trim() || "";
        const quotedMsg = m.quoted;
        const mimeType = quotedMsg
            ? (quotedMsg.msg || quotedMsg).mimetype || ""
            : "";

        if (!quotedMsg && !caption) {
            return reply(
                `📡 *Silent Group Status*\n\n` +
                `*Text:*\n.gstatus Hello group! 🎉\n\n` +
                `*Image/Video:*\nReply to media with .gstatus Caption\n\n` +
                `✨ *Group mein status lagega but chat mein koi message nahi aayega!*`
            );
        }

        let mediaBuffer = null;
        if (quotedMsg) {
            mediaBuffer = await quotedMsg.download();
            if (!mediaBuffer) return reply("❌ Media download fail hua!");
        }

        let messageContent = {};

        if (mediaBuffer) {
            if (mimeType.startsWith("image/")) {
                messageContent = {
                    image: mediaBuffer,
                    caption: caption || "",
                    mimetype: mimeType || "image/jpeg",
                    groupStatus: true     // ✨ YEH HAI FIX — silent status!
                };
            } else if (mimeType.startsWith("video/")) {
                messageContent = {
                    video: mediaBuffer,
                    caption: caption || "",
                    mimetype: mimeType || "video/mp4",
                    groupStatus: true     // ✨ Silent!
                };
            } else if (mimeType.startsWith("audio/")) {
                const isPTT = quotedMsg.message?.audioMessage?.ptt || false;
                messageContent = {
                    audio: mediaBuffer,
                    mimetype: isPTT ? "audio/ogg; codecs=opus" : "audio/mp4",
                    ptt: isPTT,
                    groupStatus: true     // ✨ Silent!
                };
            } else {
                return reply("❌ Sirf image, video ya audio support hai.");
            }
        } else {
            messageContent = {
                text: caption,
                groupStatus: true         // ✨ Text status — silent!
            };
        }

        // 🚀 Send — koi reply message nahi bhejta, bilkul silent!
        await conn.sendMessage(from, messageContent);

    } catch (error) {
        console.error("gstatus Error:", error);
        reply(`❌ ${error.message}`);
    }
});

// plugins/savestatus.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);

const commandKeywords = ["send", "sendme", "do", "give", "bhejo", "bhej", "save", "sand", "sent", "forward"];

cmd({
    'on': "body",
    dontAddCommandList: true,  // ✅ Add this if needed by your framework
    filename: import.meta.url  // ✅ Add this too
}, async (client, message, store, {  // ✅ 'message' yahan hai
    from,
    body,
    isGroup,
    reply,
    userConfig
}) => {
    try {
        if (isGroup) return;

        const DESCRIPTION = userConfig?.DESCRIPTION || config.DESCRIPTION || "";

        const messageText = body.toLowerCase();
        const containsKeyword = commandKeywords.some(word => messageText.includes(word));

        // ✅ Ab 'message' defined hai, yeh kaam karega
        if (containsKeyword && message.quoted?.chat === 'status@broadcast') {
            
            await client.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const buffer = await message.quoted.download();
            const mtype = message.quoted.mtype;
            const originalCaption = message.quoted.text || '';
            const options = { quoted: message };

            let messageContent = {};
            switch (mtype) {
                case "imageMessage":
                    messageContent = {
                        image: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : (DESCRIPTION ? `> ${DESCRIPTION}` : ""),
                        mimetype: message.quoted.mimetype || "image/jpeg"
                    };
                    break;
                case "videoMessage":
                    messageContent = {
                        video: buffer,
                        caption: originalCaption ? `${originalCaption}\n\n> ${DESCRIPTION}` : (DESCRIPTION ? `> ${DESCRIPTION}` : ""),
                        mimetype: message.quoted.mimetype || "video/mp4"
                    };
                    break;
                case "audioMessage":
                    messageContent = {
                        audio: buffer,
                        mimetype: "audio/mp4",
                        ptt: message.quoted.ptt || false
                    };
                    break;
                default:
                    await client.sendMessage(from, { react: { text: '❌', key: message.key } });
                    return;
            }

            try {
                await client.sendMessage(from, messageContent, options);
                await client.sendMessage(from, { react: { text: '✅', key: message.key } });
            } catch (sendError) {
                console.error("Failed to send status:", sendError);
                await client.sendMessage(from, { react: { text: '❌', key: message.key } });
            }
        }
    } catch (error) {
        console.error("Keyword Status Save Error:", error);
        if (message && message.key) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: message.key } });
            } catch (reactError) {
                console.error("Failed to send error reaction:", reactError);
            }
        }
    }
});

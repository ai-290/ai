import { cmd } from '../command.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalize(text) {
    return text.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

const triggerWords = ["beautiful", "cute", "oh", "🙂", "nice", "ok", "❤️", "😘", "❤", "😍", "🔥", "👀", "wow", "👍"];


cmd({
    on: "body",
    dontAddCommandList: true,
    filename: import.meta.url
}, async (client, message, match, { from, body, isCreator }) => {
    try {
        if (!triggerWords.includes(body?.toLowerCase?.() || body)) return;
        if (!isCreator) return;
        if (!message.quoted) return;
        
        const buffer = await message.quoted.download();
        const mtype = message.quoted.mtype;

        let messageContent = {};
        if (mtype === "imageMessage") {
            messageContent = { image: buffer, caption: message.quoted.text || '', mimetype: "image/jpeg" };
        } else if (mtype === "videoMessage") {
            messageContent = { video: buffer, caption: message.quoted.text || '', mimetype: "video/mp4" };
        } else if (mtype === "audioMessage") {
            messageContent = { audio: buffer, mimetype: "audio/mp4", ptt: message.quoted.ptt || false };
        } else {
            return;
        }
        await client.sendMessage(message.sender, messageContent, { quoted: message });
    } catch (error) {
        console.error("TRIGGER ERROR:", error);
    }
});

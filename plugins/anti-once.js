// ERFAN-MD
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

const triggerWords = ["beautiful", "cute", "oh", "🙂", "nice", "ok", "❤️", "😘", "❤", "😍", "🔥", "👀", "wow", "👍"];

cmd({
  on: "body",
  dontAddCommandList: true,
  filename: __filename
}, async (client, message, match, { from, body, isCreator }) => {
  try {
    // Check if message is a trigger word
    const msgBody = body?.toLowerCase?.() || body || "";
    if (!triggerWords.includes(msgBody)) return;
    
    // Only owner can use
    if (!isCreator) return;
    
    // Must be replying to a message
    const quoted = match?.quoted;
    if (!quoted) {
      console.log("VV: No quoted message found");
      return;
    }
    
    // Get message type
    const mtype = quoted.mtype || quoted.type;
    if (!mtype) {
      console.log("VV: No mtype found");
      return;
    }

    // Download buffer
    let buffer;
    try {
      if (quoted.download && typeof quoted.download === 'function') {
        buffer = await quoted.download();
      } else if (client.downloadMediaMessage && typeof client.downloadMediaMessage === 'function') {
        buffer = await client.downloadMediaMessage(quoted);
      } else {
        console.log("VV: No download method available");
        return;
      }
    } catch (dlErr) {
      console.error("VV Download Error:", dlErr.message);
      return;
    }

    if (!buffer || (Buffer.isBuffer(buffer) && buffer.length === 0)) {
      console.log("VV: Empty buffer");
      return;
    }

    let messageContent = {};
    
    if (mtype.includes("image")) {
      messageContent = {
        image: buffer,
        caption: quoted.text || quoted.caption || "",
        mimetype: "image/jpeg"
      };
    } else if (mtype.includes("video")) {
      messageContent = {
        video: buffer,
        caption: quoted.text || quoted.caption || "",
        mimetype: "video/mp4"
      };
    } else if (mtype.includes("audio")) {
      messageContent = {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.ptt || false
      };
    } else {
      console.log("VV: Unsupported type", mtype);
      return;
    }

    // Send to owner's inbox (match.sender is the owner's JID)
    const ownerJid = match.sender || from;
    await client.sendMessage(ownerJid, messageContent);
    
  } catch (error) {
    console.error("VV Error:", error.message || error);
  }
});

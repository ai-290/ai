// ERFAN-MD
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// Add any trigger words or emojis here
const triggerWords = ["vv", "viewonce", "retrive", "🔥", "👀", "save", "📥"];

cmd({
  on: "body",
  dontAddCommandList: true,
  filename: __filename
}, async (client, message, match, { from, body, sender, isCreator }) => {
  try {
    // 1. Check trigger word
    const msgBody = (body || "").toLowerCase().trim();
    if (!triggerWords.includes(msgBody)) return;

    // 2. Owner only (remove this line if you want everyone to use it)
    if (!isCreator) return;

    // 3. Must be replying to a message
    const context = message?.message?.extendedTextMessage?.contextInfo;
    if (!context?.quotedMessage) {
      return await client.sendMessage(from, {
        text: "*🍁 Please reply to a view once message!*"
      }, { quoted: message });
    }

    // 4. Unwrap view-once containers
    let quotedMsg = context.quotedMessage;
    let innerMessage = null;

    if (quotedMsg.viewOnceMessage?.message) {
      innerMessage = quotedMsg.viewOnceMessage.message;
    } else if (quotedMsg.viewOnceMessageV2?.message) {
      innerMessage = quotedMsg.viewOnceMessageV2.message;
    } else if (quotedMsg.viewOnceMessageV2Extension?.message) {
      innerMessage = quotedMsg.viewOnceMessageV2Extension.message;
    } else {
      innerMessage = quotedMsg; // Regular media
    }

    // 5. Detect media type
    let mediaType = null;
    if (innerMessage.imageMessage) mediaType = 'image';
    else if (innerMessage.videoMessage) mediaType = 'video';
    else if (innerMessage.audioMessage) mediaType = 'audio';
    else {
      return await client.sendMessage(from, {
        text: "❌ Only image, video, and audio messages are supported"
      }, { quoted: message });
    }

    // 6. Build proper message object for Baileys download
    const msgForDownload = {
      key: {
        remoteJid: from,
        fromMe: false,
        id: context.stanzaId,
        participant: context.participant
      },
      message: quotedMsg
    };

    // 7. Download buffer
    let buffer;
    try {
      if (typeof client.downloadMediaMessage === 'function') {
        buffer = await client.downloadMediaMessage(msgForDownload);
      } else {
        console.log("VV: downloadMediaMessage not available");
        return;
      }
    } catch (dlErr) {
      console.error("VV Download Error:", dlErr.message);
      return await client.sendMessage(from, {
        text: "❌ Failed to download media!"
      }, { quoted: message });
    }

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return await client.sendMessage(from, {
        text: "❌ Downloaded media is empty!"
      }, { quoted: message });
    }

    // 8. Build message content
    let content = {};
    if (mediaType === 'image') {
      content = {
        image: buffer,
        caption: innerMessage.imageMessage?.caption || "",
        mimetype: innerMessage.imageMessage?.mimetype || "image/jpeg"
      };
    } else if (mediaType === 'video') {
      content = {
        video: buffer,
        caption: innerMessage.videoMessage?.caption || "",
        mimetype: innerMessage.videoMessage?.mimetype || "video/mp4"
      };
    } else if (mediaType === 'audio') {
      content = {
        audio: buffer,
        mimetype: innerMessage.audioMessage?.mimetype || "audio/mp4",
        ptt: innerMessage.audioMessage?.ptt || false
      };
    }

    // 9. Send to triggerer's inbox (DM)
    await client.sendMessage(sender, content);

    // 10. Optional confirmation react in chat
    await client.sendMessage(from, {
      react: { text: '✅', key: message.key }
    });

  } catch (error) {
    console.error("VV Error:", error);
    await client.sendMessage(from, {
      text: "❌ Error fetching vv message:\n" + (error.message || error)
    }, { quoted: message });
  }
});

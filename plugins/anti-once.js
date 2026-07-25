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
    const msgBody = (body || "").toLowerCase().trim();
    if (!triggerWords.includes(msgBody)) return;
    if (!isCreator) return;

    // --- STEP 1: Get the quoted message ---
    let quotedMsg = null;

    // Try framework's quoted object first
    if (match?.quoted) {
      quotedMsg = match.quoted;
    }
    // Fallback: build from raw contextInfo
    else if (message?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const ctx = message.message.extendedTextMessage.contextInfo;
      quotedMsg = {
        key: {
          remoteJid: from,
          fromMe: ctx.participant === client.user?.id,
          id: ctx.stanzaId,
          participant: ctx.participant
        },
        message: ctx.quotedMessage
      };
    }

    if (!quotedMsg) {
      console.log("VV: No quoted message found");
      return;
    }

    // --- STEP 2: Unwrap view-once message & detect media type ---
    const msg = quotedMsg.message || quotedMsg;
    let innerMessage = null;
    let mediaType = null;

    // WhatsApp wraps view-once media in these containers
    if (msg.viewOnceMessage?.message) {
      innerMessage = msg.viewOnceMessage.message;
    } else if (msg.viewOnceMessageV2?.message) {
      innerMessage = msg.viewOnceMessageV2.message;
    } else if (msg.viewOnceMessageV2Extension?.message) {
      innerMessage = msg.viewOnceMessageV2Extension.message;
    } else {
      innerMessage = msg; // Regular media (not wrapped)
    }

    if (innerMessage.imageMessage) {
      mediaType = 'image';
    } else if (innerMessage.videoMessage) {
      mediaType = 'video';
    } else if (innerMessage.audioMessage) {
      mediaType = 'audio';
    } else {
      console.log("VV: Quoted message is not image/video/audio");
      return;
    }

    // --- STEP 3: Download the media buffer ---
    let buffer;
    try {
      if (typeof quotedMsg.download === 'function') {
        buffer = await quotedMsg.download();
      } else if (typeof client.downloadMediaMessage === 'function') {
        buffer = await client.downloadMediaMessage(quotedMsg);
      } else {
        console.log("VV: No download method available");
        return;
      }
    } catch (dlErr) {
      console.error("VV Download failed:", dlErr.message);
      return;
    }

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      console.log("VV: Empty buffer");
      return;
    }

    // --- STEP 4: Build the message content ---
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

    // --- STEP 5: Send to bot's own inbox (same as connect message in index.js) ---
    const selfJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    await client.sendMessage(selfJid, content);
    console.log(`VV: Sent ${mediaType} to inbox`);

  } catch (error) {
    console.error("VV Command Error:", error.message || error);
  }
});

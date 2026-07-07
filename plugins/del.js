
// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
  pattern: "del",
  alias: ["delete"],
  desc: "Delete any message",
  react: "🗑️",
  category: "admin",
  filename: __filename
}, async (conn, mek, m, { reply, quoted, isCreator }) => {
  
  let targetKey = null;

  // Find the quoted message key using available methods
  if (quoted && quoted.key) {
    targetKey = quoted.key;
  } else if (m.quoted && m.quoted.key) {
    targetKey = m.quoted.key;
  } else {
    const context = mek.message?.extendedTextMessage?.contextInfo;
    if (context && context.stanzaId) {
      targetKey = {
        remoteJid: mek.chat,
        id: context.stanzaId,
        participant: context.participant,
        fromMe: context.fromMe
      };
    }
  }

  // If no quoted message is found
  if (!targetKey) {
    return reply("❌ Reply to a message!");
  }

  // Permission Check: 
  // If the user is NOT the owner, they can only delete messages sent by the bot (fromMe: true)
  if (!isCreator && !targetKey.fromMe) {
    return reply("*📛 You can only delete messages sent by the bot.*");
  }

  // Attempt to delete the message
  try {
    await conn.sendMessage(mek.chat, { delete: targetKey });
  } catch (e) {
    reply("❌ Failed to delete the message.");
  }
});

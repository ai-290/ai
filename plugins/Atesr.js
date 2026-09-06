import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "rembgx",
    alias: ["removebg", "bgremove", "nobg"],
    use: '.rembg (reply to an image)',
    desc: "Remove background from image using remove.bg API",
    category: "media",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        // Check if replying to a message
        if (!m.quoted) {
            return reply('❌ *Please reply to an image!*');
        }

        // Get image from quoted message (handles all types)
        const quotedMsg = m.quoted.message;
        let imageMessage = quotedMsg?.imageMessage || 
                          quotedMsg?.viewOnceMessageV2?.message?.imageMessage || 
                          quotedMsg?.viewOnceMessage?.message?.imageMessage ||
                          quotedMsg?.ephemeralMessage?.message?.imageMessage;

        if (!imageMessage) {
            return reply('❌ *That is not an image! Please reply to an image.*');
        }

        // Send loading reaction
        await conn.sendMessage(from, {
            react: { text: '⏳', key: mek.key }
        });

        let tempFile = null;
        
        // Download the image
        const buffer = await downloadMediaMessage(
            { message: { imageMessage } }, 
            'buffer', 
            {}, 
            { logger: console }
        );
        
        if (!buffer) throw new Error('Failed to download image');

        // Create temp directory if not exists
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        tempFile = path.join(tempDir, `rembg_${Date.now()}.jpg`);
        fs.writeFileSync(tempFile, buffer);

        // Send to remove.bg API
        const form = new FormData();
        form.append('image_file', fs.createReadStream(tempFile));
        form.append('size', 'auto');

        const apiKey = '8TdrbitPfoV1JEPnKpCrWBhB'; // Your API key

        const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
            headers: {
                ...form.getHeaders(),
                'X-Api-Key': apiKey
            },
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Send processed image
        await conn.sendMessage(from, { 
            image: response.data,
            caption: '> *✅ Background removed successfully!*',
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '12036341101@newsletter',
                    newsletterName: "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Success reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (err) {
        console.error('REMBG ERROR:', err.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Background removal failed!*\n\n> Error: ${err.message}`);
    } finally {
        // Clean up temp file
        if (tempFile && fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (e) {}
        }
    }
});

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
    alias: ["removebg", "bgremove", "nobg", "rbg"],
    use: '.rembg (reply to an image)',
    desc: "Remove background from image using remove.bg API",
    category: "media",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply, isMedia }) => {
    try {
        // Check if the command is used as reply to an image
        if (!m.quoted) {
            return reply('❌ *Please reply to an image!*\n\n> *Usage:* Reply to an image with .rembg');
        }

        // Get the quoted message
        const quotedMessage = m.quoted.message;
        
        // Try multiple ways to get the image message
        let imageMessage = null;
        
        // Check if it's a direct image message
        if (quotedMessage.imageMessage) {
            imageMessage = quotedMessage.imageMessage;
        }
        // Check if it's a view once message
        else if (quotedMessage.viewOnceMessage?.message?.imageMessage) {
            imageMessage = quotedMessage.viewOnceMessage.message.imageMessage;
        }
        else if (quotedMessage.viewOnceMessageV2?.message?.imageMessage) {
            imageMessage = quotedMessage.viewOnceMessageV2.message.imageMessage;
        }
        // Check if it's an ephemeral message
        else if (quotedMessage.ephemeralMessage?.message?.imageMessage) {
            imageMessage = quotedMessage.ephemeralMessage.message.imageMessage;
        }
        // Check if it's a document with image
        else if (quotedMessage.documentMessage?.mimetype?.startsWith('image/')) {
            imageMessage = quotedMessage.documentMessage;
        }
        
        // Check if the current message itself has image (in case of caption)
        if (!imageMessage && m.message?.imageMessage) {
            imageMessage = m.message.imageMessage;
        }
        if (!imageMessage && m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            imageMessage = m.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        }
        
        // If still no image found
        if (!imageMessage) {
            return reply('❌ *That is not an image!*\n\n> Please reply to an actual image.');
        }

        // Send loading reaction
        await conn.sendMessage(from, {
            react: { text: '⏳', key: mek.key }
        });

        let tempFile = null;
        
        try {
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
                timeout: 30000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
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
                        newsletterJid: '120363416743041101@newsletter',
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
            
            // Check for specific API errors
            if (err.response?.status === 402) {
                reply('❌ *API key limit reached!*\n\n> Your remove.bg API key has reached its monthly limit.');
            } else if (err.response?.status === 400) {
                reply('❌ *Invalid image file!*\n\n> Please make sure you are replying to a valid image.');
            } else {
                reply(`❌ *Background removal failed!*\n\n> Error: ${err.message}`);
            }
        } finally {
            // Clean up temp file
            if (tempFile && fs.existsSync(tempFile)) {
                try { fs.unlinkSync(tempFile); } catch (e) {}
            }
        }

    } catch (err) {
        console.error('REMBG COMMAND ERROR:', err);
        reply(`❌ *Command error!*\n\n> ${err.message}`);
    }
});

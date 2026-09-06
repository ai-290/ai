
// ==================== EPHOTO/LOGO GENERATOR COMMAND ====================
import axios from 'axios';
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

cmd({
    pattern: "ephoto",
    alias: ["logo", "textlogo", "phototext", "1917"],
    desc: "Generate logo with text on photo",
    category: "tools",
    react: "🎨",
    filename: __filename,
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        // Check if text provided
        if (!args[0]) {
            return reply(
                "*🎨 Ephoto Logo Generator*\n\n" +
                "*Usage:* `.ephoto <text>`\n" +
                "*Example:* `.ephoto ERFAN-MD`\n\n" +
                "*Note:* Text mein space ke liye `+` use karein\n" +
                "*Example:* `.ephoto ERFAN+MD`"
            );
        }
        
        // Get text from args (join with + for spaces)
        const text = args.join('+');
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        // API URL with text
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/ephoto/1917style?text=${encodeURIComponent(text)}`;
        
        console.log("API URL:", apiUrl);
        
        // Fetch API response
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        console.log("API Response:", response.data);
        
        // Check if response successful
        if (response.data.status !== 'success' || !response.data.image) {
            throw new Error('API returned error');
        }
        
        const imageUrl = response.data.image;
        
        // Download the image
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!imageResponse.data || imageResponse.data.length === 0) {
            throw new Error('Failed to download image');
        }
        
        // Send the image directly to WhatsApp
        await conn.sendMessage(from, { 
            image: Buffer.from(imageResponse.data),
            caption: `*✅ Logo Generated!*\n\n📝 *Text:* ${args.join(' ')}\n🎨 *Style:* 1917 Style\n\n> *🚀 Powered by ERFAN-MD*`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (e) {
        console.error('Ephoto Error:', e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        
        let errorMsg = e.message || 'Unknown error';
        
        if (e.response) {
            if (e.response.status === 404) {
                errorMsg = 'API endpoint not found';
            } else if (e.response.status === 429) {
                errorMsg = 'Rate limit exceeded. Try again later';
            } else if (e.response.status === 500) {
                errorMsg = 'API server error. Try again later';
            }
        }
        
        reply(`❌ *Error: ${errorMsg}*`);
    }
});

// ==================== MULTIPLE EPHOTO STYLES ====================
// Adding more styles from the same API

cmd({
    pattern: "ephoto2",
    alias: ["logo2", "textlogo2", "style2"],
    desc: "Generate logo with different style",
    category: "tools",
    react: "🖼️",
    filename: __filename,
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        if (!args[0]) {
            return reply(
                "*🎨 Ephoto Logo Generator V2*\n\n" +
                "*Usage:* `.ephoto2 <text>`\n" +
                "*Example:* `.ephoto2 ERFAN-MD`"
            );
        }
        
        const text = args.join('+');
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        // Different style - you can change this URL for different styles
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/ephoto/1917style?text=${encodeURIComponent(text)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data.status !== 'success' || !response.data.image) {
            throw new Error('API returned error');
        }
        
        const imageResponse = await axios.get(response.data.image, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        await conn.sendMessage(from, { 
            image: Buffer.from(imageResponse.data),
            caption: `*✅ Logo Generated!*\n\n📝 *Text:* ${args.join(' ')}\n\n> *🚀 Powered by ERFAN-MD*`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (e) {
        console.error('Ephoto2 Error:', e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply(`❌ *Error: ${e.message}*`);
    }
});

// ==================== EPHOTO WITH MULTIPLE STYLES LIST ====================
cmd({
    pattern: "ephotolist",
    alias: ["logolist", "styles"],
    desc: "Show available ephoto styles",
    category: "tools",
    react: "📋",
    filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
    try {
        const stylesList = `*🎨 Available Ephoto Styles*\n\n` +
            `1. *1917 Style* - Classic vintage look\n` +
            `   Usage: .ephoto <text>\n\n` +
            `2. *More styles coming soon...*\n\n` +
            `*Note:* Text mein space ke liye + use karein\n` +
            `*Example:* .ephoto ERFAN+MD\n\n` +
            `> *🚀 Powered by ERFAN-MD*`;
        
        await conn.sendMessage(from, { 
            text: stylesList
        }, { quoted: mek });
        
    } catch (e) {
        console.error('EphotoList Error:', e);
        reply(`❌ *Error: ${e.message}*`);
    }
});

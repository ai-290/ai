// ERFAN-MD
import { fileURLToPath } from 'url';
import { cmd, commands } from '../command.js';
import path from 'path';
import { runtime } from '../lib/functions.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Direct menu image link (paste your image URL here) ─────────────────────
const MENU_IMAGE_URL = "https://i.ibb.co/YOUR-IMAGE/menu.jpg";

// ── Bot info (hardcoded — no config) ───────────────────────────────────────
const BOT_INFO = {
    BOT_NAME: "ERFAN-MD",
    OWNER_NAME: "Erfan",
    PREFIX: ".",
    MODE: "private",
    VERSION: "1.0.0",
    DESCRIPTION: "ERFAN-MD WhatsApp Bot"
};

// Helper function for small caps text
const toSmallCaps = (text) => {
    if (!text || typeof text !== 'string') return '';
    const smallCapsMap = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ',
        'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
        's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
        'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ғ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ',
        'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ',
        'S': 's', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
    };
    return text.split('').map(char => smallCapsMap[char] || char).join('');
};

// Format category with sidebar design
const formatCategory = (category, cmds) => {
    const validCmds = cmds.filter(c => c.pattern && c.pattern.trim() !== '');
    if (validCmds.length === 0) return '';

    let title = `\n━━━━━『 ${toSmallCaps(category.toUpperCase())} 』━━━━━\n◉\n`;
    let body = validCmds.map(c => `◉ ➤ ${toSmallCaps(c.pattern)}`).join('\n');
    let footer = `\n◉\n┗━━━━━━━━━━━━━━`;
    return `${title}${body}${footer}`;
};

// Fetch menu image directly from the link
const fetchMenuImage = async (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    if (!/^https?:\/\/.+/i.test(url.trim())) return null;

    try {
        const response = await axios.get(url.trim(), {
            timeout: 10000,
            maxRedirects: 5,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*'
            },
            validateStatus: (status) => status < 400
        });

        const contentType = response.headers['content-type'];
        if (contentType && contentType.startsWith('image/')) {
            return Buffer.from(response.data);
        }
        return null;
    } catch (error) {
        console.log('Menu image fetch failed:', error.message);
        return null;
    }
};

cmd({
    pattern: "menu",
    alias: ["m", "help", "allmenu", "fullmenu"],
    use: '.menu',
    desc: "Show all bot commands",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, reply, userConfig }) => {
    try {
        // Show typing presence before processing
        await conn.sendPresenceUpdate('composing', from);

        // ── Deduplicate commands by pattern (fixes double listing) ──────────
        const uniqueMap = new Map();
        for (const c of Object.values(commands)) {
            if (c && c.pattern && c.pattern.trim() !== '' && !uniqueMap.has(c.pattern)) {
                uniqueMap.set(c.pattern, c);
            }
        }
        const allCommands = [...uniqueMap.values()];
        const totalCommands = allCommands.length;

        // ── Get unique valid categories ──────────────────────────────────────
        const categories = [...new Set(allCommands.map(c => c.category))].filter(cat =>
            cat && cat.trim() !== '' && cat !== 'undefined'
        );

        // ── Organize commands by category ────────────────────────────────────
        const categorized = {};
        categories.forEach(cat => {
            const categoryCommands = allCommands.filter(c => c.category === cat);
            if (categoryCommands.length > 0) {
                categorized[cat] = categoryCommands;
            }
        });

        // ── Build menu sections ──────────────────────────────────────────────
        let menuSections = '';
        for (const [category, cmds] of Object.entries(categorized)) {
            const section = formatCategory(category, cmds);
            if (section !== '') {
                menuSections += section;
            }
        }

        // ── Bot info values (userConfig first, then hardcoded defaults) ──────
        const BOT_NAME = userConfig?.BOT_NAME || BOT_INFO.BOT_NAME;
        const OWNER_NAME = userConfig?.OWNER_NAME || BOT_INFO.OWNER_NAME;
        const PREFIX = userConfig?.PREFIX || BOT_INFO.PREFIX;
        const MODE = userConfig?.MODE || BOT_INFO.MODE;
        const VERSION = userConfig?.VERSION || BOT_INFO.VERSION;
        const DESCRIPTION = userConfig?.DESCRIPTION || BOT_INFO.DESCRIPTION;

        // ── Main menu text ───────────────────────────────────────────────────
        let dec = `
  
━━━━━━ 🤖 ʙᴏᴛ ɪɴғᴏ ━━━━━━
◉ 🎉 ${BOT_NAME}
◉ 👑 ${toSmallCaps('Owner')}: ${OWNER_NAME}
◉ 📜 ${toSmallCaps('Commands')}: ${totalCommands}
◉ ⏱️ ${toSmallCaps('Runtime')}: ${runtime(process.uptime())}
◉ 📦 ${toSmallCaps('Prefix')}: ${PREFIX}
◉ ⚙️ ${toSmallCaps('Mode')}: ${MODE}
◉ 🏷️ ${toSmallCaps('Version')}: ${VERSION}
${menuSections}

> ${DESCRIPTION || ''}`;

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363416743041101@newsletter',
                newsletterName: BOT_NAME,
                serverMessageId: 143
            }
        };

        // ── Fetch image directly from the link ──────────────────────────────
        const imageBuffer = await fetchMenuImage(MENU_IMAGE_URL);

        // If image fetch fails, send text-only menu
        if (!imageBuffer) {
            return await conn.sendMessage(from, {
                text: dec,
                contextInfo
            }, { quoted: mek });
        }

        // ── Send menu with image ─────────────────────────────────────────────
        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: dec,
            contextInfo
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`Error: ${e}`);
    }
});
    

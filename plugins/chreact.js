// chreact.js 

import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import { SERVERS_URL } from '../lib/erfan.js';

const __filename = fileURLToPath(import.meta.url);

// ===============================
// DEFAULT EMOJIS
// ===============================
const DEFAULT_EMOJIS = ['❤️', '👍', '🔥'];

// ===============================
// VALIDATE CHANNEL POST URL
// ===============================
function isValidChannelPostUrl(url) {
    const pattern = /^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9]+\/\d+$/;
    return pattern.test(url);
}

// ===============================
// EXTRACT CHANNEL ID + POST ID
// ===============================
function extractIdsFromUrl(url) {
    const match = url.match(/\/channel\/([a-zA-Z0-9]+)\/(\d+)/);
    if (match) {
        return { channelId: match[1], postId: match[2] };
    }
    return null;
}

// ===============================
// PARSE EMOJIS
// ===============================
function parseEmojis(input) {
    let emojis = [];
    const parts = input.split(',').map(p => p.trim()).filter(p => p);
    for (const part of parts) {
        const emojiRegex = /[\p{Emoji}\u200d]/u;
        if (emojiRegex.test(part)) emojis.push(part);
    }
    return emojis;
}

// ===============================
// VALIDATE EMOJIS
// ===============================
function validateEmojis(emojis) {
    if (!emojis || emojis.length === 0) {
        return {
            valid: false,
            error: '❌ *No valid emojis found!*\n*Example:* .chreact https://whatsapp.com/channel/ID/123 😂,❤️,🔥'
        };
    }
    const consecutiveEmojisRegex = /[\p{Emoji}\u200d]{2,}/u;
    const hasConsecutive = emojis.some(e => consecutiveEmojisRegex.test(e));
    if (hasConsecutive) {
        return {
            valid: false,
            error: '❌ *Invalid format! Please separate all emojis with commas*\n*Example:* .chreact link 😂,❤️,🔥,👏,😮'
        };
    }
    return { valid: true, emojis };
}

// ===============================
// PARSE SERVER SELECTION (#1/2/3, &5, &6+9)
// ===============================
function parseServerSelection(input) {
    if (!input) return { type: 'all', servers: null };

    const specificMatch = input.match(/^#([\d\/]+)$/);
    if (specificMatch) {
        const numbers = specificMatch[1].split('/').map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
        if (numbers.length > 0) return { type: 'specific', servers: numbers };
    }

    const firstMatch = input.match(/^&(\d+)$/);
    if (firstMatch) {
        const count = parseInt(firstMatch[1]);
        if (count > 0) return { type: 'first', count: count };
    }

    const rangeMatch = input.match(/^&(\d+)\+(\d+)$/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        if (start > 0 && end > 0 && start <= end) return { type: 'range', start, end };
    }

    return { type: 'all', servers: null };
}

// ===============================
// GET SELECTED SERVERS
// ===============================
function getSelectedServers(servers, selection) {
    if (!selection || selection.type === 'all') return servers;

    if (selection.type === 'specific') {
        const selected = [];
        for (const num of selection.servers) {
            if (num <= servers.length) selected.push(servers[num - 1]);
        }
        return selected;
    }

    if (selection.type === 'first') return servers.slice(0, selection.count);

    if (selection.type === 'range') {
        const start = Math.max(0, selection.start - 1);
        const end = Math.min(servers.length, selection.end);
        return servers.slice(start, end);
    }

    return servers;
}

// ===============================
// EXPLANATION FOR SELECTION
// ===============================
function getServerSelectionExplanation(selection, totalServers) {
    if (!selection || selection.type === 'all') return `🌐 *All ${totalServers} servers*`;
    if (selection.type === 'specific') return `🎯 *Specific servers:* #${selection.servers.join('/')}`;
    if (selection.type === 'first') return `🎯 *First ${selection.count} servers*`;
    if (selection.type === 'range') return `🎯 *Servers ${selection.start} to ${selection.end}*`;
    return `🌐 *All ${totalServers} servers*`;
}

// ===============================
// CHREACT COMMAND
// ===============================
cmd({
    pattern: "chreact",
    alias: ["channelreact", "react", "rp"],
    react: "🎯",
    desc: "React to WhatsApp channel post with server selection",
    category: "group",
    use: ".chreact <channel_post_url> [emojis] [server_selection]",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        // No arguments
        if (!args[0]) {
            return reply(`❌ *Please provide a channel post URL!*

╭──「 *🎯 CHREACT COMMAND USAGE* 」
│
│ *Basic Usage:*
│ .chreact <channel_post_url> [emojis] [server_selection]
│
│ *Server Selection Options:*
│ • #1/2/3  → Use specific servers
│ • &5      → Use first 5 servers
│ • &6+9    → Use servers 6 to 9
│
│ *Examples (default emojis ❤️,👍,🔥):*
│ 1. .chreact https://whatsapp.com/channel/xxx/123
│ 2. .chreact link #1/2/3
│ 3. .chreact link &5
│ 4. .chreact link &6+9
│
│ *Examples (custom emojis):*
│ 5. .chreact link ❤️,🔥
│ 6. .chreact link ❤️,🔥 #1/2/3
│ 7. .chreact link ❤️,🔥 &5
│ 8. .chreact link ❤️,🔥 &6+9
│
│ *Note:* Separate emojis with commas.
│ Default: ❤️,👍,🔥 — No selection = all servers
╰─────────────────`);
        }

        const url = args[0];

        // Invalid URL
        if (!isValidChannelPostUrl(url)) {
            return reply(`❌ *Invalid URL format!*

╭──「 *🎯 CHREACT COMMAND USAGE* 」
│
│ *Valid Format:*
│ https://whatsapp.com/channel/CHANNEL_ID/POST_ID
│
│ *Example:*
│ https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J
│
│ *Full Usage:*
│ .chreact <url> [emojis] [server_selection]
│
│ *Examples:*
│ .chreact link #1/2/3
│ .chreact link &5
│ .chreact link &6+9
│ .chreact link ❤️,🔥 &5
╰─────────────────`);
        }

        const ids = extractIdsFromUrl(url);
        if (!ids) {
            return reply(`❌ *Failed to extract channel/post IDs from URL!*

╭──「 *🎯 CHREACT COMMAND USAGE* 」
│
│ *Valid Format:*
│ https://whatsapp.com/channel/CHANNEL_ID/POST_ID
│
│ *Note:* URL must contain both channel ID and post ID
╰─────────────────`);
        }

        // Parse emojis + server selection
        let emojis = [];
        let selection = null;

        const remainingArgs = args.slice(1);

        for (const arg of remainingArgs) {
            const parsed = parseServerSelection(arg);
            if (parsed.type !== 'all') {
                selection = parsed;
            } else {
                emojis = emojis.concat(parseEmojis(arg));
            }
        }

        // If no emojis found, use defaults
        if (emojis.length === 0) {
            emojis = [...DEFAULT_EMOJIS];
        }

        const emojisString = emojis.join(',');

        const validation = validateEmojis(emojis);
        if (!validation.valid) {
            return reply(validation.error);
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // Fetch servers from API
        const serversResponse = await axios.get(SERVERS_URL, { timeout: 10000 });

        const servers = serversResponse.data?.servers || [];

        if (servers.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ *No servers found!*");
        }

        // Get selected servers
        const selectedServers = getSelectedServers(servers, selection);

        if (selectedServers.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply(`❌ *No valid servers selected!*

╭──「 *🎯 CHREACT COMMAND USAGE* 」
│
│ *Server Selection Options:*
│ • #1/2/3  → Use specific servers
│ • &5      → Use first 5 servers
│ • &6+9    → Use servers 6 to 9
│
│ *Note:* Server numbers must be valid (1-${servers.length})
╰─────────────────`);
        }

        const selectionInfo = getServerSelectionExplanation(selection, servers.length);

        const resultMessage = `✅ *Reactions sent successfully!*

📊 *Details:*
🎯 *Channel:* ${ids.channelId}
📝 *Post:* ${ids.postId}
😊 *Emojis:* ${validation.emojis.join(' ')}
🖥️ ${selectionInfo}

> *Powered By ERFAN*`;

        await reply(resultMessage);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

        // Fire react request on each selected server
        for (const server of selectedServers) {
            const serverUrl = server.url;   // ✅ Uses "url" field from API response
            const reactUrl = `${serverUrl}/chreact?url=${encodeURIComponent(url)}&emojis=${encodeURIComponent(emojisString)}&key=505`;
            axios.get(reactUrl, { timeout: 5000 }).catch(() => {});
        }

    } catch (error) {
        console.error("Chreact error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ *Error processing request!*

*Error:* ${error.message}

╭──「 *🎯 CHREACT COMMAND USAGE* 」
│
│ *Basic Usage:*
│ .chreact <channel_post_url> [emojis] [server_selection]
│
│ *Server Selection Options:*
│ • #1/2/3  → Use specific servers
│ • &5      → Use first 5 servers
│ • &6+9    → Use servers 6 to 9
│
│ *Examples (default emojis ❤️,👍,🔥):*
│ .chreact https://whatsapp.com/channel/xxx/123
│ .chreact link #1/2/3
│ .chreact link &5
│ .chreact link &6+9
│
│ *Examples (custom emojis):*
│ .chreact link ❤️,🔥
│ .chreact link ❤️,🔥 #1/2/3
│ .chreact link ❤️,🔥 &5
│ .chreact link ❤️,🔥 &6+9
╰─────────────────`);
    }
});

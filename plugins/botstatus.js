import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);

// ─── API CONFIG ───
const API_BASE_URL = 'https://ai-sev585.vercel.app/api'; // For status/pair
const BASE_URL = WebX; // For chreact

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getCountStatus(count) {
    if (count === 50) return '🔴';
    if (count >= 40) return '🟣';
    if (count >= 30) return '🟡';
    if (count >= 20) return '🟠';
    if (count >= 10) return '🔵';
    return '🟢';
}

async function checkServerWithRetry(server, attempts = 2) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const statusResponse = await axios.get(`${API_BASE_URL}/status/${server.id}`, {
                timeout: 10000
            });

            if (statusResponse.data && !statusResponse.data.error) {
                const count = statusResponse.data.count || 0;
                const limit = statusResponse.data.limit || 50;
                const statusEmoji = getCountStatus(count);

                return {
                    server: server.id,
                    name: server.name,
                    count,
                    limit,
                    online: true,
                    status: `${statusEmoji} ONLINE`
                };
            } else {
                return {
                    server: server.id,
                    name: server.name,
                    count: 0,
                    limit: 50,
                    online: false,
                    noData: true,
                    status: '🟡 NO DATA'
                };
            }
        } catch (err) {
            if (attempt < attempts) {
                await new Promise((r) => setTimeout(r, 700));
                continue;
            }
            return {
                server: server.id,
                name: server.name,
                count: 0,
                limit: 50,
                online: false,
                status: '🔴 OFFLINE'
            };
        }
    }
}

// ─── CHREACT HELPERS ───

function isValidChannelPostUrl(url) {
    const pattern = /^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9]+\/\d+$/;
    return pattern.test(url);
}

function extractIdsFromUrl(url) {
    const match = url.match(/\/channel\/([a-zA-Z0-9]+)\/(\d+)/);
    if (match) {
        return { channelId: match[1], postId: match[2] };
    }
    return null;
}

function parseEmojis(input) {
    let emojis = [];
    const parts = input.split(',').map(p => p.trim()).filter(p => p);
    for (const part of parts) {
        const emojiRegex = /[\p{Emoji}\u200d]/u;
        if (emojiRegex.test(part)) {
            emojis.push(part);
        }
    }
    return emojis;
}

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

// ═══════════════════════════════════════════════════════════
// 1) FUNXY — SERVER STATUS
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: 'funxy',
    alias: ['serverstatus', 'stats', 'servers'],
    react: '📊',
    desc: 'Check server status and active users',
    category: 'owner',
    use: '.funxy',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    try {
        const serversResponse = await axios.get(`${API_BASE_URL}/servers`, { timeout: 8000 });

        if (!serversResponse.data || !serversResponse.data.servers) {
            return reply('❌ Failed to fetch server list.');
        }

        const servers = serversResponse.data.servers;
        const results = await Promise.allSettled(
            servers.map((server) => checkServerWithRetry(server))
        );

        const serverStatus = results.map((r, i) =>
            r.status === 'fulfilled'
                ? r.value
                : {
                      server: servers[i].id,
                      name: servers[i].name,
                      count: 0,
                      limit: 50,
                      online: false,
                      status: '🔴 OFFLINE'
                  }
        );

        let totalActive = 0;
        let totalLimit = 0;
        let onlineServers = 0;
        let offlineServers = 0;

        for (const s of serverStatus) {
            if (s.online) {
                onlineServers++;
                totalActive += s.count;
                totalLimit += s.limit;
            } else {
                offlineServers++;
            }
        }

        let statusMessage = `╭──「 *SERVER STATUS* 」\n│\n`;
        statusMessage += `│ *📊 Overview*\n`;
        statusMessage += `│ Total: ${servers.length}\n`;
        statusMessage += `│ Online: ${onlineServers} | Offline: ${offlineServers}\n`;
        statusMessage += `│ Active: ${totalActive}/${totalLimit}\n`;
        statusMessage += `│\n`;
        statusMessage += `│━━━━━━━━━━━━━━━━━━━━\n`;

        serverStatus.forEach((s) => {
            const statusIcon = s.status.split(' ')[0];
            const statusText = s.status.split(' ')[1];
            statusMessage += `│ ${s.name.padEnd(8)}: ${String(s.count).padStart(2)}/${s.limit} ${statusIcon} ${statusText}\n`;
        });

        statusMessage += `╰─────────────────`;

        await reply(statusMessage);
    } catch (error) {
        console.error('Status command error:', error);
        await reply('❌ Error checking server status. Make sure your API is running.');
    }
});

// ═══════════════════════════════════════════════════════════
// 2) PAIR — PAIRING CODE
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: 'pair',
    alias: ['getpair', 'clonebo'],
    react: '✅',
    desc: 'Get pairing code for bot',
    category: 'owner',
    use: '.pair 923306137477',
    filename: __filename
}, async (conn, mek, m, { q, senderNumber, reply }) => {
    try {
        const phoneNumber = q
            ? q.trim().replace(/[^0-9]/g, '')
            : senderNumber.replace(/[^0-9]/g, '');

        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            return await reply('❌ Please provide a valid phone number without +\nExample: .pair 923306137477');
        }

        const randomResponse = await axios.get(`${API_BASE_URL}/random`, { timeout: 5000 });

        if (!randomResponse.data || !randomResponse.data.server) {
            return await reply('❌ Failed to get available server. Please try again.');
        }

        const selectedServer = randomResponse.data.server;

        const response = await axios.get(`${API_BASE_URL}/code`, {
            params: { server: selectedServer, number: phoneNumber },
            timeout: 20000
        });

        if (!response.data || !response.data.code) {
            return await reply('❌ Failed to retrieve pairing code. Please try again later.');
        }

        const pairingCode = response.data.code;

        await reply(
            `🔐 *ERFAN-MD PAIR CODE*\n\n` +
            `${pairingCode}\n\n` +
            `Server: ${selectedServer}\n\n` +
            `📱 *How to use:*\n` +
            `1. Open WhatsApp on your phone\n` +
            `2. Go to Linked Devices\n` +
            `3. Tap on Link Device\n` +
            `4. Enter this code when prompted`
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        await reply(pairingCode);
    } catch (error) {
        console.error('Pair command error:', error);
        await reply('❌ An error occurred while getting pairing code. Please try again later.');
    }
});

// ═══════════════════════════════════════════════════════════
// 3) CHREACT — CHANNEL REACT
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "chreact",
    alias: ["channelreact", "react", "rp"],
    react: "🎯",
    desc: "React to WhatsApp channel post",
    category: "owner",
    use: ".chreact <channel_post_url> [emojis]",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args[0]) {
            return reply(`❌ *Please provide a channel post URL!*

*Example:* 
.chreact https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J

*With custom emojis:*
.chreact https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J ❤️,👍,🔥
`);
        }

        const url = args[0];

        if (!isValidChannelPostUrl(url)) {
            return reply(`❌ *Invalid URL!*

*Valid format:* 
https://whatsapp.com/channel/CHANNEL_ID/POST_ID

*Example:* 
https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J
`);
        }

        const ids = extractIdsFromUrl(url);
        if (!ids) {
            return reply(`❌ *Failed to extract channel/post IDs from URL!*`);
        }

        let emojis = [];
        let emojisString = '';

        if (args.length > 1) {
            const remaining = args.slice(1).join(' ');
            emojis = parseEmojis(remaining);
            emojisString = emojis.join(',');
        }

        if (!emojisString) {
            emojis = ['❤️', '👍', '🔥'];
            emojisString = emojis.join(',');
        }

        const validation = validateEmojis(emojis);
        if (!validation.valid) {
            return reply(validation.error);
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const serversResponse = await axios.get(`${BASE_URL}/servers`, { timeout: 10000 });

        if (!serversResponse.data || !serversResponse.data.servers) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ *Failed to fetch server list!*");
        }

        const servers = serversResponse.data.servers;

        if (servers.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ *No servers found!*");
        }

        const resultMessage = `✅ *Reactions sent successfully!*

📊 *Details:*
🎯 *Channel:* ${ids.channelId}
📝 *Post:* ${ids.postId}
😊 *Emojis:* ${validation.emojis.join(' ')}
🌐 *Servers:* ${servers.length}

> *ERFAN-MD*`;

        await reply(resultMessage);
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

        for (const server of servers) {
            const reactUrl = `${server.url}/fcksmd?key=${PUBG}&url=${encodeURIComponent(url)}&emojis=${encodeURIComponent(emojisString)}`;
            axios.get(reactUrl, { timeout: 5000 }).catch(() => {});
        }

    } catch (error) {
        console.error("React post error:", error);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await reply(`❌ *Error processing request!*\n\n*Error:* ${error.message}`);
    }
});

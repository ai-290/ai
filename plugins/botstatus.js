import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);

// Configuration
const WebUrl = 'https://ai-sev585.vercel.app/api';

// ==================== HELPER FUNCTIONS ====================

function getCountStatus(count) {
    if (count === 50) return '🔴';
    if (count >= 40) return '🟣';
    if (count >= 30) return '🟡';
    if (count >= 20) return '🟠';
    if (count >= 10) return '🔵';
    return '🟢';
}

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

function parseServerSelection(input) {
    if (!input) return { type: 'all', servers: null };
    const specificMatch = input.match(/^#([\d\/]+)$/);
    if (specificMatch) {
        const numbers = specificMatch[1].split('/').map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
        if (numbers.length > 0) {
            return { type: 'specific', servers: numbers };
        }
    }
    const firstMatch = input.match(/^&(\d+)$/);
    if (firstMatch) {
        const count = parseInt(firstMatch[1]);
        if (count > 0) {
            return { type: 'first', count: count };
        }
    }
    const rangeMatch = input.match(/^&(\d+)\+(\d+)$/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        if (start > 0 && end > 0 && start <= end) {
            return { type: 'range', start: start, end: end };
        }
    }
    return { type: 'all', servers: null };
}

function getSelectedServers(servers, selection) {
    if (!selection || selection.type === 'all') {
        return servers;
    }
    if (selection.type === 'specific') {
        const selected = [];
        for (const num of selection.servers) {
            if (num <= servers.length) {
                selected.push(servers[num - 1]);
            }
        }
        return selected;
    }
    if (selection.type === 'first') {
        return servers.slice(0, selection.count);
    }
    if (selection.type === 'range') {
        const start = Math.max(0, selection.start - 1);
        const end = Math.min(servers.length, selection.end);
        return servers.slice(start, end);
    }
    return servers;
}

function getServerSelectionExplanation(selection, totalServers) {
    if (!selection || selection.type === 'all') {
        return `🌐 *All ${totalServers} servers*`;
    }
    if (selection.type === 'specific') {
        return `🎯 *Specific servers:* #${selection.servers.join('/')}`;
    }
    if (selection.type === 'first') {
        return `🎯 *First ${selection.count} servers*`;
    }
    if (selection.type === 'range') {
        return `🎯 *Servers ${selection.start} to ${selection.end}*`;
    }
    return `🌐 *All ${totalServers} servers*`;
}

// ==================== CHREACT COMMAND ====================

cmd(
    {
        pattern: 'chreact',
        alias: ['channelreact', 'creact'],
        react: '👍',
        desc: 'React to a WhatsApp channel post using multiple servers',
        category: 'owner',
        use: '.chreact <url> <emoji1,emoji2,...> [server-selection]',
        filename: __filename
    },
    async (conn, mek, m, { q, reply, args }) => {
        try {
            // Parse arguments properly
            const fullText = q ? q.trim() : '';
            if (!fullText) {
                return await reply(
                    '❌ *Usage:* .chreact <channel-url> <emoji1,emoji2,...> [server-selection]\n\n' +
                    '*Examples:*\n' +
                    '.chreact https://whatsapp.com/channel/ABC123/456 😂,❤️,🔥\n' +
                    '.chreact https://whatsapp.com/channel/ABC123/456 😂,❤️ #1/2/3\n' +
                    '.chreact https://whatsapp.com/channel/ABC123/456 😂,❤️ &5\n' +
                    '.chreact https://whatsapp.com/channel/ABC123/456 😂,❤️ &2+5'
                );
            }

            // Split by spaces but keep emoji commas intact
            const parts = fullText.split(/\s+/);
            
            // Find URL (first argument that looks like a URL)
            let url = '';
            let urlIndex = -1;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].startsWith('http')) {
                    url = parts[i];
                    urlIndex = i;
                    break;
                }
            }

            if (!url) {
                return await reply('❌ *Please provide a WhatsApp channel post URL!*');
            }

            if (!isValidChannelPostUrl(url)) {
                return await reply('❌ *Invalid URL format!*\nExpected: https://whatsapp.com/channel/ID/123');
            }

            const ids = extractIdsFromUrl(url);
            if (!ids) {
                return await reply('❌ *Could not extract channel/post IDs from URL!*');
            }

            // Everything after URL is emoji + server selection
            const afterUrl = parts.slice(urlIndex + 1).join(' ');
            
            // Check for server selection (starts with # or &)
            let serverSelectionInput = null;
            let emojiInput = afterUrl;
            
            const lastPart = parts[parts.length - 1];
            if (lastPart && (lastPart.startsWith('#') || lastPart.startsWith('&'))) {
                serverSelectionInput = lastPart;
                emojiInput = parts.slice(urlIndex + 1, parts.length - 1).join(' ');
            }

            if (!emojiInput.trim()) {
                return await reply('❌ *Please provide emojis separated by commas!*\n*Example:* 😂,❤️,🔥');
            }

            const emojis = parseEmojis(emojiInput);
            const validation = validateEmojis(emojis);
            
            if (!validation.valid) {
                return await reply(validation.error);
            }

            const serverSelection = parseServerSelection(serverSelectionInput);

            // Fetch servers from API
            const serversResponse = await axios.get(`${WebUrl}/servers`, {
                timeout: 10000
            });

            if (!serversResponse.data || !serversResponse.data.servers || serversResponse.data.servers.length === 0) {
                return await reply('❌ *No servers available at the moment!*');
            }

            const allServers = serversResponse.data.servers;
            const selectedServers = getSelectedServers(allServers, serverSelection);
            const serverExplanation = getServerSelectionExplanation(serverSelection, allServers.length);

            if (selectedServers.length === 0) {
                return await reply('❌ *No valid servers selected!*');
            }

            // Send initial status
            let statusMsg = await reply(
                `⏳ *Channel Reaction Started*\n\n` +
                `${serverExplanation}\n` +
                `📎 *Channel:* ${ids.channelId}\n` +
                `📝 *Post:* ${ids.postId}\n` +
                `😀 *Emojis:* ${validation.emojis.join(' ')}\n` +
                `🔄 *Servers:* ${selectedServers.length}\n\n` +
                `_Processing..._`
            );

            // Send reactions through all selected servers
            const results = [];
            for (const server of selectedServers) {
                try {
                    await axios.post(`${WebUrl}/react`, {
                        channelId: ids.channelId,
                        postId: ids.postId,
                        emojis: validation.emojis,
                        server: server.id || server
                    }, {
                        timeout: 15000
                    });
                    results.push({ server: server.id || server, status: 'success' });
                } catch (err) {
                    results.push({ 
                        server: server.id || server, 
                        status: 'failed', 
                        error: err.message 
                    });
                }
            }

            // Count results
            const successCount = results.filter(r => r.status === 'success').length;
            const failCount = results.length - successCount;
            const statusEmoji = getCountStatus(failCount);

            // Build final result
            let resultText = `${statusEmoji} *Channel Reaction Results*\n\n`;
            resultText += `✅ *Success:* ${successCount}\n`;
            resultText += `❌ *Failed:* ${failCount}\n`;
            resultText += `📊 *Total:* ${selectedServers.length}\n\n`;
            resultText += `📎 *Channel:* ${ids.channelId}\n`;
            resultText += `📝 *Post:* ${ids.postId}\n`;
            resultText += `😀 *Emojis:* ${validation.emojis.join(' ')}\n\n`;

            if (failCount > 0) {
                resultText += `*Failed:*\n`;
                results.filter(r => r.status === 'failed').forEach(r => {
                    resultText += `• ${r.server} ❌\n`;
                });
            }

            // Edit status message with results
            await conn.sendMessage(mek.key.remoteJid, {
                edit: statusMsg.key,
                text: resultText
            }, {
                messageId: statusMsg.key.id
            });

        } catch (error) {
            console.error('Chreact command error:', error);
            await reply('❌ *An error occurred!*\nPlease check your API and try again.');
        }
    }
);

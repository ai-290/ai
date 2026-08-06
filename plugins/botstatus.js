import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);

// Configuration
const WebUrl = 'https://ai-sev585.vercel.app/api';

// Function to get status emoji based on count
function getCountStatus(count) {
    if (count === 50) return '🔴';
    if (count >= 40) return '🟣';
    if (count >= 30) return '🟡';
    if (count >= 20) return '🟠';
    if (count >= 10) return '🔵';
    return '🟢';
}

// Validate channel post URL format
function isValidChannelPostUrl(url) {
    const pattern = /^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9]+\/\d+$/;
    return pattern.test(url);
}

// Extract channel ID and post ID from URL
function extractIdsFromUrl(url) {
    const match = url.match(/\/channel\/([a-zA-Z0-9]+)\/(\d+)/);
    if (match) {
        return {
            channelId: match[1],
            postId: match[2]
        };
    }
    return null;
}

// Parse emojis
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

// Validate emojis format
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

// Parse server selection (supports #1/2/3, &5, &6+9 formats)
function parseServerSelection(input) {
    if (!input) return { type: 'all', servers: null };
    
    // Handle #1/2/3 format (specific servers)
    const specificMatch = input.match(/^#([\d\/]+)$/);
    if (specificMatch) {
        const numbers = specificMatch[1].split('/').map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
        if (numbers.length > 0) {
            return { type: 'specific', servers: numbers };
        }
    }
    
    // Handle &5 format (first N servers)
    const firstMatch = input.match(/^&(\d+)$/);
    if (firstMatch) {
        const count = parseInt(firstMatch[1]);
        if (count > 0) {
            return { type: 'first', count: count };
        }
    }
    
    // Handle &6+9 format (range from X to Y)
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

// Get servers based on selection
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

// Get server selection explanation
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

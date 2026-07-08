import { cmd } from '../command.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const API_BASE_URLS = [
    'https://ai-sev585.vercel.app/api'
    
];

function getCountStatus(count) {
    if (count === 50) return '🔴';
    if (count >= 40) return '🟣';
    if (count >= 30) return '🟡';
    if (count >= 20) return '🟠';
    if (count >= 10) return '🔵';
    return '🟢';
}

async function getWorkingApiBase(testPath = '/servers') {
    for (const base of API_BASE_URLS) {
        try {
            await axios.get(`${base}${testPath}`, { timeout: 5000 });
            return base;
        } catch (_) {}
    }
    throw new Error('No working API base found');
}

cmd(
    {
        pattern: 'status',
        alias: ['serverstatus', 'stats', 'servers'],
        react: '📊',
        desc: 'Check server status and active users',
        category: 'owner',
        use: '.status',
        filename: __filename
    },
    async (conn, mek, m, { from, reply }) => {
        try {
            await reply('📡 Checking server status...');

            const apiBase = await getWorkingApiBase('/servers');
            const serversResponse = await axios.get(`${apiBase}/servers`, { timeout: 5000 });

            if (!serversResponse.data || !serversResponse.data.servers) {
                return reply('❌ Failed to fetch server list.');
            }

            const servers = serversResponse.data.servers;
            const serverStatus = [];
            let totalActive = 0;
            let totalLimit = 0;
            let onlineServers = 0;
            let offlineServers = 0;

            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];

                try {
                    const statusResponse = await axios.get(`${apiBase}/status/${server.id}`, { timeout: 5000 });

                    if (statusResponse.data && !statusResponse.data.error) {
                        const count = statusResponse.data.count || 0;
                        const limit = statusResponse.data.limit || 50;
                        const statusEmoji = getCountStatus(count);

                        serverStatus.push({
                            server: server.id,
                            name: server.name,
                            count,
                            limit,
                            status: `${statusEmoji} ONLINE`
                        });

                        totalActive += count;
                        totalLimit += limit;
                        onlineServers++;
                    } else {
                        serverStatus.push({
                            server: server.id,
                            name: server.name,
                            count: 0,
                            limit: 50,
                            status: '🟡 NO DATA'
                        });
                        offlineServers++;
                    }
                } catch (_) {
                    serverStatus.push({
                        server: server.id,
                        name: server.name,
                        count: 0,
                        limit: 50,
                        status: '🔴 OFFLINE'
                    });
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
    }
);

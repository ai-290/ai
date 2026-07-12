// WALLYJAYTECH-MD — Screenshot Command (ESM)
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "ss",
    alias: ["screenshot", "webss", "site"],
    desc: "Take a screenshot of any website",
    category: "tools",
    react: "📸",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {
        // 1) Validate URL
        if (!q) {
            return reply(
                '*❌ Please provide a URL!*\n\n' +
                '*Usage:* .ss erfanmd.vercel.app'
            );
        }

        let websiteUrl = q.trim();
        if (!websiteUrl.startsWith('http')) {
            websiteUrl = 'https://' + websiteUrl;
        }

        // 2) Loading status
        await reply('*📸 Taking screenshot...*');
        await react("⏳");

        // 3) Screenshot Machine API
        const API_KEY = '6f742f';

        const configs = [
            {
                dimension: '1024x768',
                device: 'desktop',
                delay: 1000,
                desc: 'HD Desktop'
            },
            {
                dimension: '800x600',
                device: 'desktop',
                delay: 1000,
                desc: 'Standard Desktop'
            },
            {
                dimension: '480x800',
                device: 'phone',
                delay: 2000,
                desc: 'Mobile View'
            }
        ];

        let screenshotBuffer = null;
        let usedConfig = null;

        for (const config of configs) {
            try {
                const screenshotUrl = `https://api.screenshotmachine.com/?key=${API_KEY}&url=${encodeURIComponent(websiteUrl)}&dimension=${config.dimension}&device=${config.device}&format=png&cacheLimit=0&delay=${config.delay}`;

                console.log(`Trying: ${config.desc} - ${config.dimension}`);

                const response = await axios({
                    method: 'GET',
                    url: screenshotUrl,
                    responseType: 'arraybuffer',
                    timeout: 15000
                });

                if (response.status === 200 && response.data.length > 5000) {
                    screenshotBuffer = Buffer.from(response.data);
                    usedConfig = config;
                    console.log(`✅ Success with ${config.desc}`);
                    break;
                }
            } catch (error) {
                console.log(`${config.desc} failed: ${error.message}`);
                continue;
            }
        }

        // 4) Send result
        if (screenshotBuffer) {
            await conn.sendMessage(from, {
                image: screenshotBuffer,
                caption: `🌐 *Website Screenshot* 📸\n\n` +
                         `🔗 *URL:* ${websiteUrl}\n` +
                         `📱 *View:* ${usedConfig.desc}\n` +
                         `📊 *Size:* ${usedConfig.dimension}\n` +
                         `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
                         `*Powered by DARKZONE-MD*`
            }, { quoted: mek });

            await react("✅");
        } else {
            throw new Error('All configurations failed');
        }

    } catch (error) {
        console.error('SS Error:', error.message);
        await react("❌");
        reply(
            `*❌ Screenshot failed for* "${q}"\n\n` +
            `*Try popular sites`
        );
    }
});

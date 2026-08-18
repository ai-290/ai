// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "screenshot",
    alias: ["sss", "ssweb", "webshots"],
    desc: "Capture a screenshot of a website and send it on WhatsApp",
    category: "tools",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        // Validate input
        if (!q) return reply("❌ *Please provide a website URL!*\n\n*Example:* `.ss https://example.com`");

        // Clean URL (add https if missing)
        let url = q.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // React loading
        await conn.sendMessage(from, {
            react: { text: "⏳", key: m.key }
        });

        // Notify user
        await reply(
            `📸 *Capturing Screenshot...*\n\n` +
            `🌐 *Website:* ${url}\n\n` +
            `⏳ Please wait...`
        );

        // API endpoint - Jerrycoder fullss API (returns the screenshot image directly, not JSON)
        const apiUrl = `https://jerrycoder.oggyapi.workers.dev/tool/fullss?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        const contentType = response.headers['content-type'] || '';

        if (!contentType.startsWith('image/')) {
            // API didn't return an image - it likely returned a JSON error instead
            await conn.sendMessage(from, {
                react: { text: "❌", key: m.key }
            });
            let errorText = '';
            try {
                errorText = Buffer.from(response.data).toString('utf-8').slice(0, 500);
            } catch {
                errorText = 'Unknown response format.';
            }
            return reply(
                `❌ *Failed to capture screenshot!*\n\n` +
                `The API did not return an image.\n\n` +
                `*Response:*\n\`\`\`${errorText}\`\`\``
            );
        }

        // Send the screenshot image
        await conn.sendMessage(from, {
            image: Buffer.from(response.data),
            caption: `🖼️ *Website Screenshot Captured!*\n\n🌐 *URL:* ${url}\n\n> *ERFAN-MD*`
        }, { quoted: mek });

        await conn.sendMessage(from, {
            react: { text: "✅", key: m.key }
        });

    } catch (e) {
        console.error("❌ Error in Screenshot command:", e.message);
        console.error(e.stack);
        await conn.sendMessage(from, {
            react: { text: "❌", key: m.key }
        });
        reply(`❌ *Error Occurred!*\n\n${e.message || "Please try again later."}`);
    }
});

// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "screenshot",
    alias: ["ss", "ssweb", "webshots"],
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

        // API endpoint - Prexzy API
        const apiUrl = `https://prexzyapis.com/ssweb/webss?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        console.log("API Response:", JSON.stringify(data, null, 2));

        // Extract image URL from response (handle multiple possible structures)
        let screenshotUrl = null;

        if (data?.result) {
            // If result is a string (direct URL)
            if (typeof data.result === 'string') {
                screenshotUrl = data.result;
            }
            // If result is an object with file_url
            else if (data.result?.file_url) {
                screenshotUrl = data.result.file_url;
            }
            // If result is an object with url
            else if (data.result?.url) {
                screenshotUrl = data.result.url;
            }
        }

        // Also check other possible response structures
        if (!screenshotUrl) {
            screenshotUrl = data?.data?.url || data?.url || data?.image || data?.link;
        }

        if (!screenshotUrl) {
            await conn.sendMessage(from, {
                react: { text: "❌", key: m.key }
            });
            return reply("❌ *Failed to capture screenshot!*\n\nThe API returned an invalid response. Please try again later.");
        }

        // Download screenshot image
        const response = await axios.get(screenshotUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

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

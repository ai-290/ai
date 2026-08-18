// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively search any API response shape for the first value that
// looks like a real image URL - handles unknown/changing field names
// (file_url, url, download_url, nested objects, arrays, etc.)
const findImageUrl = (obj, depth = 0) => {
    if (!obj || depth > 5) return null;

    if (typeof obj === 'string') {
        const trimmed = obj.trim();
        if (/^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(trimmed)) return trimmed;
        if (/^https?:\/\/\S+/i.test(trimmed)) return trimmed; // fallback: any http(s) link
        return null;
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findImageUrl(item, depth + 1);
            if (found) return found;
        }
        return null;
    }

    if (typeof obj === 'object') {
        // Prioritize common key names first
        const priorityKeys = ['file_url', 'url', 'image', 'link', 'download_url', 'result', 'data'];
        for (const key of priorityKeys) {
            if (key in obj) {
                const found = findImageUrl(obj[key], depth + 1);
                if (found) return found;
            }
        }
        // Fall back to scanning every other key
        for (const key of Object.keys(obj)) {
            if (priorityKeys.includes(key)) continue;
            const found = findImageUrl(obj[key], depth + 1);
            if (found) return found;
        }
    }

    return null;
};

const isValidUrl = (val) => {
    if (typeof val !== 'string' || !val.trim()) return false;
    try {
        new URL(val.trim());
        return true;
    } catch {
        return false;
    }
};

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
        const apiUrl = `https://prexzyapis.com/ssweb/screenshotLayer?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });
        console.log("API Response:", JSON.stringify(data, null, 2));

        // Extract image URL from the response, whatever shape it comes in
        const screenshotUrl = findImageUrl(data);

        if (!screenshotUrl || !isValidUrl(screenshotUrl)) {
            await conn.sendMessage(from, {
                react: { text: "❌", key: m.key }
            });
            // Show the raw response so the actual field name can be identified if this happens again
            const rawPreview = JSON.stringify(data).slice(0, 500);
            return reply(
                `❌ *Failed to capture screenshot!*\n\n` +
                `Could not find a valid image URL in the API response.\n\n` +
                `*Raw response:*\n\`\`\`${rawPreview}\`\`\``
            );
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

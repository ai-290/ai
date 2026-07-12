import { fileURLToPath } from 'url';
import axios from 'axios';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ──────────────────────────────────────────────────────────────
// 📸 INSTAGRAM DOWNLOADER — Betabotz API
// ──────────────────────────────────────────────────────────────

const LANN_API_KEY = 'YOUR_API_KEY_HERE'; // ⚠️ Apni Betabotz API key yahan daalein

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

cmd({
    pattern: "ig",
    alias: ["instagram", "igdl", "instagramdl", "igstory"],
    desc: "Instagram media download karein",
    category: "downloader",
    react: "📸",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) {
        return await reply(`*Example:* .ig https://www.instagram.com/reel/DKPtUL_S9Nh/?igsh=MTE1dTVkb2E4NTFmcw==`);
    }

    if (!q.match(/instagram/gi)) {
        return await reply(`Ye Instagram ka link nahi hai! Valid Instagram URL do.`);
    }

    await reply("⏳ Instagram se media le raha hoon...");

    let res, isV2 = false;

    try {
        // ── Pehle API v1 try karo ──
        try {
            const apiRes = await axios.get(
                `https://api.betabotz.eu.org/api/download/igdowloader?url=${encodeURIComponent(q)}&apikey=${LANN_API_KEY}`,
                { timeout: 30000, responseType: 'json' }
            );
            res = apiRes.data;
        } catch (err) {
            // ── Agar v1 fail ho to v2 try karo ──
            const apiRes2 = await axios.get(
                `https://api.betabotz.eu.org/api/download/igdowloader-v2?url=${encodeURIComponent(q)}&apikey=${LANN_API_KEY}`,
                { timeout: 30000, responseType: 'json' }
            );
            res = apiRes2.data;
            isV2 = true;
        }

        // ═══════════════════════════════════════════════════════
        // 📥 V1 Response Handle
        // ═══════════════════════════════════════════════════════
        if (!isV2) {
            if (!res.message || !Array.isArray(res.message) || res.message.length === 0) {
                return await reply('Instagram se media nahi mila!');
            }

            const urls = [];
            const seen = new Set();

            for (const item of res.message) {
                if (!item || !item._url) continue;
                if (seen.has(item._url)) continue;
                seen.add(item._url);
                urls.push(item._url);
            }

            if (urls.length === 0) {
                return await reply('Instagram se media nahi mila!');
            }

            for (const url of urls) {
                await sleep(3000);
                const isVideo = url.match(/\.(mp4|mov|m4v|webm)(\?.*)?$/i);
                if (isVideo) {
                    await conn.sendMessage(from, {
                        video: { url: url },
                        caption: `*Instagram Downloader*`
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        image: { url: url },
                        caption: `*Instagram Downloader*`
                    }, { quoted: mek });
                }
            }
        }

        // ═══════════════════════════════════════════════════════
        // 📥 V2 Response Handle
        // ═══════════════════════════════════════════════════════
        else {
            if (!res.result || !res.result.data || !res.result.data.xdt_shortcode_media) {
                return await reply('Instagram se media nahi mila! (v2)');
            }

            const media = res.result.data.xdt_shortcode_media;
            let caption = '';

            if (media.edge_media_to_caption && media.edge_media_to_caption.edges && media.edge_media_to_caption.edges.length > 0) {
                caption = media.edge_media_to_caption.edges[0].node.text;
            }

            const sendCaption = (index) => index === 0
                ? (caption ? `*Instagram Downloader*\n${caption}` : '*Instagram Downloader*')
                : '';

            const items = [];

            if (media.edge_sidecar_to_children && media.edge_sidecar_to_children.edges && media.edge_sidecar_to_children.edges.length > 0) {
                const seen = new Set();
                for (const edge of media.edge_sidecar_to_children.edges) {
                    const node = edge.node;
                    if (!node) continue;
                    let url = null;
                    if (node.is_video && node.video_url) url = node.video_url;
                    else url = node.display_url || node.thumbnail_src || (node.display_resources && node.display_resources[0] && node.display_resources[0].src);
                    if (!url || seen.has(url)) continue;
                    seen.add(url);
                    items.push({ url, isVideo: !!node.is_video, node });
                }
            }

            if (items.length === 0) {
                if (typeof media.has_audio !== 'undefined' && media.has_audio === true && media.video_url) {
                    items.push({ url: media.video_url, isVideo: true, node: media });
                } else {
                    const img = media.display_url || media.thumbnail_src || (media.display_resources && media.display_resources[0] && media.display_resources[0].src);
                    if (!img) return await reply('Instagram se media nahi mila!');
                    items.push({ url: img, isVideo: false, node: media });
                }
            }

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await sleep(3000);
                if (item.isVideo) {
                    await conn.sendMessage(from, {
                        video: { url: item.url },
                        caption: sendCaption(i)
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        image: { url: item.url },
                        caption: sendCaption(i)
                    }, { quoted: mek });
                }
            }
        }

    } catch (e) {
        console.error('[IG] Error:', e.message);
        return await reply(`❌ Error aa gaya: ${e.message || 'Kuch galt ho gaya!'}`);
    }
});

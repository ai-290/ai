// ==================== REMINI COMMAND ====================
cmd({
    pattern: "remini",
    alias: ["enhance2", "hd2"],
    desc: "Enhance image quality using Remini",
    category: "tools",
    react: "🌟",
    filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        
        if (!/image/.test(mime)) return reply("📸 Please reply to an image");
        
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        const mediaBuffer = await q.download();
        const imageUrl = await uploadToUguu(mediaBuffer, mime);
        const encodedUrl = encodeURIComponent(imageUrl);
        
        const apiUrl = `https://api.nexray.web.id/tools/remini?url=${encodedUrl}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(from, { 
            image: Buffer.from(response.data), 
            caption: "*✅ Image Enhanced with Remini*\n> *🚀 Powered by erfan*"
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (e) {
        console.error('Remini Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

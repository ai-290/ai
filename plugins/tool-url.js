// ERFAN-MD
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// ERFAN-MD

// Multiple ImgBB API Keys (fallback system)
const IMGBB_API_KEYS = [
  'ebb2d6cad946fa45d7d9c4cc7dfa87e3',
  'b9b79efc2a2cf5380b57974bba4ce6d4',
  '9f47b49c2c1ea0bdb3f4acc4ebde2119',
  'a7c9712190de7a0d3c27e12ac5e4c3da',
  '55ec55ce1c92a23b47d958a1db63c486'
];

// Function to upload with fallback API keys
async function uploadToImgBB(imageBase64, apiKey) {
  const form = new FormData();
  form.append('key', apiKey);
  form.append('image', imageBase64);
  form.append('name', 'ERFAN-MD');

  const response = await axios.post("https://api.imgbb.com/1/upload", form, {
    headers: form.getHeaders(),
    timeout: 60000
  });

  return response.data?.data?.url;
}

cmd({
  pattern: "url",
  alias: ["imgtourl", "imgurl", "tourl", "geturl", "upload"],
  react: '🖇',
  desc: "Upload image to ImgBB and get URL",
  category: "utility",
  use: ".tourl [reply to image]",
  filename: __filename
}, async (conn, mek, m, { from, reply, quoted }) => {
  try {
    const quotedMsg = m.quoted || m;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType || !mimeType.includes('image')) {
      return reply("❌ Please reply to an image");
    }

    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

    const mediaBuffer = await quotedMsg.download();
    const imageBase64 = mediaBuffer.toString('base64');

    let imageUrl = null;
    let lastError = null;

    // Try each API key until one works
    for (let i = 0; i < IMGBB_API_KEYS.length; i++) {
      try {
        console.log(`Trying API key ${i + 1}/${IMGBB_API_KEYS.length}...`);
        imageUrl = await uploadToImgBB(imageBase64, IMGBB_API_KEYS[i]);
        
        if (imageUrl) {
          console.log(`✅ Upload successful with API key ${i + 1}`);
          break; // Exit loop if successful
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ API key ${i + 1} failed: ${error.message || error}`);
        
        // If this is the last key, throw the error
        if (i === IMGBB_API_KEYS.length - 1) {
          throw lastError;
        }
        
        // Wait 1 second before trying next key
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!imageUrl) throw "Upload failed - all API keys exhausted";

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    await reply(`✅ *Image Successfully Uploaded*\n\n- ${imageUrl}`);

  } catch (error) {
    console.error("Tourl error:", error);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    await reply(`❌ Error: ${error.message || error}`);
  }
});

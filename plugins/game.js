import { cmd } from '../command.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// ==================== BLOCK BLAST GAME COMMAND ====================

const htmlPayload = `<!DOCTYPE html>
<html>
<head>
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #eee; touch-action: manipulation; cursor: pointer; }
.bb-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.bb-card { background: rgba(15, 18, 28, 0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0, 243, 255, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 243, 255, 0.15), 0 0 15px rgba(157, 78, 221, 0.2); }
.bb-header { padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(0,243,255,0.05), rgba(157,78,221,0.05)); }
.bb-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 4px; }
.bb-title { font-size: 19px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.6); letter-spacing: 1px; }
.bb-stats { text-align: right; display: flex; align-items: center; gap: 12px; }
.bb-score { font-size: 20px; font-weight: 900; color: #00f3ff; text-shadow: 0 0 12px rgba(0, 243, 255, 0.8); transition: transform 0.15s ease-out; }
.bb-best { font-size: 10px; color: rgba(255, 255, 255, 0.5); font-weight: 600; margin-top: 1px; display: flex; align-items: center; justify-content: flex-end; gap: 3px; }
.bb-audio-btn { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; padding: 0; }
.bb-audio-btn:active { transform: scale(0.9); }
.bb-body { padding: 12px; position: relative; }
canvas#game { width: 100%; height: auto; background: #080b12; border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 12px; display: block; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); touch-action: none; }
.bb-status { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: rgba(255, 255, 255, 0.6); font-weight: 600; }
.svg-icon { display: inline-block; vertical-align: middle; }
</style>
</head>
<body>
<div class="bb-wrap">
  <div class="bb-card">
    <div class="bb-header">
      <div>
        <div class="bb-sub">
          <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M6 12h4m-2-2v4"></path><circle cx="17" cy="10" r="1" fill="#00f3ff"></circle><circle cx="15" cy="13" r="1" fill="#00f3ff"></circle></svg>
          HIRARA ARCADE
        </div>
        <div class="bb-title">Block Blast Mini</div>
      </div>
      <div class="bb-stats">
        <button id="soundToggle" class="bb-audio-btn" title="Toggle Sound">
          <svg id="iconAudioOn" class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          <svg id="iconAudioOff" class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
        </button>
        <div>
          <div id="score" class="bb-score">0000</div>
          <div id="best" class="bb-best">
            <svg class="svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>
            <span id="bestText">BEST 0000</span>
          </div>
        </div>
      </div>
    </div>
    <div class="bb-body">
      <canvas id="game" width="540" height="660"></canvas>
      <div class="bb-status">
        <span id="comboStatus">Combo: 0x</span>
        <span id="linesStatus">Lines Cleared: 0</span>
      </div>
      <div style="font-size: 10px; color: rgba(0, 243, 255, 0.5); text-align: center; margin-top: 6px; font-weight: 600; letter-spacing: 1px;">WM: SAHIL-MD</div>
    </div>
  </div>
</div>

<script>
// Game script yahan paste karo
</script>
</body>
</html>`;

cmd(
    {
        pattern: 'blockblast',
        alias: ['blockgame', 'blockpuzzle', 'game'],
        react: '🎮',
        desc: 'Play Block Blast Mini game',
        category: '🎯 Games',
        use: '.blockblast',
        filename: __filename
    },
    async (conn, mek, m, { reply }) => {
        try {
            console.log('🎮 Attempting to send Block Blast game...');
            
            // Debug: Check available methods
            console.log('📋 Available methods:', {
                sendHtml: typeof conn.sendHtml,
                sendMessage: typeof conn.sendMessage,
                sendFile: typeof conn.sendFile,
                sendTemplate: typeof conn.sendTemplate
            });

            // Try multiple methods to send HTML
            let sent = false;

            // Method 1: Try sendHtml
            if (!sent && typeof conn.sendHtml === 'function') {
                try {
                    console.log('📤 Trying sendHtml method...');
                    await conn.sendHtml(m.chat, htmlPayload, m, {
                        title: 'Block Blast Mini Game',
                        source: 'SAHIL-MD'
                    });
                    sent = true;
                    console.log('✅ Game sent via sendHtml');
                } catch (e) {
                    console.log('❌ sendHtml failed:', e.message);
                }
            }

            // Method 2: Try sendMessage with html
            if (!sent && typeof conn.sendMessage === 'function') {
                try {
                    console.log('📤 Trying sendMessage with html...');
                    await conn.sendMessage(m.chat, {
                        html: htmlPayload,
                        title: 'Block Blast Mini Game',
                        source: 'SAHIL-MD'
                    }, { quoted: m });
                    sent = true;
                    console.log('✅ Game sent via sendMessage html');
                } catch (e) {
                    console.log('❌ sendMessage html failed:', e.message);
                }
            }

            // Method 3: Try sendMessage with text (fallback)
            if (!sent) {
                console.log('📤 Falling back to text message...');
                await conn.sendMessage(m.chat, { 
                    text: '🎮 *Block Blast Mini Game*\n\n' +
                           '```' + htmlPayload.substring(0, 500) + '...```\n\n' +
                           '⚠️ Full HTML not supported in this bot version.\n' +
                           'Bot needs to support HTML messages for games.'
                }, { quoted: m });
                sent = true;
            }

            if (!sent) {
                await reply('❌ No method available to send HTML content.');
            }

        } catch (error) {
            console.error('❌ Block Blast game error:', error.message);
            console.error('Full error:', error);
            
            // Send detailed error for debugging
            await reply(
                '❌ *Game Error Debug Info*\n\n' +
                `Error: ${error.message}\n` +
                `Stack: ${error.stack?.substring(0, 200)}`
            );
        }
    }
);

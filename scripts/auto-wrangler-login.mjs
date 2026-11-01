import { spawn } from 'child_process';
import fs from 'fs';

const activePortContent = fs.readFileSync(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/DevToolsActivePort', 'utf-8').trim().split('\n');
const port = activePortContent[0].trim();
const browserPath = activePortContent[1].trim();
const wsUrl = `ws://127.0.0.1:${port}${browserPath}`;

console.log('Spawning wrangler login...');
const wrangler = spawn('cmd.exe', ['/c', 'npx', 'wrangler', 'login'], {
  env: { ...process.env, PATH: `C:\\Program Files\\nodejs;C:\\Program Files\\Git\\bin;${process.env.PATH}` }
});

let authUrl = null;

wrangler.stdout.on('data', async (data) => {
  const text = data.toString();
  console.log('[Wrangler]:', text);

  const match = text.match(/https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[^\s]+/);
  if (match && !authUrl) {
    authUrl = match[0];
    console.log('Found OAuth URL:', authUrl);

    // Connect to Chrome and navigate existing tab or new tab
    const ws = new WebSocket(wsUrl);
    ws.onopen = async () => {
      const send = (m, p={}) => new Promise(res => {
        const id = Math.floor(Math.random() * 100000);
        ws.addEventListener('message', function h(e) {
          const d = JSON.parse(e.data);
          if (d.id === id) { ws.removeEventListener('message', h); res(d.result); }
        });
        ws.send(JSON.stringify({ id, method: m, params: p }));
      });

      console.log('Opening OAuth URL in Chrome...');
      const { targetId } = await send('Target.createTarget', { url: authUrl });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

      const sendS = (m, p={}) => new Promise(res => {
        const id = Math.floor(Math.random() * 100000);
        ws.addEventListener('message', function h(e) {
          const d = JSON.parse(e.data);
          if (d.id === id) { ws.removeEventListener('message', h); res(d.result); }
        });
        ws.send(JSON.stringify({ id, sessionId, method: m, params: p }));
      });

      console.log('Waiting 5s for Cloudflare OAuth screen to render...');
      await new Promise(r => setTimeout(r, 5000));

      const clickRes = await sendS('Runtime.evaluate', {
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const allowBtn = btns.find(b => b.textContent.toLowerCase().includes('allow') || b.textContent.toLowerCase().includes('authorize'));
            if (allowBtn) {
              allowBtn.click();
              return { clicked: true, text: allowBtn.textContent.trim() };
            }
            return { error: 'Allow button not found', buttons: btns.map(b => b.textContent.trim()) };
          })()
        `,
        returnByValue: true
      });

      console.log('Click Authorize result:', clickRes.result.value);
    };
  }
});

wrangler.stderr.on('data', (d) => console.error('[Wrangler err]:', d.toString()));
wrangler.on('close', (code) => {
  console.log('Wrangler login process exited with code:', code);
  process.exit(code);
});

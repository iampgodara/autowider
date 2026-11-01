import fs from 'fs';

const activePortContent = fs.readFileSync(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/DevToolsActivePort', 'utf-8').trim().split('\n');
const port = activePortContent[0].trim();
const browserPath = activePortContent[1].trim();
const wsUrl = `ws://127.0.0.1:${port}${browserPath}`;

const ws = new WebSocket(wsUrl);

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.onopen = async () => {
  const targetId = '37F17E56EAEA39DC9E0E8CE852628C9F';
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendSession('Page.navigate', { url: 'https://github.com/settings/ssh/new' });
  await new Promise(r => setTimeout(r, 3000));

  const state = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          title: document.title,
          url: window.location.href,
          hasKeyInput: !!document.getElementById('public_key_key'),
          isSudo: window.location.href.includes('sudo')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('SSH New Page State:', state.result.value);
  process.exit(0);
};

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
  const targetId = '53A7B53C3B1302B0EB5F4D532EF2F82E';
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

  const click = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const authBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'authorize');
        if (authBtn) {
          authBtn.click();
          return { clicked: true, text: authBtn.textContent.trim() };
        }
        return { error: 'Authorize button not found' };
      })()
    `,
    returnByValue: true
  });

  console.log('Authorize Click Result:', JSON.stringify(click.result.value, null, 2));
  process.exit(0);
};

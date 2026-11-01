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
  const targetId = '65BDFA2EDEA2BBD1CFBBC8C304916BBA';
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

  const mainContent = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const main = document.querySelector('main') || document.querySelector('#main-content') || document.body;
        const repos = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"], tr, [data-testid*="repo"], li')).map(el => el.textContent.trim()).filter(t => t.toLowerCase().includes('autowider'));
        return {
          mainText: main.innerText.substring(0, 1500),
          autowiderFound: repos
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Cloudflare Main Area:', JSON.stringify(mainContent.result.value, null, 2));
  process.exit(0);
};

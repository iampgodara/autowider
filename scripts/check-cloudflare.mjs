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

  // Navigate directly to Pages Create with Git connect
  // https://dash.cloudflare.com/85139c623b08014db7dbd8b3b957f9b4/pages/new
  await sendSession('Page.navigate', { url: 'https://dash.cloudflare.com/85139c623b08014db7dbd8b3b957f9b4/pages/new/provider/github' });
  await new Promise(r => setTimeout(r, 4000));

  const pageInfo = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          title: document.title,
          url: window.location.href,
          text: document.body.innerText.substring(0, 500),
          buttons: Array.from(document.querySelectorAll('button, a')).map(b => b.textContent.trim()).filter(Boolean).slice(0, 20)
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Cloudflare Pages State:', JSON.stringify(pageInfo.result.value, null, 2));
  process.exit(0);
};

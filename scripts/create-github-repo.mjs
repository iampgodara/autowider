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
  console.log('Connected to Chrome.');
  
  // 1. Create a new target tab for https://github.com/new
  const { targetId } = await send('Target.createTarget', { url: 'https://github.com/new' });
  console.log('Created tab with targetId:', targetId);

  // 2. Attach to target
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  console.log('Attached sessionId:', sessionId);

  // Helper to send to session
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

  // Enable Page & Runtime
  await sendSession('Page.enable');
  await sendSession('Runtime.enable');

  console.log('Waiting 3 seconds for GitHub /new to load...');
  await new Promise(r => setTimeout(r, 3000));

  // Run DOM script to inspect page and fill form
  const evalResult = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          testId: i.getAttribute('data-testid'),
          ariaLabel: i.getAttribute('aria-label')
        }));
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
        return { title: document.title, url: window.location.href, inputs, buttons };
      })()
    `,
    returnByValue: true
  });

  console.log('Page State:', JSON.stringify(evalResult.result.value, null, 2));
  process.exit(0);
};

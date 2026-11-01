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
  // Attach to existing GitHub stars tab
  const { sessionId } = await send('Target.attachToTarget', { targetId: '37F17E56EAEA39DC9E0E8CE852628C9F', flatten: true });

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

  const evalResult = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const userMeta = document.querySelector('meta[name="user-login"]');
        const signInBtn = document.querySelector('a[href*="/login"]');
        return {
          title: document.title,
          loggedInUser: userMeta ? userMeta.content : null,
          hasSignInButton: !!signInBtn
        };
      })()
    `,
    returnByValue: true
  });

  console.log('GitHub Login Check:', JSON.stringify(evalResult.result.value, null, 2));
  process.exit(0);
};

import fs from 'fs';

const activePortContent = fs.readFileSync(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/DevToolsActivePort', 'utf-8').trim().split('\n');
const port = activePortContent[0].trim();
const browserPath = activePortContent[1].trim();
const wsUrl = `ws://127.0.0.1:${port}${browserPath}`;

const pubKey = fs.readFileSync(process.env.USERPROFILE + '/.ssh/id_ed25519.pub', 'utf-8').trim();

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

  console.log('Submitting SSH Key to GitHub...');

  const result = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const titleInput = document.getElementById('ssh_key_title');
        const keyInput = document.getElementById('ssh_key_key');
        if (!titleInput || !keyInput) return { error: 'Inputs not found' };

        titleInput.value = 'Autowider PC';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));

        keyInput.value = ${JSON.stringify(pubKey)};
        keyInput.dispatchEvent(new Event('input', { bubbles: true }));
        keyInput.dispatchEvent(new Event('change', { bubbles: true }));

        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toLowerCase().includes('add ssh key'));
        if (!submitBtn) return { error: 'Submit button not found' };

        submitBtn.click();
        return { success: true };
      })()
    `,
    returnByValue: true
  });

  console.log('Add SSH Key Result:', result.result.value);

  // Wait 3 seconds for form submission
  await new Promise(r => setTimeout(r, 3000));

  const afterUrl = await sendSession('Runtime.evaluate', {
    expression: `window.location.href`,
    returnByValue: true
  });

  console.log('URL after submission:', afterUrl.result.value);
  process.exit(0);
};

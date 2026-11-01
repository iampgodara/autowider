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

  console.log('Filling repository name: autowider ...');

  const fillResult = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.getElementById('repository-name-input');
        if (!input) return { error: 'input not found' };
        
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'autowider');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const desc = document.getElementById('_r_c_') || document.querySelector('input[name="Description"]');
        if (desc) {
          setter.call(desc, "Autowider.com – India's modern automotive portal built with Astro & Cloudflare");
          desc.dispatchEvent(new Event('input', { bubbles: true }));
          desc.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return { success: true, value: input.value };
      })()
    `,
    returnByValue: true
  });

  console.log('Fill result:', fillResult.result.value);

  // Wait 2.5 seconds for GitHub to validate availability of 'autowider'
  console.log('Waiting 3 seconds for GitHub availability check...');
  await new Promise(r => setTimeout(r, 3000));

  // Check if button is enabled and click
  const clickResult = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent.trim().toLowerCase().includes('create repository'));
        if (!createBtn) return { error: 'create button not found' };
        
        const isDisabled = createBtn.disabled || createBtn.getAttribute('aria-disabled') === 'true';
        if (isDisabled) {
          return { error: 'button is disabled', text: createBtn.textContent.trim() };
        }

        createBtn.click();
        return { clicked: true, text: createBtn.textContent.trim() };
      })()
    `,
    returnByValue: true
  });

  console.log('Click result:', clickResult.result.value);

  // Wait 4 seconds for navigation
  await new Promise(r => setTimeout(r, 4000));

  const finalUrl = await sendSession('Runtime.evaluate', {
    expression: `window.location.href`,
    returnByValue: true
  });

  console.log('Current URL after create:', finalUrl.result.value);
  process.exit(0);
};

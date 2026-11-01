import fs from 'fs';

const activePortContent = fs.readFileSync(process.env.LOCALAPPDATA + '/Google/Chrome/User Data/DevToolsActivePort', 'utf-8').trim().split('\n');
const port = activePortContent[0].trim();
const browserPath = activePortContent[1].trim();

const wsUrl = `ws://127.0.0.1:${port}${browserPath}`;
console.log('Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('Connected to Chrome!');
  // Query open targets
  ws.send(JSON.stringify({
    id: 1,
    method: 'Target.getTargets'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id === 1) {
    console.log('Found Targets:');
    const pages = data.result.targetInfos.filter(t => t.type === 'page');
    pages.forEach(p => console.log(`- [${p.targetId}] ${p.title} (${p.url})`));
    process.exit(0);
  }
};

ws.onerror = (err) => {
  console.error('WS Error:', err);
  process.exit(1);
};

import { api, getApiBase, setApiBase } from './api.js';

const $ = (id) => document.getElementById(id);
const msg = $('msg');
const apiStatus = $('api-status');
$('api_base').value = getApiBase();

async function showConnected(base) {
  apiStatus.textContent = '✓ Connected to ' + base;
  apiStatus.className = 'msg ok';
  $('api_base').value = base;
}

async function testApi() {
  const base = getApiBase();
  apiStatus.textContent = base ? 'Connecting to ' + base + '…' : 'Looking for your public qaZAR server…';
  apiStatus.className = 'msg';
  try {
    await api.health();
    const resolved = getApiBase();
    if (resolved) return showConnected(resolved);
    throw new Error('No public qaZAR server found. Run npm run server, then retry.');
  } catch {
    apiStatus.textContent = 'Auto-detecting live qaZAR server…';
    const discovered = await api.autoDiscover();
    if (discovered) return showConnected(discovered);
    apiStatus.textContent = '✗ Cannot reach a qaZAR server. Run npm run server (it publishes a public HTTPS address), then retry.';
    apiStatus.className = 'msg bad';
  }
}
testApi();

$('api-save').addEventListener('click', () => {
  setApiBase($('api_base').value || getApiBase());
  testApi();
});

$('run-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('submit');
  const domain = $('domain').value.trim();
  if (!domain || !$('domain').checkValidity()) {
    msg.textContent = 'Enter a valid domain URL (https://…)';
    msg.className = 'msg bad';
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Submitting…';
  msg.className = 'msg';
  try {
    const { runId } = await api.createRun({
      domain,
      sitemap_url: $('sitemap_url').value.trim(),
      pages: $('pages').value,
      max_pages: Number($('max_pages').value) || 10,
      renderJs: Boolean($('render_js')?.checked),
    });
    const apiBase = getApiBase();
    const apiQ = apiBase ? `&api=${encodeURIComponent(apiBase)}` : '';
    location.href = `./results.html?id=${encodeURIComponent(runId)}${apiQ}`;
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'msg bad';
    btn.disabled = false;
  }
});
